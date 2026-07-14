import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { User, Mail, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function AuthPages({ isRegister: initialIsRegister, isResetPassword = false }) {
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [role, setRole] = useState('STUDENT'); // STUDENT, TUTOR
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5005/api' : '/api');

    // 1. Password reset flow
    if (isResetPassword) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const token = query.get('token');

      if (!token) {
        setError('Invalid action: Reset token is missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Reset password request failed.');

        setSuccessMsg('Your password has been reset successfully!');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Forgot password request flow
    if (isForgotPassword) {
      try {
        const response = await fetch(`${apiUrl}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Password reset request failed.');

        setSuccessMsg(data.message || 'Reset link sent! Please check your email inbox.');
        setEmail('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3. User Sign Up registration flow
    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed.');

        setSuccessMsg('Registration successful! Check your email for confirmation.');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsRegister(false);
          setSuccessMsg('');
        }, 2500);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 4. Normal login flow
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid email or password.');

      login(data.token, data.user);
      
      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else if (data.user.role === 'TUTOR') {
        navigate('/tutor');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-panel modal-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        
        {/* Tab Headers (Only show on normal login/signup screen) */}
        {!isResetPassword && !isForgotPassword && (
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '2rem' }}>
            <button 
              className="btn" 
              style={{ 
                flex: 1, 
                background: 'none', 
                color: !isRegister ? 'var(--color-accent)' : 'var(--text-muted)',
                borderBottom: !isRegister ? '2px solid var(--color-accent)' : 'none',
                borderRadius: '0',
                padding: '1rem 0'
              }}
              onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button 
              className="btn" 
              style={{ 
                flex: 1, 
                background: 'none', 
                color: isRegister ? 'var(--color-accent)' : 'var(--text-muted)',
                borderBottom: isRegister ? '2px solid var(--color-accent)' : 'none',
                borderRadius: '0',
                padding: '1rem 0'
              }}
              onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-bright)' }}>
          {isResetPassword ? 'Reset Your Password' : 
           isForgotPassword ? 'Recover Password Access' :
           isRegister ? 'Join the Tutorial Arena' : 'Sign In to Your Workspace'}
        </h2>

        {error && (
          <div className="glass-card" style={{ color: 'var(--color-danger)', borderLeft: '4px solid var(--color-danger)', marginBottom: '1.5rem', padding: '0.8rem 1rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="glass-card" style={{ color: 'var(--color-success)', borderLeft: '4px solid var(--color-success)', marginBottom: '1.5rem', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* RESET PASSWORD PAGE CONTENT */}
          {isResetPassword && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="newPasscode">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="newPasscode"
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="confirmPasscode">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPasscode"
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* FORGOT PASSWORD PAGE CONTENT */}
          {isForgotPassword && !isResetPassword && (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" htmlFor="recoveryEmail">Registered Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  id="recoveryEmail"
                  className="glass-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                We'll email you a unique single-use password reset link.
              </p>
            </div>
          )}

          {/* NORMAL LOGIN / REGISTER PAGE CONTENT */}
          {!isResetPassword && !isForgotPassword && (
            <>
              {isRegister && (
                <>
                  {/* Role Toggle Selector */}
                  <div className="form-group">
                    <label className="form-label">Register As</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        type="button"
                        className={`btn ${role === 'STUDENT' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.6rem 0' }}
                        onClick={() => setRole('STUDENT')}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        className={`btn ${role === 'TUTOR' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.6rem 0' }}
                        onClick={() => setRole('TUTOR')}
                      >
                        Tutor
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="fullName">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        id="fullName"
                        className="glass-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="emailAddress">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    id="emailAddress"
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="passcode" style={{ margin: 0 }}>Password</label>
                  {!isRegister && (
                    <span 
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                      style={{ fontSize: '0.85rem', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Forgot Password?
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="passcode"
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {isRegister && (
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label" htmlFor="confirmPasscode">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPasscode"
                      className="glass-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <span 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem 0', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 
             isResetPassword ? 'Update Password' : 
             isForgotPassword ? 'Send Recovery Link' : 
             isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        {/* Back Link Triggers */}
        {isResetPassword && (
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            Remembered password?{' '}
            <span 
              style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </span>
          </p>
        )}

        {isForgotPassword && !isResetPassword && (
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            Back to{' '}
            <span 
              style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </span>
          </p>
        )}

        {!isResetPassword && !isForgotPassword && !isRegister && (
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <span 
              style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }}
            >
              Sign Up
            </span>
          </p>
        )}
        
        {!isResetPassword && !isForgotPassword && isRegister && (
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            Already have an account?{' '}
            <span 
              style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); }}
            >
              Sign In
            </span>
          </p>
        )}

      </div>
    </div>
  );
}
