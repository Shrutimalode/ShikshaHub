import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Alert, Modal, Form, Row, Col, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const AdminModerationDashboard = ({ communityId }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedComments, setSelectedComments] = useState([]);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleteType, setBulkDeleteType] = useState('soft');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    if (communityId) {
      fetchModerationData();
    }
  }, [communityId]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/discussions/moderation/${communityId}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      setError('Failed to load moderation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSelect = (commentId) => {
    setSelectedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComments.length === dashboardData.recentComments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(dashboardData.recentComments.map(comment => comment._id));
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteReason.trim() || bulkDeleteReason.trim().length < 10) {
      alert('Please provide a detailed reason for bulk deletion (minimum 10 characters).');
      return;
    }

    try {
      setIsBulkDeleting(true);
      const response = await api.post('/discussions/bulk-delete', {
        commentIds: selectedComments,
        reason: bulkDeleteReason.trim(),
        deleteType: bulkDeleteType
      });

      alert(`Bulk deletion completed. ${response.data.deletedCount} comments deleted.`);
      
      // Refresh data
      await fetchModerationData();
      setSelectedComments([]);
      setBulkDeleteReason('');
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert(error.response?.data?.message || 'Failed to perform bulk deletion.');
    } finally {
      setIsBulkDeleting(false);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading moderation data...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-shield-alt me-2"></i>
            Moderation Dashboard
          </h5>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h4 className="text-primary">{dashboardData.statistics.totalComments}</h4>
                  <small className="text-muted">Total Comments</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h4 className="text-success">{dashboardData.statistics.activeDiscussions}</h4>
                  <small className="text-muted">Active Discussions</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h4 className="text-warning">{dashboardData.statistics.deletedComments}</h4>
                  <small className="text-muted">Deleted Comments</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h4 className="text-info">{dashboardData.statistics.flaggedComments}</h4>
                  <small className="text-muted">Flagged Comments</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Bulk Actions */}
          {selectedComments.length > 0 && (
            <div className="mb-3">
              <Alert variant="warning">
                <strong>{selectedComments.length}</strong> comments selected
                <Button 
                  variant="danger" 
                  size="sm" 
                  className="ms-3"
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  <i className="fas fa-trash-alt me-1"></i>
                  Bulk Delete
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="ms-2"
                  onClick={() => setSelectedComments([])}
                >
                  Clear Selection
                </Button>
              </Alert>
            </div>
          )}

          {/* Comments Table */}
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      checked={selectedComments.length === dashboardData.recentComments.length && dashboardData.recentComments.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Author</th>
                  <th>Content</th>
                  <th>Blog</th>
                  <th>Date</th>
                  <th>Likes</th>
                  <th>Replies</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentComments.map(comment => (
                  <tr key={comment._id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedComments.includes(comment._id)}
                        onChange={() => handleCommentSelect(comment._id)}
                      />
                    </td>
                    <td>
                      <div>
                        <strong>{comment.author.name}</strong>
                        <br />
                        <Badge bg={getRoleBadge(comment.author.role)} size="sm">
                          {comment.author.role}
                        </Badge>
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comment.content}
                      </div>
                    </td>
                    <td>
                      <small>
                        {comment.blog.title}
                        <br />
                        <Badge bg={comment.blog.status === 'approved' ? 'success' : 'warning'} size="sm">
                          {comment.blog.status}
                        </Badge>
                      </small>
                    </td>
                    <td>
                      <small>{formatDate(comment.createdAt)}</small>
                    </td>
                    <td>
                      <Badge bg="secondary">{comment.likeCount || 0}</Badge>
                    </td>
                    <td>
                      <Badge bg="info">{comment.replyCount || 0}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Delete this comment?')) {
                            // Handle single comment deletion
                            alert('Single comment deletion can be implemented here');
                          }
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {dashboardData.recentComments.length === 0 && (
            <div className="text-center py-4">
              <i className="fas fa-comments fa-2x text-muted mb-3"></i>
              <h6>No comments to moderate</h6>
              <p className="text-muted">All discussions are clean and well-moderated!</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Bulk Delete Modal */}
      <Modal show={showBulkDeleteModal} onHide={() => setShowBulkDeleteModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
            Bulk Delete Comments
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Warning:</strong> You are about to delete {selectedComments.length} comments. This action will be logged for institutional security.
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-exclamation-triangle me-1 text-warning"></i>
              Reason for bulk deletion (required):
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={bulkDeleteReason}
              onChange={(e) => setBulkDeleteReason(e.target.value)}
              placeholder="Please provide a detailed reason for bulk deletion for institutional security purposes..."
              required
            />
            <Form.Text className="text-muted">
              This reason will be logged for audit purposes. Minimum 10 characters required.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-shield-alt me-1 text-danger"></i>
              Deletion Type:
            </Form.Label>
            <Form.Select 
              value={bulkDeleteType} 
              onChange={(e) => setBulkDeleteType(e.target.value)}
            >
              <option value="soft">Soft Delete (can be restored)</option>
              <option value="hard">Hard Delete (permanent removal)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Soft delete hides comments but keeps them for audit. Hard delete permanently removes them from the database.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleBulkDelete}
            disabled={isBulkDeleting || !bulkDeleteReason.trim() || bulkDeleteReason.trim().length < 10}
          >
            {isBulkDeleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              `${bulkDeleteType === 'hard' ? 'Permanently ' : ''}Delete ${selectedComments.length} Comments`
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AdminModerationDashboard;
