const cron = require('node-cron');
const CommunityDiscussion = require('../models/CommunityDiscussion');

/**
 * Terminate old chats that have been inactive for a specified number of days
 * @param {number} daysOld - Number of days of inactivity before termination
 */
const terminateOldChats = async (daysOld = 30) => {
  try {
    console.log(`Running chat termination task for chats older than ${daysOld} days`);
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Find and terminate old chats
    const result = await CommunityDiscussion.updateMany(
      {
        parentDiscussion: null, // Only top-level discussions (chats)
        isDeleted: false,
        isTerminated: false,
        lastActivityAt: { $lt: cutoffDate }
      },
      {
        $set: {
          isTerminated: true,
          terminatedAt: new Date(),
          terminationReason: `Automatically terminated after ${daysOld} days of inactivity`
        }
      }
    );
    
    console.log(`Terminated ${result.modifiedCount} old chats`);
    return result;
  } catch (error) {
    console.error('Error terminating old chats:', error);
    throw error;
  }
};

/**
 * Schedule the chat termination task to run daily at midnight
 */
const scheduleChatTermination = () => {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    try {
      await terminateOldChats(30); // Terminate chats older than 30 days
      console.log('Scheduled chat termination completed');
    } catch (error) {
      console.error('Scheduled chat termination failed:', error);
    }
  });
  
  console.log('Chat termination scheduler started - will run daily at midnight');
};

module.exports = {
  terminateOldChats,
  scheduleChatTermination
};
