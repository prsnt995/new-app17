const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Authentication Middleware
 * Extracts Bearer JWT from Authorization header,
 * verifies via Supabase Auth API, and attaches user to req.user
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header. Expected: Bearer <supabaseAccessToken>',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Verify the JWT using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    req.user = {
      uid: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name,
      avatar: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider,
      emailVerified: user.email_confirmed_at != null,
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
  }
};

module.exports = authMiddleware;
