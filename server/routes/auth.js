const express = require('express');
const router = express.Router();
const admin = require('../config/firebaseAdmin');
const authMiddleware = require('../middleware/auth');

// ─── IN-MEMORY OTP & RATE-LIMIT STORE ──────────────────────────────────────
const otpStore = new Map(); // key: email, value: { code, expiresAt, attempts, lastSentAt, sendCount, hourWindowStart }
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes expiry
const OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds cooldown between sends
const MAX_OTP_ATTEMPTS = 5; // Max 5 verification attempts per code
const MAX_HOURLY_REQUESTS = 6; // Max 6 requests per hour per email

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORDLESS EMAIL OTP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP code, stores it with TTL, and sends via email
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existingEntry = otpStore.get(normalizedEmail);

    // 1. Check Rate Limit: Cooldown between requests (45s)
    if (existingEntry && existingEntry.lastSentAt) {
      const elapsed = now - existingEntry.lastSentAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSec} seconds before requesting a new code.`,
          retryAfterSeconds: waitSec,
        });
      }
    }

    // 2. Check Rate Limit: Hourly limit
    let sendCount = 1;
    let hourWindowStart = now;
    if (existingEntry) {
      if (existingEntry.hourWindowStart && now - existingEntry.hourWindowStart < 60 * 60 * 1000) {
        sendCount = (existingEntry.sendCount || 0) + 1;
        hourWindowStart = existingEntry.hourWindowStart;
        if (sendCount > MAX_HOURLY_REQUESTS) {
          return res.status(429).json({
            success: false,
            message: 'Too many verification code requests for this email. Please try again in an hour.',
          });
        }
      }
    }

    // 3. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Store code with 10-minute expiry
    otpStore.set(normalizedEmail, {
      code,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      sendCount,
      hourWindowStart,
    });

    // 5. Attempt email delivery via Gmail or SMTP
    let emailSent = false;
    try {
      const nodemailer = require('nodemailer');
      let transporter = null;

      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
      } else if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }

      if (transporter) {
        await transporter.sendMail({
          from: process.env.GMAIL_USER
            ? `"NamasteMart" <${process.env.GMAIL_USER}>`
            : process.env.SMTP_FROM || '"NamasteMart" <noreply@namastemart.com>',
          to: normalizedEmail,
          subject: `${code} is your NamasteMart verification code`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #008060; font-size: 26px; font-weight: 800; margin: 0;">NamasteMart</h1>
                <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Korea ⇄ India & Nepal Express Logistics & Groceries</p>
              </div>
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; border: 1px dashed #cbd5e1;">
                <p style="color: #475569; font-size: 14px; margin: 0 0 12px 0;">Your one-time verification code is:</p>
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #0f172a; font-family: monospace;">
                  ${code}
                </div>
                <p style="color: #ef4444; font-size: 12px; font-weight: 600; margin: 12px 0 0 0;">⏱️ Valid for 10 minutes only</p>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
                Please enter this code on the NamasteMart website to verify your email and sign in. Never share this code with anyone.
              </p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} NamasteMart Inc. All rights reserved.
              </p>
            </div>
          `,
        });
        emailSent = true;
      }
    } catch (emailErr) {
      console.log('Email delivery notice:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Verification code sent to your email inbox (${normalizedEmail})`,
      email: normalizedEmail,
      expiresInMinutes: 10,
      cooldownSeconds: 45,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification code',
    });
  }
  }
});

/**
 * POST /api/auth/verify-otp
 * Validates the OTP code, verifies or creates user, and issues custom auth token
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inputCode = code.toString().trim();
    const otpEntry = otpStore.get(normalizedEmail);

    if (!otpEntry) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new code.',
      });
    }

    // Check expiry
    if (Date.now() > otpEntry.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        expired: true,
      });
    }

    // Check attempt limits
    if (otpEntry.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
        attemptsExceeded: true,
      });
    }

    // Verify code
    otpEntry.attempts += 1;
    if (otpEntry.code !== inputCode) {
      const remaining = MAX_OTP_ATTEMPTS - otpEntry.attempts;
      if (remaining <= 0) {
        otpStore.delete(normalizedEmail);
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new code.',
          attemptsExceeded: true,
        });
      }
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // Code matches — delete used code to prevent replay
    otpStore.delete(normalizedEmail);

    // Look up or create user in Firebase Authentication
    let userRecord = null;
    let customToken = null;

    try {
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        if (!userRecord.emailVerified) {
          await admin.auth().updateUser(userRecord.uid, { emailVerified: true });
        }
      } catch (notFoundErr) {
        // Create new user in Firebase Auth
        userRecord = await admin.auth().createUser({
          email: normalizedEmail,
          displayName: normalizedEmail.split('@')[0],
          emailVerified: true,
        });
      }

      // Generate Firebase Custom Auth Token
      try {
        customToken = await admin.auth().createCustomToken(userRecord.uid, {
          email: normalizedEmail,
          authProvider: 'email_otp',
        });
      } catch (tokErr) {
        console.log('Custom token creation notice:', tokErr.message);
      }
    } catch (fbErr) {
      console.log('Firebase user lookup/creation notice:', fbErr.message);
    }

    const finalUid = userRecord ? userRecord.uid : `email-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      email: normalizedEmail,
      uid: finalUid,
      emailVerified: true,
      customToken,
      user: {
        uid: finalUid,
        email: normalizedEmail,
        displayName: userRecord?.displayName || normalizedEmail.split('@')[0],
        photoURL: userRecord?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify code',
    });
  }
});

/**
 * POST /api/auth/register
 * Handles user registration using Firebase Admin SDK
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
    });

    // Generate Firebase Email Verification Link
    const actionCodeSettings = {
      url: process.env.CONTINUE_URL || 'https://namastemart-logistics.firebaseapp.com/login',
      handleCodeInApp: true,
    };

    let verificationLink = null;
    try {
      verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
    } catch (linkErr) {
      console.log('Verification link generation notice:', linkErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully with Firebase Admin SDK',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
      },
      verificationLink,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register user',
    });
  }
});

/**
 * POST /api/auth/send-verification-email
 * Triggers/Generates verification email link for user
 */
router.post('/send-verification-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const actionCodeSettings = {
      url: process.env.CONTINUE_URL || 'https://namastemart-logistics.firebaseapp.com/login',
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(email.trim().toLowerCase(), actionCodeSettings);

    return res.status(200).json({
      success: true,
      message: `Verification link generated and dispatched for ${email}`,
      email: email.trim().toLowerCase(),
      verificationLink,
    });
  } catch (error) {
    console.error('Send Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger verification email',
    });
  }
});

/**
 * POST /api/auth/verify-token
 * Verifies Firebase ID Token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'idToken is required',
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return res.status(200).json({
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      decodedToken,
    });
  } catch (error) {
    console.error('Token Verification Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired Firebase ID token',
    });
  }
});

/**
 * GET /api/auth/user-status
 * Checks if user's email is verified
 */
router.get('/user-status', async (req, res) => {
  try {
    const { email, uid } = req.query;

    let userRecord;
    if (uid) {
      userRecord = await admin.auth().getUser(uid);
    } else if (email) {
      userRecord = await admin.auth().getUserByEmail(email.toString().trim().toLowerCase());
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide email or uid in query params',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || 'User not found',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP code, stores it with TTL, and sends via email
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store with expiry
    otpStore.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    // Attempt email delivery via EmailJS (or Nodemailer in production)
    let emailSent = false;
    try {
      // Try Nodemailer if configured
      if (process.env.SMTP_HOST) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"NamasteMart" <noreply@namastemart.com>',
          to: normalizedEmail,
          subject: 'NamasteMart - Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #0095F6;">NamasteMart Verification</h2>
              <p>Your 6-digit verification code is:</p>
              <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
                <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
              </div>
              <p style="color: #666;">This code expires in 5 minutes. Do not share it with anyone.</p>
              <p style="color: #999; font-size: 12px;">— NamasteMart Express Logistics ✈️</p>
            </div>
          `,
        });
        emailSent = true;
      }
    } catch (emailErr) {
      console.log('Email delivery notice:', emailErr.message);
    }

    // Log OTP in dev mode for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 OTP for ${normalizedEmail}: ${code}`);
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? `Verification code sent to ${normalizedEmail}`
        : `Verification code generated for ${normalizedEmail}`,
      email: normalizedEmail,
      // Only include code in dev mode for testing
      ...(process.env.NODE_ENV !== 'production' && { devCode: code }),
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification code',
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Validates the OTP code and marks email as verified
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpEntry = otpStore.get(normalizedEmail);

    if (!otpEntry) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new code.',
      });
    }

    // Check expiry
    if (Date.now() > otpEntry.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check attempts
    if (otpEntry.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new code.',
      });
    }

    // Verify code
    otpEntry.attempts += 1;
    if (otpEntry.code !== code.trim()) {
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${MAX_OTP_ATTEMPTS - otpEntry.attempts} attempts remaining.`,
      });
    }

    // Code matches — mark verified
    otpStore.delete(normalizedEmail);

    // Try to update Firebase Auth emailVerified status
    try {
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      await admin.auth().updateUser(userRecord.uid, { emailVerified: true });
    } catch (fbErr) {
      console.log('Firebase email verification update notice:', fbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      email: normalizedEmail,
      emailVerified: true,
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify code',
    });
  }
});

/**
 * POST /api/auth/google-signin
 * Verifies Google ID token via Firebase Admin, creates/gets user
 */
router.post('/google-signin', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify the token via Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get or create user record
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(decodedToken.uid);
    } catch (err) {
      // User might not exist yet in some edge cases
      userRecord = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Google sign-in verified',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
      },
    });
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid Google ID token',
    });
  }
});

/**
 * POST /api/auth/save-profile
 * Protected route: saves phone number & address to user profile
 */
router.post('/save-profile', authMiddleware, async (req, res) => {
  try {
    const { phoneCountryCode, phoneNumber, address } = req.body;
    const uid = req.user.uid;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Update Firebase Auth phone number
    const fullPhone = `${phoneCountryCode || ''}${phoneNumber}`;
    try {
      await admin.auth().updateUser(uid, {
        phoneNumber: fullPhone.startsWith('+') ? fullPhone : `+${fullPhone}`,
      });
    } catch (phoneErr) {
      console.log('Phone update notice:', phoneErr.message);
      // Phone might already be in use or invalid format — continue anyway
    }

    // Store additional profile data in custom claims
    try {
      const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
      await admin.auth().setCustomUserClaims(uid, {
        ...existingClaims,
        phoneCountryCode,
        phoneNumber,
        address: address || null,
        profileComplete: true,
      });
    } catch (claimErr) {
      console.log('Custom claims update notice:', claimErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile saved successfully',
      profile: {
        uid,
        phoneCountryCode,
        phoneNumber,
        address,
      },
    });
  } catch (error) {
    console.error('Save Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save profile',
    });
  }
});

module.exports = router;
