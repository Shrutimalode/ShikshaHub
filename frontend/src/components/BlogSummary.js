import React, { useState } from 'react';
import api from '../api';
import { Button, Modal } from 'react-bootstrap';

const BlogSummary = ({ blogContent }) => {
  const [show, setShow] = useState(false);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const generateSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/blogs/summarize', {
        content: blogContent
      });
      setSummary(response.data.summary);
      handleShow();
    } catch (error) {
      setError('Failed to generate summary. Please try again.');
      console.error('Error generating summary:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="position-relative" style={{ minHeight: '50px' }}>
        <Button 
          variant="outline-primary" 
          onClick={generateSummary}
          disabled={loading}
          className="position-absolute bottom-0 end-0"
          style={{ 
            backgroundColor: '#4a154b',
            borderColor: '#4a154b',
            color: 'white'
          }}
        >
          {loading ? 'Generating Summary...' : 'Summarize Blog'}
        </Button>
      </div>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Blog Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? (
            <div className="text-danger">{error}</div>
          ) : (
            <p>{summary}</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BlogSummary; 