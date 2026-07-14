import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--glass-border)',
      padding: '3rem 0 1.5rem',
      marginTop: 'auto',
      color: 'var(--text-muted)',
      fontSize: '0.9rem'
    }}>
      <div className="container">
        <div className="grid-cols-3" style={{ gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Logo & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
              <img src="/favicon.png" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Creators Arena</span>
            </Link>
            <p style={{ lineHeight: '1.6' }}>
              A state-of-the-art virtual tutorial arena for content creators, frontend developers, and cloud computing engineers.
            </p>
          </div>

          {/* Useful Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--text-bright)', fontSize: '1.05rem', fontWeight: 600 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
              <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
              <Link to="/register" style={{ color: 'inherit', textDecoration: 'none' }}>Sign Up</Link>
            </div>
          </div>

          {/* Contact Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--text-bright)', fontSize: '1.05rem', fontWeight: 600 }}>Contact Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} style={{ color: 'var(--color-primary)' }} />
                <a href="mailto:creatorstutorialinsight@gmail.com" style={{ color: 'var(--text-bright)', textDecoration: 'none', fontWeight: 500 }}>
                  creatorstutorialinsight@gmail.com
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} style={{ color: 'var(--color-secondary)' }} />
                <span>Global Digital Arena Hub</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
                <span>Secure SSL Checkpoint Verified</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <p>&copy; {new Date().getFullYear()} Creators Tutorial Arena. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
