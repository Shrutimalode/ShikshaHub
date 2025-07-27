import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://shikshahub.vercel.app/api'),
  withCredentials: true, // optional if you use cookies
});

// Add interceptor to attach token
api.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
