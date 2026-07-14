import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { BookOpen, LogOut, LayoutDashboard, UserCheck, ShieldAlert, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'TUTOR') return '/tutor';
    return '/dashboard';
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="logo gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/favicon.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
          <span>Creators Arena</span>
        </Link>
        <nav className="nav-links">
          <button 
            onClick={toggleTheme} 
            className="btn-theme-toggle"
            style={{ 
              padding: '0.5rem', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-bright)',
              cursor: 'pointer',
              transition: 'background-color 0.2s, transform 0.2s'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          
          {user ? (
            <>
              <Link 
                to={getDashboardPath()} 
                className={`nav-link ${['/dashboard', '/tutor', '/admin'].includes(location.pathname) ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {user.role === 'ADMIN' && <ShieldAlert size={16} />}
                  {user.role === 'TUTOR' && <UserCheck size={16} />}
                  {user.role === 'STUDENT' && <LayoutDashboard size={16} />}
                  <span>Dashboard</span>
                </div>
              </Link>
              <div style={{ color: 'var(--text-bright)', fontSize: '0.9rem', fontWeight: 500 }}>
                {user.name} ({user.role})
              </div>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
