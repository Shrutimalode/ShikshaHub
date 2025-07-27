const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail, sendResetPasswordEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role: role || 'student'
    });

    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name)
      .then(result => {
        if (result.success) {
          console.log('Welcome email sent successfully to:', email);
        } else {
          console.error('Failed to send welcome email to:', email, result.error);
        }
      })
      .catch(error => {
        console.error('Error in welcome email process:', error);
      });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'shikshahub_secret',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt with:', { email, passwordProvided: !!password });

    // Check if user exists
    const user = await User.findOne({ email });
    console.log('User found:', user ? { 
      id: user._id,
      email: user.email,
      role: user.role,
      passwordStored: !!user.password
    } : 'No user found');
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('Comparing password');
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'shikshahub_secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('communities', 'name');
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Forgot Email
exports.forgotEmail = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that name' });
    }
    // In a real app, you would send the email securely, not return it directly
    return res.json({ email: user.email });
  } catch (error) {
    console.error('Forgot email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ message: 'If your email is registered, a reset link has been sent.' });
    }
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    await sendResetPasswordEmail(user.email, resetUrl);
    return res.json({ message: 'If your email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

// Update email notification preferences
exports.updateEmailPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailPreferences } = req.body;
    if (!emailPreferences) {
      return res.status(400).json({ message: 'No preferences provided' });
    }
    const user = await User.findByIdAndUpdate(userId, { emailPreferences }, { new: true });
    res.json({ message: 'Preferences updated', emailPreferences: user.emailPreferences });
  } catch (error) {
    console.error('Update email preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 