const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  communities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  emailPreferences: {
    type: Object,
    default: {
      materialUpload: true,
      blogUpload: true,
      blogReview: true
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('Comparing passwords:', { 
    candidatePasswordLength: candidatePassword ? candidatePassword.length : 'undefined',
    passwordLength: this.password ? this.password.length : 'undefined'
  });
  const result = await bcrypt.compare(candidatePassword, this.password);
  console.log('Password comparison result:', result);
  return result;
};

module.exports = mongoose.model('User', userSchema); 