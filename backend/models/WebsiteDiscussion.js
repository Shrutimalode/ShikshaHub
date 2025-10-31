const mongoose = require('mongoose');

// Define website discussion schema (independent of communities and blogs)
const websiteDiscussionSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: false, // Not required for replies, only for top-level posts
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  isQuestion: {
    type: Boolean,
    default: true // true for questions, false for general posts
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Material references - users can reference uploaded materials from any community
  referencedMaterials: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  parentDiscussion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebsiteDiscussion',
    default: null // null for top-level posts, ObjectId for replies
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebsiteDiscussion'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isFacultyPost: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isMarkedAsAnswer: {
    type: Boolean,
    default: false // For marking replies as answers to questions
  },
  markedAsAnswerBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
  viewCount: {
    type: Number,
    default: 0
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
websiteDiscussionSchema.index({ createdAt: -1 });
websiteDiscussionSchema.index({ isPinned: -1, createdAt: -1 });
websiteDiscussionSchema.index({ parentDiscussion: 1 });
websiteDiscussionSchema.index({ author: 1 });
websiteDiscussionSchema.index({ tags: 1 });

// Virtual for reply count
websiteDiscussionSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for like count
websiteDiscussionSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Pre-save middleware to update updatedAt and set faculty flags
websiteDiscussionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  
  // Auto-set faculty post flag based on author role
  if (this.isNew) {
    this.isFacultyPost = this.authorRole === 'teacher' || this.authorRole === 'admin';
  }
  
  next();
});

// Method to soft delete a discussion
websiteDiscussionSchema.methods.softDelete = function(deletedBy, reason) {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  this.deletedReason = reason;
  return this.save();
};

// Method to restore a soft-deleted discussion
websiteDiscussionSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletedReason = null;
  return this.save();
};

// Method to toggle like
websiteDiscussionSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to increment view count
websiteDiscussionSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// Ensure virtual fields are serialized
websiteDiscussionSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('WebsiteDiscussion', websiteDiscussionSchema);
