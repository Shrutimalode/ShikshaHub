import React, { useState, useEffect } from 'react';
import { ListGroup, Badge, Button, Card, Form, Row, Col, Alert, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const BlogList = ({ blogs, communityId, isAdmin, onDelete, onReview }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBlogs, setFilteredBlogs] = useState(blogs);
  const [filter, setFilter] = useState('all'); // all, pending, approved, mine
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Rejection feedback modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  // Initialize filtered blogs
  useEffect(() => {
    setFilteredBlogs(blogs);
  }, [blogs]);

  // Apply local filtering for status filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      let filtered = blogs;
      
      // Apply status filter
      if (filter === 'pending') {
        filtered = blogs.filter(blog => blog.status === 'pending');
      } else if (filter === 'approved') {
        filtered = blogs.filter(blog => blog.status === 'approved');
      } else if (filter === 'mine') {
        filtered = blogs.filter(blog => blog.author._id === user.id);
      }
      
      setFilteredBlogs(filtered);
    }
  }, [filter, blogs, user, searchTerm]);

  // Search blogs from server
  const searchBlogs = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredBlogs(blogs);
      return;
    }
    
    setIsSearching(true);
    setSearchError('');
    
    try {
      const res = await api.get(`/blogs/search/${communityId}`, {
        params: { keyword }
      });
      
      let result = res.data;
      
      // Apply status filter to search results
      if (filter === 'pending') {
        result = result.filter(blog => blog.status === 'pending');
      } else if (filter === 'approved') {
        result = result.filter(blog => blog.status === 'approved');
      } else if (filter === 'mine') {
        result = result.filter(blog => blog.author._id === user.id);
      }
      
      setFilteredBlogs(result);
    } catch (error) {
      console.error('Error searching blogs:', error);
      setSearchError('Failed to search blogs');
      // Fall back to local filtering
      let filtered = blogs.filter(blog => 
        blog.tags && blog.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
      );
      setFilteredBlogs(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search requests
    const delayDebounceFn = setTimeout(() => {
      searchBlogs(value);
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  };

  // Handle blog rejection with feedback
  const handleReject = (blogId) => {
    setSelectedBlogId(blogId);
    setRejectionFeedback('');
    setShowRejectModal(true);
  };

  // Submit rejection with feedback
  const submitRejection = () => {
    if (!rejectionFeedback.trim()) {
      alert('Please provide feedback on why the blog is being rejected');
      return;
    }
    
    onReview(selectedBlogId, 'rejected', rejectionFeedback);
    setShowRejectModal(false);
    setSelectedBlogId(null);
    setRejectionFeedback('');
  };

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

  const getStatusText = (blog) => {
    if (blog.status === 'pending') {
      return 'Pending Review';
    } else if (blog.status === 'rejected') {
      return `Rejected: ${blog.reviewComment || 'No comment provided'}`;
    }
    return null;
  };

  const canReview = (blog) => {
    // Admin can review any blog
    if (isAdmin) return true;
    
    // Teachers can only review student blogs
    if (user.role === 'teacher' && blog.authorRole === 'student') return true;
    
    return false;
  };

  if (!blogs || blogs.length === 0) {
    return <Alert variant="info">No blogs have been posted yet.</Alert>;
  }

  return (
    <div>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by tags..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchError && <Alert variant="danger" className="mt-2 py-1 px-2 small">{searchError}</Alert>}
        </Col>
        <Col md={6}>
          <div className="d-flex justify-content-end">
            <Form.Select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-auto"
            >
              <option value="all">All Blogs</option>
              <option value="approved">Approved Blogs</option>
              <option value="pending">Pending Blogs</option>
              <option value="mine">My Blogs</option>
            </Form.Select>
          </div>
        </Col>
      </Row>

      {isSearching ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" /> Searching...
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Alert variant="info">No blogs matching your filters.</Alert>
      ) : (
        <ListGroup>
          {filteredBlogs.map(blog => (
            <ListGroup.Item 
              key={blog._id}
              className="blog-list-item mb-2 p-0 border rounded"
            >
              <Card className="border-0">
                <Card.Body>
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start">
                    <div style={{ flex: 1 }}>
                      <h5>
                        <Link to={`/communities/${communityId}/blogs/${blog._id}`} className="blog-title">
                          {blog.title}
                        </Link>
                        {!blog.isOriginalContent && (
                          <Badge bg="info" className="ms-2">External Content</Badge>
                        )}
                      </h5>
                      <div className="mb-2">
                        <small className="text-muted">
                          By: {blog.isOriginalContent ? blog.author.name : blog.realAuthorName} 
                          {!blog.isOriginalContent && <span> (Posted by {blog.author.name})</span>}
                          <Badge 
                            bg={getRoleBadge(blog.authorRole)} 
                            className="ms-2"
                          >
                            {blog.authorRole}
                          </Badge>
                          <Badge 
                            bg={getBadgeVariant(blog.status)} 
                            className="ms-2"
                          >
                            {blog.status}
                          </Badge>
                        </small>
                      </div>
                      <p className="mb-1 blog-preview">
                        {blog.content.substring(0, 150)}
                        {blog.content.length > 150 && '...'}
                      </p>
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="mt-2">
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
                      {getStatusText(blog) && (
                        <Alert variant={blog.status === 'pending' ? 'warning' : 'danger'} className="mt-2 mb-0 py-1 px-2 small">
                          {getStatusText(blog)}
                        </Alert>
                      )}
                    </div>
                    <div className="blog-action-mobile-right mt-2 mt-md-0">
                      <Link to={`/communities/${communityId}/blogs/${blog._id}`} className="me-2">
                        <Button variant="outline-primary" size="sm">
                          Read
                        </Button>
                      </Link>
                      {(blog.status === 'pending' && canReview(blog)) && (
                        <div className="ms-2 d-flex">
                          <Button 
                            variant="success" 
                            size="sm"
                            className="me-2"
                            onClick={() => onReview(blog._id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleReject(blog._id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white py-1 px-3">
                  <small className="text-muted">
                    Posted: {new Date(blog.createdAt).toLocaleString()}
                    {blog.status === 'approved' && blog.reviewedBy && (
                      <span> | Approved by: {blog.reviewedBy.name}</span>
                    )}
                    {blog.status === 'rejected' && blog.reviewedBy && (
                      <span> | Rejected by: {blog.reviewedBy.name}</span>
                    )}
                    {!blog.isOriginalContent && (
                      <span> | <strong>Original Content</strong>{blog.sourceUrl && <span> (<a href={blog.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>)</span>}</span>
                    )}
                  </small>
                </Card.Footer>
              </Card>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {/* Rejection feedback modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Provide Rejection Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Feedback for the author</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="Please explain why this blog post is being rejected..."
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submitRejection}>
            Reject with Feedback
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BlogList; 