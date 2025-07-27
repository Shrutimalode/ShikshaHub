import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Spinner, Alert } from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import BlogDetail from '../components/BlogDetail';

const BlogView = () => {
  const { communityId, blogId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(null); // null, 'approved', 'rejected'
  const [reviewComment, setReviewComment] = useState('');
  
  // Fetch blog details
  useEffect(() => {
    const fetchBlogDetails = async () => {
      try {
        const res = await api.get(`/blogs/${blogId}`);
        setBlog(res.data);
      } catch (error) {
        console.error('Error fetching blog details:', error);
        let errorMessage = 'Failed to load blog details. Please try again later.';
        
        if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to view this blog post.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Blog post not found.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
        }
        
        setError(errorMessage);
      }
      setLoading(false);
    };

    fetchBlogDetails();
  }, [blogId]);
  
  // Handle blog deletion
  const handleDeleteBlog = async () => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await api.delete(`/blogs/${blogId}`);
        navigate(`/communities/${communityId}`);
      } catch (error) {
        alert('Failed to delete blog post. Please try again.');
        console.error('Error deleting blog post:', error);
      }
    }
  };
  
  // Handle blog review submission
  const handleReviewSubmit = async () => {
    if (showReviewModal === 'rejected' && !reviewComment.trim()) {
      alert('Please provide specific feedback on why this blog is being rejected and suggestions for improvement.');
      return;
    }
    
    try {
      await api.put(`/blogs/review/${blogId}`, {
        status: showReviewModal,
        reviewComment
      });
      
      // Update blog status
      setBlog({
        ...blog,
        status: showReviewModal,
        reviewComment,
        reviewedBy: { _id: user.id, name: user.name },
        reviewedAt: new Date()
      });
      
      setShowReviewModal(null);
      setReviewComment('');
    } catch (error) {
      alert('Failed to review blog post. Please try again.');
      console.error('Error reviewing blog post:', error);
    }
  };
  
  // Handle blog resubmission
  const handleResubmit = async () => {
    try {
      await api.put(`/blogs/resubmit/${blogId}`);
      
      // Update blog status
      setBlog({
        ...blog,
        status: 'pending',
        reviewComment: null,
        reviewedAt: null
      });
      
      alert('Blog has been resubmitted for review successfully!');
    } catch (error) {
      alert('Failed to resubmit blog post. Please try again.');
      console.error('Error resubmitting blog post:', error);
    }
  };
  
  // Check if user is admin of this community
  const isAdmin = blog && user && blog.community && 
    ((typeof blog.community === 'string' && blog.community === communityId) || 
     (blog.community._id && blog.community._id === communityId)) && 
    blog.authorRole === 'admin';

  // Render loading spinner
  if (loading) {
    return (
      <Container className="spinner-container">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // Render error message
  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          {error}
          <div className="mt-3">
            <Button variant="outline-primary" onClick={() => navigate(`/communities/${communityId}`)}>
              Return to Community
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-4">
        <Button variant="outline-primary" onClick={() => navigate(`/communities/${communityId}`)}>
          Back to Community
        </Button>
      </div>
      
      <BlogDetail 
        blog={blog}
        communityId={communityId}
        isAdmin={isAdmin}
        onDelete={handleDeleteBlog}
        showReviewModal={showReviewModal}
        setShowReviewModal={setShowReviewModal}
        reviewComment={reviewComment}
        setReviewComment={setReviewComment}
        handleReviewSubmit={handleReviewSubmit}
        onResubmit={handleResubmit}
      />
    </Container>
  );
};

export default BlogView; 