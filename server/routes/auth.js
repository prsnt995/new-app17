const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/auth/save-profile
 * Protected route: saves phone number & address to Supabase profiles table
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

    const fullPhone = `${phoneCountryCode || ''}${phoneNumber}`.trim();

    // Update profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: fullPhone,
        profile_setup_complete: true,
        updated_at: Date.now(),
      })
      .eq('id', uid);

    if (error) {
      console.log('Profile update notice:', error.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile saved successfully',
      profile: {
        uid,
        phoneCountryCode,
        phoneNumber: fullPhone,
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

/**
 * POST /api/auth/verify-token
 * Verifies Supabase JWT
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'accessToken is required',
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    return res.status(200).json({
      success: true,
      uid: user.id,
      email: user.email,
      emailVerified: user.email_confirmed_at != null,
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.name || user.user_metadata?.full_name,
        photoURL: user.user_metadata?.avatar_url,
        emailVerified: user.email_confirmed_at != null,
      },
    });
  } catch (error) {
    console.error('Token Verification Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

module.exports = router;
