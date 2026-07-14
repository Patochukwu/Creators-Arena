import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Clock, Users, ShieldAlert } from 'lucide-react';

const slides = [
  {
    image: '/slide1.png',
    title: 'Video Editing & Content Creation',
    description: 'Master video timeline editing, audio engineering, lighting setups, and high-impact storytelling.'
  },
  {
    image: '/slide2.png',
    title: 'Basic Frontend Development',
    description: 'Build web applications using HTML, CSS, JavaScript layouts, and modern component frameworks.'
  },
  {
    image: '/slide3.png',
    title: 'Cloud Computing & Infrastructure',
    description: 'Configure virtualization, deploy container networks, and scale systems on AWS.'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Slide transition logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
      
      {/* Slideshow Hero Section */}
      <section style={{ marginBottom: '4rem', marginTop: '-2rem' }}>
        <div className="slideshow-container" style={{ borderRadius: '0', border: 'none' }}>
          {slides.map((slide, index) => (
            <div 
              key={index} 
              className={`slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img src={slide.image} alt={slide.title} className="slide-img" />
              <div className="slide-content">
                <h1 className="slide-title">{slide.title}</h1>
                <p className="slide-description">{slide.description}</p>
              </div>
            </div>
          ))}
          <div className="slideshow-dots">
            {slides.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        {/* Main Pitch */}
        <section style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img 
          src="/favicon.png" 
          alt="Creators Tutorial Arena Logo" 
          style={{ width: '80px', height: '80px', marginBottom: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px 0 rgba(11, 150, 138, 0.25)' }} 
        />
        <h2 className="gradient-text home-pitch-title">
          Creators Tutorial Arena
        </h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto 2.5rem' }}>
          A premium space designed for creators, learners, and technical innovators. Enhance your knowledge base, record live attendance, and sync with professional mentors.
        </p>

        <div className="flex-center" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn btn-primary">
            <span>Get Started Now</span>
            <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('/login')} className="btn btn-secondary">
            <span>Access Dashboard</span>
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ marginBottom: '5rem' }}>
        <div className="grid-cols-3">
          
          <div className="glass-card">
            <div className="flex-center" style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', color: 'var(--text-bright)' }}>Dual Registrations</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Customized learning paths and workspace panels built specifically for Students and professional Tutors.
            </p>
          </div>

          <div className="glass-card">
            <div className="flex-center" style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
              <Clock size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', color: 'var(--text-bright)' }}>Attendance Forms</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Tutors can launch active attendance forms with countdown timers for students to check-in securely during sessions.
            </p>
          </div>

          <div className="glass-card">
            <div className="flex-center" style={{ width: '50px', height: '50px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', marginBottom: '1.5rem' }}>
              <ShieldAlert size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', color: 'var(--text-bright)' }}>Admin Payment Sync</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Structured backend validation process where student subscription payments are reviewed and approved by administrators.
            </p>
          </div>

        </div>
      </section>

      {/* Info Banner */}
      <section className="glass-panel" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)' }}>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-bright)' }}>Join the Arena Today</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Registration is open. Create an account, process your monthly session token, and participate in classroom check-ins.
        </p>
        <button onClick={() => navigate('/register')} className="btn btn-accent">
          <span>Create Account</span>
        </button>
      </section>

      </div>
    </div>
  );
}
