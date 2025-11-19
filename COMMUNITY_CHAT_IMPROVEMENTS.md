# Community Chat Improvements

This document describes the improvements made to the community-level discussion forum:

## 1. Tabbed Interface for Chats

### Features:
- **All Discussions Tab**: Shows all community discussions with filtering options
- **Active Chats Tab**: Shows only active discussions (not terminated or deleted)
- Each chat appears as a separate tab for better organization

### Implementation:
- Added new endpoints to fetch active chats only
- Modified frontend to use tabbed interface with React Bootstrap Tabs
- Updated discussion model to track termination status

## 2. Automatic Chat Termination

### Features:
- **Resolved Questions**: When a reply is marked as the answer, the question thread is automatically terminated
- **Old Chats**: Chats that have been inactive for 30+ days are automatically terminated
- **Termination Reason**: Each terminated chat has a reason recorded

### Implementation:
- Added `isTerminated`, `terminatedAt`, and `terminationReason` fields to the CommunityDiscussion model
- Created a scheduler that runs daily to terminate old chats
- Modified the "mark as answer" functionality to terminate the parent question

## 3. Visual Indicators

### Features:
- **Terminated Badge**: Shows a "Terminated" badge on terminated discussions
- **Disabled Actions**: Prevents replying, editing, or other actions on terminated chats
- **Sorting**: Active chats are sorted by last activity date

### Implementation:
- Added visual indicators in the frontend DiscussionCard component
- Disabled action buttons for terminated discussions
- Updated backend queries to exclude terminated discussions from active views

## API Endpoints

### New Endpoints:
- `GET /api/community-discussions/active/:communityId` - Get active chats for tabbed interface
- `POST /api/community-discussions/terminate-old/:communityId` - Manually terminate old chats (faculty only)

### Modified Endpoints:
- `GET /api/community-discussions/:communityId` - Now excludes terminated discussions by default
- `POST /api/community-discussions/mark-answer/:discussionId` - Now terminates parent question when marking answer

## Database Changes

### New Fields in CommunityDiscussion Model:
- `isTerminated` (Boolean) - Whether the chat has been terminated
- `terminatedAt` (Date) - When the chat was terminated
- `terminationReason` (String) - Reason for termination
- `lastActivityAt` (Date) - Timestamp of last activity (used for determining old chats)

## Scheduler

A daily scheduler runs at midnight to automatically terminate chats that have been inactive for 30 days.