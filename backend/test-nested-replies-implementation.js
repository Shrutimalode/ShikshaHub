// Test script to verify nested reply implementation
const mongoose = require('mongoose');
const CommunityDiscussion = require('./models/CommunityDiscussion');

// Connect to MongoDB (update with your connection string)
mongoose.connect('mongodb://localhost:27017/shikshahub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testNestedReplies = async () => {
  try {
    console.log('Testing nested reply implementation...');
    
    // Create a community ID (you'll need to replace with an actual community ID)
    const communityId = 'YOUR_COMMUNITY_ID_HERE';
    const userId = 'YOUR_USER_ID_HERE';
    const userRole = 'student';
    
    // Create top-level discussion
    const topLevelDiscussion = new CommunityDiscussion({
      community: communityId,
      author: userId,
      authorRole: userRole,
      title: 'Test Discussion for Nested Replies',
      content: 'This is a top-level discussion to test nested replies'
    });
    
    await topLevelDiscussion.save();
    console.log('Created top-level discussion:', topLevelDiscussion._id);
    
    // Create first-level reply
    const firstLevelReply = new CommunityDiscussion({
      community: communityId,
      author: userId,
      authorRole: userRole,
      content: 'This is a first-level reply',
      parentDiscussion: topLevelDiscussion._id
    });
    
    await firstLevelReply.save();
    console.log('Created first-level reply:', firstLevelReply._id);
    
    // Add reply to parent discussion
    topLevelDiscussion.replies.push(firstLevelReply._id);
    await topLevelDiscussion.save();
    
    // Create second-level reply
    const secondLevelReply = new CommunityDiscussion({
      community: communityId,
      author: userId,
      authorRole: userRole,
      content: 'This is a second-level reply',
      parentDiscussion: firstLevelReply._id
    });
    
    await secondLevelReply.save();
    console.log('Created second-level reply:', secondLevelReply._id);
    
    // Add reply to parent reply
    firstLevelReply.replies.push(secondLevelReply._id);
    await firstLevelReply.save();
    
    // Create third-level reply
    const thirdLevelReply = new CommunityDiscussion({
      community: communityId,
      author: userId,
      authorRole: userRole,
      content: 'This is a third-level reply',
      parentDiscussion: secondLevelReply._id
    });
    
    await thirdLevelReply.save();
    console.log('Created third-level reply:', thirdLevelReply._id);
    
    // Add reply to parent reply
    secondLevelReply.replies.push(thirdLevelReply._id);
    await secondLevelReply.save();
    
    console.log('Nested reply structure created successfully!');
    console.log('Structure:');
    console.log('- Top-level discussion:', topLevelDiscussion._id);
    console.log('  - First-level reply:', firstLevelReply._id);
    console.log('    - Second-level reply:', secondLevelReply._id);
    console.log('      - Third-level reply:', thirdLevelReply._id);
    
    // Test retrieving the discussion with nested replies
    console.log('\nTesting retrieval with nested replies...');
    
    // Simple approach: populate replies up to 5 levels deep
    const discussion = await CommunityDiscussion.findById(topLevelDiscussion._id)
      .populate('author', 'name email role')
      .populate({
        path: 'replies',
        match: { isDeleted: false },
        options: { 
          sort: { 
            isMarkedAsAnswer: -1,
            authorRole: 1,
            createdAt: 1
          } 
        },
        populate: [
          { path: 'author', select: 'name email role' },
          {
            path: 'replies',
            match: { isDeleted: false },
            options: { 
              sort: { 
                isMarkedAsAnswer: -1,
                authorRole: 1,
                createdAt: 1
              } 
            },
            populate: [
              { path: 'author', select: 'name email role' },
              {
                path: 'replies',
                match: { isDeleted: false },
                options: { 
                  sort: { 
                    isMarkedAsAnswer: -1,
                    authorRole: 1,
                    createdAt: 1
                  } 
                },
                populate: [
                  { path: 'author', select: 'name email role' },
                  {
                    path: 'replies',
                    match: { isDeleted: false },
                    options: { 
                      sort: { 
                        isMarkedAsAnswer: -1,
                        authorRole: 1,
                        createdAt: 1
                      } 
                    },
                    populate: [
                      { path: 'author', select: 'name email role' },
                      {
                        path: 'replies',
                        match: { isDeleted: false },
                        options: { 
                          sort: { 
                            isMarkedAsAnswer: -1,
                            authorRole: 1,
                            createdAt: 1
                          } 
                        },
                        populate: {
                          path: 'author',
                          select: 'name email role'
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });
    
    console.log('Retrieved discussion with nested replies:');
    console.log('- Title:', discussion.title);
    console.log('- Replies count:', discussion.replies.length);
    
    if (discussion.replies.length > 0) {
      const firstReply = discussion.replies[0];
      console.log('  - First reply content:', firstReply.content);
      console.log('  - First reply replies count:', firstReply.replies ? firstReply.replies.length : 0);
      
      if (firstReply.replies && firstReply.replies.length > 0) {
        const secondReply = firstReply.replies[0];
        console.log('    - Second reply content:', secondReply.content);
        console.log('    - Second reply replies count:', secondReply.replies ? secondReply.replies.length : 0);
        
        if (secondReply.replies && secondReply.replies.length > 0) {
          const thirdReply = secondReply.replies[0];
          console.log('      - Third reply content:', thirdReply.content);
          console.log('      - Third reply replies count:', thirdReply.replies ? thirdReply.replies.length : 0);
        }
      }
    }
    
    console.log('\nNested reply implementation test completed successfully!');
    
  } catch (error) {
    console.error('Error testing nested replies:', error);
  } finally {
    mongoose.connection.close();
  }
};

testNestedReplies();
