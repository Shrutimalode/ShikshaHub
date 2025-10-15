import React, { useState } from 'react';
import { Card, Button, Badge, Dropdown, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import CommentForm from './CommentForm';

const Comment = ({ comment, blogId, onCommentUpdate, onCommentDelete, onReplyAdded }) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteType, setDeleteType] = useState('soft');
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdminEdit, setIsAdminEdit] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'teacher': return 'primary';
      case 'student': return 'success';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const canEdit = () => {
    return comment.author._id === user.id;
  };

  const canAdminEdit = () => {
    return user.role === 'admin' || user.role === 'teacher';
  };

  const canDelete = () => {
    return comment.author._id === user.id || user.role === 'admin' || user.role === 'teacher';
  };

  const isAdmin = () => {
    return user.role === 'admin';
  };

  const canPinComment = () => {
    return user.role === 'teacher' || user.role === 'admin';
  };

  const canVerifyAnswer = () => {
    return user.role === 'admin';
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    try {
      setIsLiking(true);
      const response = await api.post(`/discussions/${comment._id}/like`);
      
      // Update comment with new like status
      const updatedComment = response.data.comment;
      onCommentUpdate(updatedComment);
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion for institutional security.');
      return;
    }

    if (deleteReason.trim().length < 10 && (user.role !== 'admin' && user.role !== 'teacher')) {
      alert('Please provide a detailed reason for deletion (minimum 10 characters).');
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/discussions/${comment._id}`, {
        data: { 
          reason: deleteReason.trim(),
          deleteType: deleteType
        }
      });
      
      onCommentDelete(comment._id);
      setShowDeleteModal(false);
      setDeleteReason('');
      setDeleteType('soft');
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.response?.data?.message || 'Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplyAdded = (newReply) => {
    onReplyAdded(comment._id, newReply);
    setShowReplyForm(false);
  };

  const handlePinComment = async () => {
    if (isPinning) return;
    
    try {
      setIsPinning(true);
      const response = await api.post(`/discussions/${comment._id}/pin`);
      
      // Update comment with new pin status
      const updatedComment = response.data.comment;
      onCommentUpdate(updatedComment);
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to pin/unpin comment. Please try again.');
    } finally {
      setIsPinning(false);
    }
  };

  const handleVerifyAnswer = async () => {
    if (isVerifying) return;
    
    try {
      setIsVerifying(true);
      const response = await api.post(`/discussions/${comment._id}/verify`);
      
      // Update comment with new verification status
      const updatedComment = response.data.comment;
      onCommentUpdate(updatedComment);
    } catch (error) {
      console.error('Error toggling verification:', error);
      alert('Failed to verify/unverify answer. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isLiked = comment.likes && comment.likes.includes(user.id);

  return (
    <>
      <Card className={`mb-3 shadow-sm ${comment.isFacultyReply ? 'faculty-comment' : 'border-0'} ${comment.isPinned ? 'pinned-comment' : ''} ${comment.isVerifiedAnswer ? 'verified-answer' : ''}`}>
        <Card.Body className="pb-2">
          {/* Faculty Badges */}
          {comment.isFacultyReply && (
            <div className="faculty-badges mb-2">
              <Badge bg="primary" className="me-2">
                <i className="fas fa-chalkboard-teacher me-1"></i>
                Faculty Response
              </Badge>
              {comment.isVerifiedAnswer && (
                <Badge bg="success" className="me-2">
                  <i className="fas fa-check-circle me-1"></i>
                  Verified Answer
                </Badge>
              )}
              {comment.isPinned && (
                <Badge bg="warning" className="me-2">
                  <i className="fas fa-thumbtack me-1"></i>
                  Pinned
                </Badge>
              )}
            </div>
          )}

          {/* Comment Header */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="d-flex align-items-center">
              <div className="comment-author-info">
                <strong className="me-2">{comment.author.name}</strong>
                <Badge bg={getRoleBadge(comment.authorRole)} className="me-2" size="sm">
                  {comment.authorRole}
                </Badge>
                <small className="text-muted">
                  {formatDate(comment.createdAt)}
                  {comment.isEdited && (
                    <span className="ms-1">
                      <i className="fas fa-edit me-1"></i>
                      edited
                    </span>
                  )}
                </small>
              </div>
            </div>
            
            {/* Comment Actions */}
            {(canEdit() || canDelete() || canPinComment() || canVerifyAnswer()) && (
              <Dropdown>
                <Dropdown.Toggle variant="light" size="sm" id={`comment-actions-${comment._id}`}>
                  <i className="fas fa-ellipsis-v"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {canEdit() && (
                    <Dropdown.Item onClick={() => {
                      setIsAdminEdit(false);
                      setShowEditForm(true);
                    }}>
                      <i className="fas fa-edit me-2"></i>
                      Edit
                    </Dropdown.Item>
                  )}
                  {canAdminEdit() && !canEdit() && (
                    <Dropdown.Item onClick={() => {
                      setIsAdminEdit(true);
                      setShowEditForm(true);
                    }}>
                      <i className="fas fa-shield-alt me-2 text-warning"></i>
                      Admin Edit
                    </Dropdown.Item>
                  )}
                  
                  {/* Faculty Controls */}
                  {canPinComment() && (
                    <Dropdown.Item onClick={handlePinComment} disabled={isPinning}>
                      <i className={`fas fa-thumbtack me-2 ${comment.isPinned ? 'text-warning' : 'text-muted'}`}></i>
                      {isPinning ? 'Toggling...' : (comment.isPinned ? 'Unpin Comment' : 'Pin Comment')}
                    </Dropdown.Item>
                  )}
                  
                  {canVerifyAnswer() && (
                    <Dropdown.Item onClick={handleVerifyAnswer} disabled={isVerifying}>
                      <i className={`fas fa-check-circle me-2 ${comment.isVerifiedAnswer ? 'text-success' : 'text-muted'}`}></i>
                      {isVerifying ? 'Toggling...' : (comment.isVerifiedAnswer ? 'Unmark as Verified' : 'Mark as Verified Answer')}
                    </Dropdown.Item>
                  )}
                  
                  {canDelete() && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={() => setShowDeleteModal(true)} className="text-danger">
                        <i className="fas fa-trash-alt me-2"></i>
                        Delete
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>

          {/* Comment Content */}
          <div className="comment-content mb-3">
            <p className="mb-0">{comment.content}</p>
          </div>

          {/* Comment Actions */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="comment-actions">
              <Button
                variant={isLiked ? "danger" : "outline-secondary"}
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className="me-3"
              >
                <i className={`fas fa-heart ${isLiked ? '' : 'fa-regular'}`}></i>
                {comment.likeCount > 0 && (
                  <span className="ms-1">{comment.likeCount}</span>
                )}
              </Button>
              
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <i className="fas fa-reply me-1"></i>
                Reply
              </Button>
            </div>

            {/* Reply Count */}
            {comment.replies && comment.replies.length > 0 && (
              <small className="text-muted">
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </small>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 pt-3 border-top">
              <CommentForm
                blogId={blogId}
                parentCommentId={comment._id}
                onCommentAdded={handleReplyAdded}
                placeholder={`Reply to ${comment.author.name}...`}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Edit Form */}
          {showEditForm && (
            <div className="mt-3 pt-3 border-top">
              <CommentForm
                blogId={blogId}
                commentId={comment._id}
                initialContent={comment.content}
                onCommentAdded={(updatedComment) => {
                  onCommentUpdate(updatedComment);
                  setShowEditForm(false);
                  setIsAdminEdit(false);
                }}
                onCancel={() => {
                  setShowEditForm(false);
                  setIsAdminEdit(false);
                }}
                isEdit={true}
                isAdminEdit={isAdminEdit}
                placeholder={isAdminEdit ? "Edit this comment as admin..." : "Edit your comment..."}
              />
            </div>
          )}
        </Card.Body>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="replies ms-4 border-start border-2 border-light">
            {/* Faculty Reply Indicator */}
            {comment.replies.some(reply => reply.isFacultyReply) && (
              <div className="faculty-replies-indicator mb-2">
                <small className="text-muted">
                  <i className="fas fa-sort-amount-up me-1"></i>
                  Faculty replies appear first
                </small>
              </div>
            )}
            {comment.replies.map(reply => (
              <Card key={reply._id} className={`shadow-sm mb-2 ${reply.isFacultyReply ? 'faculty-comment' : 'border-0'} ${reply.isPinned ? 'pinned-comment' : ''} ${reply.isVerifiedAnswer ? 'verified-answer' : ''}`}>
                <Card.Body className="py-2">
                  {/* Faculty Reply Badges for Replies */}
                  {reply.isFacultyReply && (
                    <div className="faculty-badges mb-2">
                      <Badge bg="primary" className="me-2">
                        <i className="fas fa-chalkboard-teacher me-1"></i>
                        Faculty Response
                      </Badge>
                      {reply.isVerifiedAnswer && (
                        <Badge bg="success" className="me-2">
                          <i className="fas fa-check-circle me-1"></i>
                          Verified Answer
                        </Badge>
                      )}
                      {reply.isPinned && (
                        <Badge bg="warning" className="me-2">
                          <i className="fas fa-thumbtack me-1"></i>
                          Pinned
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center">
                      <div className="reply-author-info">
                        <strong className="me-2">{reply.author.name}</strong>
                        <Badge bg={getRoleBadge(reply.authorRole)} className="me-2" size="sm">
                          {reply.authorRole}
                        </Badge>
                        <small className="text-muted">
                          {formatDate(reply.createdAt)}
                          {reply.isEdited && (
                            <span className="ms-1">
                              <i className="fas fa-edit me-1"></i>
                              edited
                            </span>
                          )}
                        </small>
                      </div>
                    </div>
                    
                    {/* Reply Actions */}
                    {(reply.author._id === user.id || user.role === 'admin' || user.role === 'teacher') && (
                      <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm" id={`reply-actions-${reply._id}`}>
                          <i className="fas fa-ellipsis-v"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {reply.author._id === user.id && (
                            <Dropdown.Item onClick={() => {
                              // Handle edit reply - you might want to create a separate edit form for replies
                              alert('Edit reply functionality can be added here');
                            }}>
                              <i className="fas fa-edit me-2"></i>
                              Edit
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item onClick={() => {
                            // Handle delete reply
                            if (window.confirm('Are you sure you want to delete this reply?')) {
                              onCommentDelete(reply._id);
                            }
                          }} className="text-danger">
                            <i className="fas fa-trash-alt me-2"></i>
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>

                  <div className={`reply-content mb-2 ${reply.isFacultyReply ? 'faculty-reply-content' : ''}`}>
                    <p className="mb-0">{reply.content}</p>
                  </div>

                  <div className="reply-actions">
                    <Button
                      variant={reply.likes && reply.likes.includes(user.id) ? "danger" : "outline-secondary"}
                      size="sm"
                      onClick={() => {
                        // Handle like reply
                        alert('Like reply functionality can be added here');
                      }}
                    >
                      <i className={`fas fa-heart ${reply.likes && reply.likes.includes(user.id) ? '' : 'fa-regular'}`}></i>
                      {reply.likeCount > 0 && (
                        <span className="ms-1">{reply.likeCount}</span>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Comment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Are you sure you want to delete this comment? This action will be logged for institutional security.
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-exclamation-triangle me-1 text-warning"></i>
              Reason for deletion (required):
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Please provide a detailed reason for deleting this comment for institutional security purposes..."
              required
            />
            <Form.Text className="text-muted">
              This reason will be logged for audit purposes. Minimum 10 characters required.
            </Form.Text>
          </Form.Group>

          {/* Admin-only deletion type selection */}
          {isAdmin() && (
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="fas fa-shield-alt me-1 text-danger"></i>
                Deletion Type (Admin Only):
              </Form.Label>
              <Form.Select 
                value={deleteType} 
                onChange={(e) => setDeleteType(e.target.value)}
              >
                <option value="soft">Soft Delete (can be restored)</option>
                <option value="hard">Hard Delete (permanent removal)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Soft delete hides the comment but keeps it for audit. Hard delete permanently removes it from the database.
              </Form.Text>
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={isDeleting || !deleteReason.trim() || deleteReason.trim().length < 10}
          >
            {isDeleting ? 'Deleting...' : `${deleteType === 'hard' ? 'Permanently ' : ''}Delete Comment`}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Comment;
