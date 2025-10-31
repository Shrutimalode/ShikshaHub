const mongoose = require('mongoose');

// Define community discussion schema (independent of blogs)
const communityDiscussionSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
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
  // Material references - users can reference uploaded materials
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
    ref: 'CommunityDiscussion',
    default: null // null for top-level posts, ObjectId for replies
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityDiscussion'
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
communityDiscussionSchema.index({ community: 1, createdAt: -1 });
communityDiscussionSchema.index({ community: 1, isPinned: -1, createdAt: -1 });
communityDiscussionSchema.index({ parentDiscussion: 1 });
communityDiscussionSchema.index({ author: 1 });
communityDiscussionSchema.index({ tags: 1 });

// Virtual for reply count
communityDiscussionSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for like count
communityDiscussionSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Pre-save middleware to update updatedAt and set faculty flags
communityDiscussionSchema.pre('save', function(next) {
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
communityDiscussionSchema.methods.softDelete = function(deletedBy, reason) {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  this.deletedReason = reason;
  return this.save();
};

// Method to restore a soft-deleted discussion
communityDiscussionSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletedReason = null;
  return this.save();
};

// Method to toggle like
communityDiscussionSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// Method to increment view count
communityDiscussionSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

// Ensure virtual fields are serialized
communityDiscussionSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('CommunityDiscussion', communityDiscussionSchema);

