import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

// Create auth context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo).token : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set axios default headers
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser({
            ...res.data,
            id: res.data._id
          });
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('userInfo');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);

      // ✅ Save token and user info together
      localStorage.setItem('userInfo', JSON.stringify(res.data));
      setToken(res.data.token);

      return {
        success: true,
        data: res.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  // Login user
  const login = async (formData) => {
    try {
      const payload = { email: formData.email, password: formData.password };
      console.log('Login attempt:', payload);
      const res = await api.post('/auth/login', payload);
      console.log('Login successful:', res.data);

      // ✅ Save token and user info together
      localStorage.setItem('userInfo', JSON.stringify(res.data));
      setToken(res.data.token);

      return {
        success: true,
        data: res.data
      };
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('userInfo');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        user,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
