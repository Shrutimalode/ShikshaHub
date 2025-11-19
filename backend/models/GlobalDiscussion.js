const mongoose = require('mongoose');

// Global Discussion Schema - Questions and replies with moderation
const globalDiscussionSchema = new mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalThread',
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
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  isQuestion: {
    type: Boolean,
    default: true // true for questions, false for replies
  },
  parentDiscussion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalDiscussion',
    default: null // null for questions, ID for replies
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GlobalDiscussion'
  }],
  // Moderation fields
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
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
  // Answer marking and termination fields
  isMarkedAsAnswer: {
    type: Boolean,
    default: false
  },
  markedAsAnswerBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isTerminated: {
    type: Boolean,
    default: false
  },
  terminatedAt: {
    type: Date
  },
  terminationReason: {
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
globalDiscussionSchema.index({ thread: 1, moderationStatus: 1, createdAt: -1 });
globalDiscussionSchema.index({ parentDiscussion: 1 });
globalDiscussionSchema.index({ author: 1 });

// Virtual for reply count
globalDiscussionSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for like count
globalDiscussionSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Pre-save middleware
globalDiscussionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  
  // Admin posts are auto-approved
  if (this.isNew && this.authorRole === 'admin') {
    this.moderationStatus = 'approved';
  }
  
  next();
});

// Method to toggle like
globalDiscussionSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to terminate chat
globalDiscussionSchema.methods.terminateChat = function(reason) {
  this.isTerminated = true;
  this.terminatedAt = Date.now();
  this.terminationReason = reason || 'Question marked as answered';
  return this.save();
};

// Ensure virtual fields are serialized
globalDiscussionSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('GlobalDiscussion', globalDiscussionSchema);

