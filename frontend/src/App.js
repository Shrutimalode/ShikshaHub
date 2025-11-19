import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import './App.css';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ChatBot from './components/ChatBot';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CommunityDetails from './pages/CommunityDetails';
import CreateCommunity from './pages/CreateCommunity';
import Profile from './pages/Profile';
import BlogView from './pages/BlogView';
import BlogEdit from './pages/BlogEdit';
import NotFound from './pages/NotFound';
import BlogCreate from './pages/BlogCreate';
import ResetPassword from './pages/ResetPassword';

// Context
import { useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Show loading spinner while authentication status is being determined
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="app-container d-flex flex-column min-vh-100">
      <Navbar />
      <main className={`flex-grow-1 ${isHomePage ? 'main-full-width' : 'py-4'}`}>
        {isHomePage ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/communities/create" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <CreateCommunity />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/communities/:id" 
              element={
                <ProtectedRoute>
                  <CommunityDetails />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/communities/:communityId/blogs/:blogId" 
              element={
                <ProtectedRoute>
                  <BlogView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/communities/:communityId/blogs/:blogId/edit" 
              element={
                <ProtectedRoute>
                  <BlogEdit />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/communities/:communityId/blogs/create" 
              element={
                <ProtectedRoute>
                  <BlogCreate />
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        ) : (
          <Container>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/communities/create" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <CreateCommunity />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/communities/:id" 
                element={
                  <ProtectedRoute>
                    <CommunityDetails />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/communities/:communityId/blogs/:blogId" 
                element={
                  <ProtectedRoute>
                    <BlogView />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/communities/:communityId/blogs/:blogId/edit" 
                element={
                  <ProtectedRoute>
                    <BlogEdit />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/communities/:communityId/blogs/create" 
                element={
                  <ProtectedRoute>
                    <BlogCreate />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Container>
        )}
      </main>
      {isHomePage ? (
        <Footer />
      ) : (
        <footer style={{ textAlign: 'center', fontSize: '0.8em', color: '#999', padding: '10px' }}>
          © 2025 ShikshaHub. All rights reserved.
        </footer>
      )}
      <ChatBot />
    </div>
  );
}

export default App; 