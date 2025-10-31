# Material Reference Link Fix

## Issue
Material reference links in community discussion replies were not working. When users clicked on referenced material links (e.g., "process flow"), nothing happened.

## Root Cause
1. **Backend**: The `fileUrl` field was not being populated when fetching discussions
2. **Frontend**: The click handler was a placeholder (`e.preventDefault()` only) with no actual functionality

## Solution

### Backend Changes (`communityDiscussionController.js`)

Updated material population to include `fileUrl` in three functions:

#### 1. createDiscussion (Line ~130)
```javascript
// Before
{ path: 'referencedMaterials.material', select: 'title fileType originalFileName' }

// After
{ path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
```

#### 2. getCommunityDiscussions (Lines ~218 & ~226)
```javascript
// Before
.populate('referencedMaterials.material', 'title fileType originalFileName')

// After  
.populate('referencedMaterials.material', 'title fileType originalFileName fileUrl')
```

#### 3. updateDiscussion (Line ~389)
```javascript
// Before
{ path: 'referencedMaterials.material', select: 'title fileType originalFileName' }

// After
{ path: 'referencedMaterials.material', select: 'title fileType originalFileName fileUrl' }
```

### Frontend Changes (`CommunityForum.js`)

#### 1. Added Material View Handler (After line 246)
```javascript
const handleViewMaterial = (material) => {
  try {
    // Material object should have fileUrl from backend population
    const fileUrl = material?.fileUrl;
    const materialTitle = material?.title || 'Material';
    
    if (fileUrl) {
      // Open the Cloudinary file URL in a new tab
      window.open(fileUrl, '_blank');
    } else {
      console.error('Material fileUrl not available:', material);
      alert(`Unable to open "${materialTitle}". The file URL is not available.`);
    }
  } catch (error) {
    console.error('Error viewing material:', error);
    alert('Failed to open material. Please try again.');
  }
};
```

#### 2. Updated Material Link Rendering (Lines ~310-340)
```javascript
// Enhanced UI with proper click handler
<a 
  href="#" 
  onClick={(e) => { 
    e.preventDefault(); 
    handleViewMaterial(ref.material);
  }}
  className="text-primary fw-semibold"
  style={{ 
    cursor: 'pointer', 
    textDecoration: 'none',
    display: 'inline-block'
  }}
  title="Click to view material"
>
  📎 {ref.material.title || 'Material'}
</a>
```

## Features

### Visual Improvements
- Material references now displayed in a **light gray box** for better visibility
- **Bold** material titles for emphasis
- Hover tooltip: "Click to view material"
- Material notes displayed in *italic* format below the link

### Functionality
- Clicking a material link opens the file in a **new tab**
- Files are opened directly from **Cloudinary CDN** (fast loading)
- Error handling with user-friendly messages
- Console logging for debugging

## How It Works

1. User creates/replies to a discussion with material references
2. Backend fetches discussion and **populates** material details including `fileUrl`
3. Frontend renders clickable material links
4. User clicks material link
5. `handleViewMaterial()` extracts the `fileUrl` from the material object
6. Browser opens the Cloudinary file URL in a new tab

## Testing

To test the fix:

1. Create a new discussion/reply with a material reference
2. Add an optional note for the material
3. Submit the post
4. Click on the material link
5. ✅ Material should open in a new browser tab

## Related Files

- `/backend/controllers/communityDiscussionController.js` - Backend population logic
- `/frontend/src/components/CommunityForum.js` - Frontend UI and handler
- `/backend/models/Material.js` - Material schema (contains fileUrl field)
- `/backend/models/CommunityDiscussion.js` - Discussion schema with material references

## Material Reference Feature

This fix is part of the **Material Reference** feature that allows users to:
- Link course materials to discussion posts/replies
- Add contextual notes explaining why the material is referenced
- Quickly access referenced materials while reading discussions

**Note**: Material references are **only supported** in Community Forum discussions, not in Blog comment threads (as per project specifications).
