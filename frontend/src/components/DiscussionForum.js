import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Spinner, Alert, Badge, Dropdown } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import Comment from './Comment';
import CommentForm from './CommentForm';

const DiscussionForum = ({ blogId, blogStatus }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch comments and stats
  useEffect(() => {
    fetchComments();
    fetchStats();
  }, [blogId]);

  const fetchComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(pageNum === 1);
      if (pageNum > 1) setLoadingMore(true);
      
      const response = await api.get(`/discussions/blog/${blogId}?page=${pageNum}&limit=10`);
      
      if (append) {
        setComments(prev => [...prev, ...response.data.comments]);
      } else {
        setComments(response.data.comments);
      }
      
      setHasMore(pageNum < response.data.pagination.pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/discussions/blog/${blogId}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleNewComment = (newComment) => {
    setComments(prev => [newComment, ...prev]);
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalComments: prev.totalComments + 1,
        topLevelComments: prev.topLevelComments + 1
      }));
    }
  };

  const handleCommentUpdate = (updatedComment) => {
    setComments(prev => 
      prev.map(comment => 
        comment._id === updatedComment._id ? updatedComment : comment
      )
    );
  };

  const handleCommentDelete = (commentId) => {
    // Recursive function to remove comment and all its nested replies
    const removeCommentAndReplies = (commentsArray, idToDelete) => {
      return commentsArray
        .filter(comment => comment._id !== idToDelete)
        .map(comment => ({
          ...comment,
          replies: removeCommentAndReplies(comment.replies || [], idToDelete)
        }));
    };
    
    setComments(prev => removeCommentAndReplies(prev, commentId));
    
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalComments: Math.max(0, prev.totalComments - 1)
      }));
    }
  };

  const handleReplyAdded = (parentId, newReply) => {
    // Recursive function to add reply to the correct parent comment
    const addReplyToComment = (commentsArray, parentId, reply) => {
      return commentsArray.map(comment => {
        if (comment._id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToComment(comment.replies, parentId, reply)
          };
        }
        return comment;
      });
    };
    
    setComments(prev => addReplyToComment(prev, parentId, newReply));
    
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalComments: prev.totalComments + 1,
        replies: prev.replies + 1
      }));
    }
  };

  const loadMoreComments = () => {
    if (hasMore && !loadingMore) {
      fetchComments(page + 1, true);
    }
  };

  // Check if discussions are enabled (only for approved blogs)
  const discussionsEnabled = blogStatus === 'approved';

  if (!discussionsEnabled) {
    return (
      <Card className="mt-4">
        <Card.Body className="text-center">
          <i className="fas fa-comments fa-2x text-muted mb-3"></i>
          <h5>Discussions Not Available</h5>
          <p className="text-muted mb-0">
            Discussions are only available for approved blog posts.
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            <i className="fas fa-comments me-2"></i>
            Discussion Forum
          </h5>
          {stats && (
            <small className="text-muted">
              {stats.totalComments} {stats.totalComments === 1 ? 'comment' : 'comments'} 
              ({stats.topLevelComments} top-level, {stats.replies} replies)
            </small>
          )}
        </div>
        {stats && stats.totalComments > 0 && (
          <Badge bg="primary">
            {stats.totalComments}
          </Badge>
        )}
      </Card.Header>
      
      <Card.Body>
        {/* Comment Form */}
        <CommentForm 
          blogId={blogId}
          onCommentAdded={handleNewComment}
          placeholder="Share your thoughts on this blog post..."
        />

        {/* Error Message */}
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading comments...</span>
            </Spinner>
          </div>
        )}

        {/* Faculty Reply Notice */}
        {!loading && comments.length > 0 && (
          comments.some(comment => comment.isFacultyReply) || 
          comments.some(comment => comment.replies && comment.replies.some(reply => reply.isFacultyReply))
        ) && (
          <Alert variant="info" className="mb-3">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Faculty responses are highlighted and appear first</strong> in both main comments and replies to ensure students see official answers immediately.
          </Alert>
        )}

        {/* Comments List */}
        {!loading && comments.length === 0 && (
          <div className="text-center py-4">
            <i className="fas fa-comment-slash fa-2x text-muted mb-3"></i>
            <h6>No comments yet</h6>
            <p className="text-muted mb-0">
              Be the first to share your thoughts on this blog post!
            </p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="comments-list">
            {comments.map(comment => (
              <Comment
                key={comment._id}
                comment={comment}
                blogId={blogId}
                onCommentUpdate={handleCommentUpdate}
                onCommentDelete={handleCommentDelete}
                onReplyAdded={handleReplyAdded}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && comments.length > 0 && (
          <div className="text-center mt-3">
            <Button 
              variant="outline-primary" 
              onClick={loadMoreComments}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading...
                </>
              ) : (
                'Load More Comments'
              )}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DiscussionForum;