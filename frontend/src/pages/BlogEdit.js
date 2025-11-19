import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Spinner, Alert } from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import BlogForm from '../components/BlogForm';

const BlogEdit = () => {
  const { communityId, blogId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch blog details
  useEffect(() => {
    const fetchBlogDetails = async () => {
      try {
        const res = await api.get(`/blogs/${blogId}`);
        
        // Check if user is the author
        if (res.data.author._id !== user.id) {
          setError('You are not authorized to edit this blog post.');
        } else {
          setBlog(res.data);
        }
      } catch (error) {
        console.error('Error fetching blog details:', error);
        let errorMessage = 'Failed to load blog details. Please try again later.';
        
        if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to edit this blog post.';
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
  }, [blogId, user.id]);
  
  // Handle form submission
  const handleSubmit = async (formData) => {
    setSubmitting(true);
    
    try {
      await api.put(`/blogs/${blogId}`, formData);
      navigate(`/communities/${communityId}/blogs/${blogId}`);
    } catch (error) {
      console.error('Error updating blog post:', error);
      setError('Failed to update blog post. Please try again.');
    }
    
    setSubmitting(false);
  };

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
            <Button variant="outline-primary" onClick={() => navigate(`/communities/${communityId}/blogs/${blogId}`)}>
              Return to Blog Post
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-4">
        <Button 
          variant="outline-primary" 
          onClick={() => navigate(`/communities/${communityId}/blogs/${blogId}`)}
        >
          Cancel
        </Button>
      </div>
      
      <BlogForm 
        blog={blog}
        communityId={communityId}
        onSubmit={handleSubmit}
        submitButtonText={submitting ? 'Saving...' : 'Save Changes'}
        isEdit={true}
      />
    </Container>
  );
};

export default BlogEdit; 