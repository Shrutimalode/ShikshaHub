# Delete Permissions & View Count Fix

## Issues Fixed

### 1. ✅ Delete Permissions (Role-Based Access Control)

**Problem**: Teachers could delete admin posts, which shouldn't be allowed.

**Solution**: Implemented proper role-based deletion permissions:

#### **Delete Permission Rules**

| User Role | Can Delete |
|-----------|------------|
| **Student** | ✅ Only their own posts |
| **Teacher** | ✅ Their own posts<br>✅ Student posts<br>❌ Admin posts<br>❌ Other teacher posts |
| **Admin** | ✅ Any post (own, teacher, student) |

#### **Implementation**
Updated [`communityDiscussionController.js`](c:\Users\Komal\Downloads\ShikshaHub-version2\backend\controllers\communityDiscussionController.js) - `deleteDiscussion` function:

```javascript
// Get the author's role of the discussion being deleted
const discussionAuthorRole = discussion.author.role;

// Permission logic:
if (userRole === 'student') {
  if (!isAuthor) {
    return res.status(403).json({ message: 'Students can only delete their own posts' });
  }
} else if (userRole === 'teacher') {
  if (!isAuthor && discussionAuthorRole === 'admin') {
    return res.status(403).json({ message: 'Teachers cannot delete admin posts' });
  }
  if (!isAuthor && discussionAuthorRole === 'teacher') {
    return res.status(403).json({ message: 'Teachers cannot delete other teacher posts' });
  }
  // Teachers CAN delete student posts
} else if (userRole === 'admin') {
  // Admins can delete anything
}
```

---

### 2. ✅ View Count Updates

**Problem**: View counts were not updating when discussions were displayed.

**Solution**: Auto-increment view count when discussions are loaded in the list view.

#### **How It Works**
- When discussions are fetched via `GET /community-discussions/:communityId`, each discussion's view count is incremented
- Uses `Promise.all` for concurrent updates (efficient)
- View count reflects immediately in the returned data

#### **Implementation**
Updated [`communityDiscussionController.js`](c:\Users\Komal\Downloads\ShikshaHub-version2\backend\controllers\communityDiscussionController.js) - `getCommunityDiscussions` function:

```javascript
// After fetching discussions:

// Increment view count for each discussion
await Promise.all(
  discussions.map(discussion => 
    CommunityDiscussion.findByIdAndUpdate(
      discussion._id,
      { $inc: { viewCount: 1 } },
      { new: false }
    )
  )
);

// Update viewCount in returned discussions
discussions.forEach(discussion => {
  discussion.viewCount = (discussion.viewCount || 0) + 1;
});
```

---

## Testing

### Test Delete Permissions

#### **As Student**
1. ✅ Can delete own post
2. ❌ Cannot delete teacher post → "Students can only delete their own posts"
3. ❌ Cannot delete admin post → "Students can only delete their own posts"

#### **As Teacher**
1. ✅ Can delete own post
2. ✅ Can delete student post (with reason)
3. ❌ Cannot delete admin post → "Teachers cannot delete admin posts"
4. ❌ Cannot delete other teacher post → "Teachers cannot delete other teacher posts"

#### **As Admin**
1. ✅ Can delete own post
2. ✅ Can delete teacher post
3. ✅ Can delete student post
4. ✅ Can delete any admin post

### Test View Count

1. Navigate to community forum
2. View discussions list
3. Check view count on any discussion
4. Refresh the page
5. **View count should increase** each time the page loads

---

## Backend Changes Summary

### Files Modified
- **`backend/controllers/communityDiscussionController.js`**
  - Enhanced `deleteDiscussion()` - Added role-based permission checks
  - Enhanced `getCommunityDiscussions()` - Added auto view count increment

### Database Changes
- No schema changes required
- View counts now update automatically via `$inc` operator

---

## Status

✅ **FIXED** - Both issues resolved
- Delete permissions now enforce proper role hierarchy
- View counts update automatically when discussions are viewed

---

## Notes

### Why View Count on List Load?
- Since discussions are displayed with full content and replies in the list
- Users are actually "viewing" the discussion content
- This provides accurate engagement metrics

### Alternative Approaches Considered
1. **Click-to-expand**: Only increment on click (more complex UI)
2. **Unique views**: Track unique users (requires session management)
3. **Current approach**: Simple, automatic, works well ✅

### Future Enhancements
- Track unique viewers per discussion
- View analytics dashboard
- Most viewed discussions filter
