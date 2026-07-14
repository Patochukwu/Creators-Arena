import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const AuthPages = lazy(() => import('./pages/AuthPages'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Auto-fetch profile if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5005/api' : '/api');
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="timer-circle" style={{ animation: 'spin 1.5s linear infinite', borderStyle: 'solid' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Arena...</p>
      </div>
    );
  }

  // Route wrapper restricting roles
  const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();

    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard based on actual role
      if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (user.role === 'TUTOR') return <Navigate to="/tutor" replace />;
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, theme, toggleTheme }}>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, padding: '2rem 0' }}>
            <Suspense fallback={
              <div className="flex-center" style={{ minHeight: '50vh', flexDirection: 'column', gap: '1rem' }}>
                <div className="timer-circle" style={{ animation: 'spin 1.5s linear infinite', borderStyle: 'solid' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Loading section...</p>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<AuthPages isRegister={false} />} />
                <Route path="/register" element={<AuthPages isRegister={true} />} />
                <Route path="/reset-password" element={<AuthPages isResetPassword={true} />} />
                
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tutor" 
                  element={
                    <ProtectedRoute allowedRoles={['TUTOR']}>
                      <TutorDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
