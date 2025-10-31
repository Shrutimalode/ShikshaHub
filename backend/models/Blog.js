const mongoose = require('mongoose');

// Define blog post schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
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
  isOriginalContent: {
    type: Boolean,
    default: true
  },
  realAuthorName: {
    type: String,
    trim: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewComment: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-approve blogs created by admin
blogSchema.pre('save', async function(next) {
  if (this.isNew && this.authorRole === 'admin') {
    this.status = 'approved';
  }
  
  if (this.isModified()) {
    this.updatedAt = Date.now();
    
    // If content is modified after approval or rejection, set back to pending
    if (!this.isNew && (this.status === 'approved' || this.status === 'rejected') && 
        (this.isModified('title') || this.isModified('content'))) {
      this.status = 'pending';
      
      // Clear previous review information
      if (this.status === 'rejected') {
        this.reviewComment = null;
      }
    }
  }
  
  next();
});

// Create indexes for search functionality
blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema); 