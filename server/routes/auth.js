const express = require('express');
const router = express.Router();
const admin = require('../config/firebaseAdmin');
const authMiddleware = require('../middleware/auth');

// ─── IN-MEMORY OTP STORE (TTL-based) ────────────────────────────────────────
// In production, use Redis or a database
const otpStore = new Map(); // key: email, value: { code, expiresAt, attempts }
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

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
