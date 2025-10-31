import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const CommentForm = ({ 
  blogId, 
  parentCommentId = null, 
  commentId = null,
  initialContent = '',
  onCommentAdded, 
  onCancel,
  placeholder = "Write your comment...",
  isEdit = false,
  isAdminEdit = false,
  editReason = ''
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(initialContent.length);
  const [adminEditReason, setAdminEditReason] = useState(editReason);
  const textareaRef = useRef(null);

  const maxLength = 2000;

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment content is required.');
      return;
    }

    if (content.length > maxLength) {
      setError(`Comment cannot exceed ${maxLength} characters.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (isEdit && commentId) {
        // Update existing comment
        const updateData = {
          content: content.trim()
        };
        
        // Add edit reason for admin edits
        if (isAdminEdit && adminEditReason.trim()) {
          updateData.editReason = adminEditReason.trim();
        }
        
        const response = await api.put(`/discussions/${commentId}`, updateData);
        onCommentAdded(response.data);
      } else {
        // Create new comment
        const response = await api.post(`/discussions/blog/${blogId}`, {
          content: content.trim(),
          parentCommentId
        });
        onCommentAdded(response.data);
      }

      // Reset form
      setContent('');
      setCharCount(0);
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      
      if (error.response?.status === 403) {
        setError('You do not have permission to post comments on this blog.');
      } else if (error.response?.status === 404) {
        setError('Blog post not found.');
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || 'Invalid comment data.');
      } else {
        setError('Failed to submit comment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setError('');
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getCharCountColor = () => {
    if (charCount > maxLength * 0.9) return 'text-danger';
    if (charCount > maxLength * 0.8) return 'text-warning';
    return 'text-muted';
  };

  return (
    <div className="comment-form">
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Control
            ref={textareaRef}
            as="textarea"
            rows={isEdit ? 4 : 3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            style={{
              resize: 'vertical',
              minHeight: isEdit ? '100px' : '80px'
            }}
          />
          
          {/* Admin Edit Reason Field */}
          {isAdminEdit && (
            <Form.Group className="mt-3">
              <Form.Label>
                <i className="fas fa-shield-alt me-1 text-warning"></i>
                Reason for editing (required for institutional security):
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={adminEditReason}
                onChange={(e) => setAdminEditReason(e.target.value)}
                placeholder="Please provide a detailed reason for editing this comment..."
                required
              />
              <Form.Text className="text-muted">
                This reason will be logged for audit purposes.
              </Form.Text>
            </Form.Group>
          )}
          
          <div className="d-flex justify-content-between align-items-center mt-2">
            <Form.Text className={getCharCountColor()}>
              {charCount}/{maxLength} characters
              {isEdit && charCount !== initialContent.length && (
                <span className="ms-2 text-info">
                  <i className="fas fa-edit me-1"></i>
                  {isAdminEdit ? 'Admin Edit' : 'Edited'}
                </span>
              )}
            </Form.Text>
            <small className="text-muted">
              Press Ctrl+Enter to submit
            </small>
          </div>
        </Form.Group>

        <div className="d-flex justify-content-end">
          {onCancel && (
            <Button
              variant="outline-secondary"
              onClick={handleCancel}
              className="me-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !content.trim() || content.length > maxLength || (isAdminEdit && !adminEditReason.trim())}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {isEdit ? 'Updating...' : 'Posting...'}
              </>
            ) : (
              <>
                <i className={`fas ${isEdit ? 'fa-save' : 'fa-paper-plane'} me-2`}></i>
                {isEdit ? (isAdminEdit ? 'Update as Admin' : 'Update Comment') : 'Post Comment'}
              </>
            )}
          </Button>
        </div>
      </Form>

      {/* Helpful Tips */}
      {!isEdit && (
        <div className="mt-3">
          <small className="text-muted">
            <i className="fas fa-lightbulb me-1"></i>
            <strong>Tips:</strong> Be respectful and constructive in your comments. 
            Use Ctrl+Enter to quickly submit your comment.
          </small>
        </div>
      )}
    </div>
  );
};

export default CommentForm;
