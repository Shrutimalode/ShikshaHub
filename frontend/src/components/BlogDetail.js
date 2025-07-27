import React from 'react';
import { Card, Badge, Button, Alert, Modal, Form, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BlogSummary from './BlogSummary';

const BlogDetail = ({ 
  blog, 
  communityId, 
  isAdmin, 
  onDelete, 
  onReview, 
  showReviewModal, 
  setShowReviewModal,
  reviewComment,
  setReviewComment,
  handleReviewSubmit,
  onResubmit
}) => {
  const { user } = useAuth();
  
  if (!blog) return null;
  
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'teacher': return 'primary';
      case 'student': return 'success';
      default: return 'secondary';
    }
  };
  
  const canEdit = () => {
    // Only allow editing if user is the author AND blog is not pending
    return blog.author._id === user.id && blog.status !== 'pending';
  };
  
  const canReview = () => {
    // Admin can review any blog
    if (isAdmin) return true;
    
    // Teachers can only review student blogs
    if (user.role === 'teacher' && blog.authorRole === 'student') return true;
    
    return false;
  };
  
  // Format the content with paragraphs
  const formatContent = (content) => {
    return content.split('\n').map((paragraph, index) => (
      paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />
    ));
  };

  return (
    <>
      <Card className="blog-detail shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2 className="mb-2">{blog.title}</h2>
              <div className="blog-meta">
                <span className="me-2">
                  By: {blog.isOriginalContent ? blog.author.name : blog.realAuthorName}
                  {!blog.isOriginalContent && <span> (Posted by {blog.author.name})</span>}
                </span>
                <Badge 
                  bg={getRoleBadge(blog.authorRole)} 
                  className="me-2"
                >
                  {blog.authorRole}
                </Badge>
                <Badge bg={getBadgeVariant(blog.status)}>
                  {blog.status}
                </Badge>
                {!blog.isOriginalContent && (
                  <Badge bg="info" className="ms-2">External Content</Badge>
                )}
              </div>
            </div>
            <div>
              {canEdit() && (
                <div className="blog-actions">
                  <Dropdown>
                    <Dropdown.Toggle variant="light" id="dropdown-blog-actions" size="sm">
                      <i className="fas fa-ellipsis-v"></i>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item as={Link} to={`/communities/${communityId}/blogs/${blog._id}/edit`}>
                        <i className="fas fa-edit me-2"></i>
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item onClick={onDelete} className="text-danger">
                        <i className="fas fa-trash-alt me-2"></i>
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              )}
            </div>
          </div>
          
          {blog.status === 'rejected' && blog.reviewComment && (
            <Alert variant="danger" className="mb-3">
              <h5 className="alert-heading">This post has been rejected</h5>
              <p><strong>Feedback from reviewer:</strong></p>
              <div className="rejection-feedback p-2 bg-light border rounded">
                {blog.reviewComment.split('\n').map((paragraph, index) => (
                  paragraph ? <p key={index} className="mb-1">{paragraph}</p> : <br key={index} />
                ))}
              </div>
              {canEdit() && (
                <div className="mt-3">
                  <p className="mb-2">You can edit your post based on this feedback and resubmit for review.</p>
                  <div className="d-flex">
                    <Link to={`/communities/${communityId}/blogs/${blog._id}/edit`} className="me-2">
                      <Button variant="primary" size="sm">
                        Edit and Resubmit
                      </Button>
                    </Link>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={onResubmit}
                    >
                      Resubmit As Is
                    </Button>
                  </div>
                </div>
              )}
            </Alert>
          )}
          
          <div className="blog-content mb-4">
            {formatContent(blog.content)}
          </div>
          
          {/* Add BlogSummary component */}
          <BlogSummary blogContent={blog.content} />
          
          {!blog.isOriginalContent && blog.realAuthorName && (
            <div className="original-author-attribution mb-4 p-3 border-start border-4 border-info bg-light">
              <p className="mb-1">
                <strong>Attribution Notice:</strong> This content was originally created by <strong>{blog.realAuthorName}</strong>.
                {blog.sourceUrl && (
                  <span> Originally published at: <a href={blog.sourceUrl} target="_blank" rel="noopener noreferrer">{blog.sourceUrl}</a></span>
                )}
              </p>
              <small className="text-muted">
                Shared with permission by {blog.author.name}. Please respect intellectual property rights when sharing content.
              </small>
            </div>
          )}
          
          {blog.tags && blog.tags.length > 0 && (
            <div className="blog-tags mb-3">
              <strong className="me-2">Tags:</strong>
              {blog.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  bg="secondary" 
                  className="me-1"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="blog-footer text-muted">
            <small>
              Posted: {new Date(blog.createdAt).toLocaleString()}
              {blog.updatedAt && blog.updatedAt !== blog.createdAt && (
                <span> | Updated: {new Date(blog.updatedAt).toLocaleString()}</span>
              )}
              {blog.status === 'approved' && blog.reviewedBy && (
                <span> | Approved by: {blog.reviewedBy.name}</span>
              )}
              {!blog.isOriginalContent && (
                <span> | <strong>Original Content</strong>{blog.sourceUrl && <span> (<a href={blog.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>)</span>}</span>
              )}
            </small>
          </div>
          
          {blog.status === 'pending' && canReview() && (
            <div className="review-actions mt-4 d-flex">
              <Alert variant="warning">
                This blog post is pending review.
              </Alert>
              <Button 
                variant="success" 
                onClick={() => setShowReviewModal('approved')}
                className="me-3"
              >
                Approve
              </Button>
              <Button 
                variant="danger" 
                onClick={() => setShowReviewModal('rejected')}
              >
                Reject
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Review Modal */}
      <Modal show={!!showReviewModal} onHide={() => setShowReviewModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {showReviewModal === 'approved' ? 'Approve' : 'Reject'} Blog Post
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>
                {showReviewModal === 'approved' 
                  ? 'Review Comment (Optional)' 
                  : 'Feedback on Rejection (Required)'}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={showReviewModal === 'rejected' ? 5 : 3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required={showReviewModal === 'rejected'}
                placeholder={showReviewModal === 'approved' 
                  ? "Optional comment for approval" 
                  : "Please provide specific feedback on why this blog is being rejected and suggestions for improvement. Be constructive and helpful."}
              />
              {showReviewModal === 'rejected' && (
                <Form.Text className="text-muted">
                  Your feedback will help the author understand why their post was rejected and how they can improve it.
                  Consider addressing content quality, relevance, accuracy, and formatting issues.
                </Form.Text>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(null)}>
            Cancel
          </Button>
          <Button 
            variant={showReviewModal === 'approved' ? 'success' : 'danger'} 
            onClick={handleReviewSubmit}
            disabled={showReviewModal === 'rejected' && !reviewComment.trim()}
          >
            {showReviewModal === 'approved' ? 'Approve' : 'Reject with Feedback'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BlogDetail; 