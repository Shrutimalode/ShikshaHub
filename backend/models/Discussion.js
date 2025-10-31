const mongoose = require('mongoose');

// Define discussion/comment schema
const discussionSchema = new mongoose.Schema({
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorRole: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  isFacultyReply: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isVerifiedAnswer: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000 // Limit comment length
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
    default: null // null for top-level comments, ObjectId for replies
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastEditedByRole: {
    type: String,
    enum: ['student', 'teacher', 'admin']
  },
  editReason: {
    type: String,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedReason: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
discussionSchema.index({ blog: 1, createdAt: -1 });
discussionSchema.index({ parentComment: 1 });
discussionSchema.index({ author: 1 });

// Virtual for reply count
discussionSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for like count
discussionSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Pre-save middleware to update updatedAt and set faculty flags
discussionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  
  // Auto-set faculty reply flags based on author role
  if (this.isNew) {
    this.isFacultyReply = this.authorRole === 'teacher' || this.authorRole === 'admin';
    this.isPinned = this.isFacultyReply; // Auto-pin faculty replies
    this.isVerifiedAnswer = this.authorRole === 'admin'; // Admin replies are verified answers
  }
  
  next();
});

// Method to soft delete a comment
discussionSchema.methods.softDelete = function(deletedBy, reason) {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  this.deletedReason = reason;
  return this.save();
};

// Method to restore a soft-deleted comment
discussionSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletedReason = null;
  return this.save();
};

// Method to toggle like
discussionSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Ensure virtual fields are serialized
discussionSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Discussion', discussionSchema);
