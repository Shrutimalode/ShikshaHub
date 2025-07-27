const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotEmail, forgotPassword, resetPassword, updateEmailPreferences } = require('../controllers/authController');
const { sendWelcomeEmail } = require('../utils/emailService');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Login user and get token
// @access  Public
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, getMe);

// @route   POST api/auth/forgot-email
// @desc    Retrieve email by name
// @access  Public
router.post('/forgot-email', forgotEmail);

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST api/auth/reset-password
// @desc    Reset user password
// @access  Public
router.post('/reset-password', resetPassword);

// @route   PUT api/auth/email-preferences
// @desc    Update user email notification preferences
// @access  Private
router.put('/email-preferences', auth, updateEmailPreferences);

// Test email endpoint (for development only)
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    const result = await sendWelcomeEmail(email, name);
    
    if (result.success) {
      res.json({ message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ message: 'Failed to send test email', error: result.error });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 