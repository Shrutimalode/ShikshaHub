// Test script to verify nested reply structure
const mongoose = require('mongoose');
const Discussion = require('./models/Discussion');

// Connect to MongoDB (update with your connection string)
mongoose.connect('mongodb://localhost:27017/shikshahub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testNestedReplies = async () => {
  try {
    // Create a blog post (you'll need to replace with an actual blog ID)
    const blogId = 'YOUR_BLOG_ID_HERE';
    
    // Create top-level comment
    const topLevelComment = new Discussion({
      blog: blogId,
      author: 'USER_ID_HERE',
      authorRole: 'student',
      content: 'This is a top-level comment'
    });
    
    await topLevelComment.save();
    console.log('Created top-level comment:', topLevelComment._id);
    
    // Create first-level reply
    const firstLevelReply = new Discussion({
      blog: blogId,
      author: 'USER_ID_HERE',
      authorRole: 'teacher',
      content: 'This is a reply to the top-level comment',
      parentComment: topLevelComment._id
    });
    
    await firstLevelReply.save();
    console.log('Created first-level reply:', firstLevelReply._id);
    
    // Add reply to parent comment
    topLevelComment.replies.push(firstLevelReply._id);
    await topLevelComment.save();
    
    // Create second-level reply
    const secondLevelReply = new Discussion({
      blog: blogId,
      author: 'USER_ID_HERE',
      authorRole: 'student',
      content: 'This is a reply to the first-level reply',
      parentComment: firstLevelReply._id
    });
    
    await secondLevelReply.save();
    console.log('Created second-level reply:', secondLevelReply._id);
    
    // Add reply to parent comment
    firstLevelReply.replies.push(secondLevelReply._id);
    await firstLevelReply.save();
    
    // Create third-level reply
    const thirdLevelReply = new Discussion({
      blog: blogId,
      author: 'USER_ID_HERE',
      authorRole: 'admin',
      content: 'This is a reply to the second-level reply',
      parentComment: secondLevelReply._id
    });
    
    await thirdLevelReply.save();
    console.log('Created third-level reply:', thirdLevelReply._id);
    
    // Add reply to parent comment
    secondLevelReply.replies.push(thirdLevelReply._id);
    await secondLevelReply.save();
    
    console.log('Nested reply structure created successfully!');
    console.log('Structure:');
    console.log('- Top-level comment:', topLevelComment._id);
    console.log('  - First-level reply:', firstLevelReply._id);
    console.log('    - Second-level reply:', secondLevelReply._id);
    console.log('      - Third-level reply:', thirdLevelReply._id);
    
    // Test the reply tree building function
    console.log('\nTesting reply tree structure...');
    
  } catch (error) {
    console.error('Error creating nested replies:', error);
  } finally {
    mongoose.connection.close();
  }
};

testNestedReplies();