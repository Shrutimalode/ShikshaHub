# Discussion Forum Feature

## Overview
The Discussion Forum feature allows users to engage in meaningful conversations around blog posts. It provides a comprehensive commenting system with nested replies, likes, and moderation capabilities.

## Features

### Core Functionality
- **Comments**: Users can post comments on approved blog posts
- **Nested Replies**: Support for threaded conversations with replies to comments
- **Likes**: Users can like/unlike comments
- **Edit/Delete**: Authors can edit their own comments, admins/teachers can delete any comment
- **Real-time Updates**: Comments and replies update in real-time
- **Pagination**: Load more comments as needed

### User Roles & Permissions
- **Students**: Can post comments, reply, like, edit own comments
- **Teachers**: Can do everything students can, plus delete any comment
- **Admins**: Full moderation capabilities including comment deletion

### Moderation Features
- **Soft Delete**: Comments are soft-deleted with reason tracking
- **Content Validation**: 2000 character limit with real-time character count
- **Approval System**: Only approved blog posts can have discussions
- **Role-based Access**: Different permissions based on user role

## Technical Implementation

### Backend Components

#### Models
- **Discussion.js**: Main comment model with nested replies support
  - Fields: blog, author, content, parentComment, replies, likes, etc.
  - Virtual fields for reply and like counts
  - Soft delete functionality
  - Indexes for performance optimization

#### Controllers
- **discussionController.js**: Handles all discussion-related operations
  - `createComment`: Create new comments or replies
  - `getBlogComments`: Fetch comments with pagination
  - `updateComment`: Edit existing comments
  - `deleteComment`: Soft delete comments
  - `toggleCommentLike`: Like/unlike functionality
  - `getCommentStats`: Get discussion statistics
  - `getUserComments`: Get user's comment history

#### Routes
- **discussions.js**: API endpoints for discussion operations
  - POST `/api/discussions/blog/:blogId` - Create comment
  - GET `/api/discussions/blog/:blogId` - Get comments
  - PUT `/api/discussions/:commentId` - Update comment
  - DELETE `/api/discussions/:commentId` - Delete comment
  - POST `/api/discussions/:commentId/like` - Toggle like
  - GET `/api/discussions/blog/:blogId/stats` - Get stats

### Frontend Components

#### DiscussionForum.js
- Main container component for the discussion forum
- Handles comment loading, pagination, and state management
- Integrates with Comment and CommentForm components

#### Comment.js
- Individual comment display component
- Handles comment actions (like, reply, edit, delete)
- Manages nested replies display
- Includes moderation controls for admins/teachers

#### CommentForm.js
- Form component for creating and editing comments
- Real-time character counting
- Validation and error handling
- Keyboard shortcuts (Ctrl+Enter to submit)

#### DiscussionStats.js
- Statistics display component
- Shows total comments, replies, and engagement metrics

## Usage

### For Users
1. Navigate to an approved blog post
2. Scroll down to the Discussion Forum section
3. Write your comment in the text area
4. Click "Post Comment" or press Ctrl+Enter
5. Reply to existing comments using the "Reply" button
6. Like comments by clicking the heart icon
7. Edit your own comments using the dropdown menu

### For Moderators
1. Access comment management through the dropdown menu
2. Delete inappropriate comments with reason tracking
3. Monitor discussion activity through statistics
4. Moderate based on community guidelines

## Database Schema

```javascript
{
  blog: ObjectId,           // Reference to blog post
  author: ObjectId,         // Reference to user
  authorRole: String,       // 'student', 'teacher', 'admin'
  content: String,          // Comment text (max 2000 chars)
  parentComment: ObjectId,  // For replies (null for top-level)
  replies: [ObjectId],      // Array of reply IDs
  likes: [ObjectId],        // Array of user IDs who liked
  isEdited: Boolean,        // Track if comment was edited
  editedAt: Date,           // Edit timestamp
  isDeleted: Boolean,       // Soft delete flag
  deletedAt: Date,          // Deletion timestamp
  deletedBy: ObjectId,      // Who deleted the comment
  deletedReason: String,    // Reason for deletion
  createdAt: Date,          // Creation timestamp
  updatedAt: Date           // Last update timestamp
}
```

## API Endpoints

### Create Comment
```
POST /api/discussions/blog/:blogId
Body: { content: string, parentCommentId?: string }
```

### Get Comments
```
GET /api/discussions/blog/:blogId?page=1&limit=20
Response: { comments: [], pagination: {} }
```

### Update Comment
```
PUT /api/discussions/:commentId
Body: { content: string }
```

### Delete Comment
```
DELETE /api/discussions/:commentId
Body: { reason?: string }
```

### Toggle Like
```
POST /api/discussions/:commentId/like
Response: { comment: {}, likeCount: number }
```

### Get Stats
```
GET /api/discussions/blog/:blogId/stats
Response: { totalComments, topLevelComments, replies, discussionsEnabled }
```

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Community Membership**: Users must be members of the blog's community
- **Content Validation**: Input sanitization and length limits
- **Permission Checks**: Role-based access control
- **Soft Deletion**: Comments are soft-deleted to maintain data integrity
- **Rate Limiting**: Built-in protection against spam (can be enhanced)

## Performance Optimizations

- **Database Indexes**: Optimized queries for comments and replies
- **Pagination**: Load comments in batches to improve performance
- **Virtual Fields**: Efficient counting without separate queries
- **Populate Optimization**: Selective field population to reduce payload

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live comments
- **Rich Text Editor**: Support for formatted comments
- **File Attachments**: Allow file uploads in comments
- **Email Notifications**: Notify users of replies and mentions
- **Comment Moderation Queue**: Advanced moderation tools
- **Analytics**: Detailed engagement metrics and reporting
- **Search**: Full-text search within comments
- **Mentions**: @username functionality for notifications

## Testing

The discussion forum has been tested for:
- Comment creation and editing
- Nested reply functionality
- Like/unlike operations
- Permission-based access control
- Soft deletion with reason tracking
- Pagination and performance
- Responsive design on mobile devices

## Deployment Notes

1. Ensure MongoDB indexes are created for optimal performance
2. Configure proper CORS settings for API endpoints
3. Set up monitoring for comment activity and performance
4. Consider implementing rate limiting for comment creation
5. Regular database maintenance for soft-deleted comments cleanup
