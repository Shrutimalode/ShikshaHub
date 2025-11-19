import React, { useState } from 'react';
import { Card, Button, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const CommunitySidePanel = ({ communityId, isAdmin, onDeleteCommunity, joinCode, joinCodeDescription, onUploadMaterialClick, onCreateEventClick }) => {
  const navigate = useNavigate();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeaveCommunity = async () => {
    setLeaving(true);
    try {
      await api.post(`/communities/${communityId}/leave`);
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to leave community');
      console.error('Error leaving community:', error);
    }
    setLeaving(false);
  };

  return (
    <>
      {/* Join Code Card (no join request button) */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">Join Code</Card.Title>
            <div className="join-code">{joinCode}</div>
          </div>
          <p className="small text-muted mb-3">
            {joinCodeDescription}
          </p>
          {isAdmin && (
            <Button 
              variant="danger" 
              size="sm"
              onClick={onDeleteCommunity}
              className="w-100 mb-2"
            >
              <i className="fas fa-trash-alt me-2"></i>
              Delete Community
            </Button>
          )}
        </Card.Body>
      </Card>

      {/* Quick Actions Card */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Quick Actions</Card.Title>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-primary" 
              className="w-100"
              onClick={onUploadMaterialClick}
            >
              <i className="fas fa-upload me-2"></i>
              Upload Material
            </Button>
            <Link to={`/communities/${communityId}/blogs/create`}>
              <Button variant="outline-success" className="w-100">
                <i className="fas fa-pen me-2"></i>
                Create Blog
              </Button>
            </Link>
            <Button 
              variant="outline-info" 
              className="w-100"
              onClick={onCreateEventClick}
            >
              <i className="fas fa-calendar-alt me-2"></i>
              Create Event
            </Button>
            {!isAdmin && (
              <Button 
                variant="outline-danger" 
                className="w-100"
                onClick={() => setShowLeaveModal(true)}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Exit Community
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Leave Community Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Exit Community</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to leave this community? You will need to request to join again if you want to rejoin.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleLeaveCommunity}
            disabled={leaving}
          >
            {leaving ? 'Leaving...' : 'Yes, Leave Community'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CommunitySidePanel;