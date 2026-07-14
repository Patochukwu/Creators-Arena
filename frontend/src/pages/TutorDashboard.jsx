import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Clock, Play, Users, CheckCircle, List, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TutorDashboard() {
  const { token } = useAuth();
  const [duration, setDuration] = useState(5);
  const [activeSession, setActiveSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5005/api' : '/api');
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    fetchActiveSession();
    fetchHistory();
    fetchCourses();

    const pollInterval = setInterval(() => {
      fetchActiveSession();
      fetchHistory();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Timer countdown local sync
  useEffect(() => {
    if (timerSeconds > 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            fetchActiveSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerSeconds]);

  const fetchActiveSession = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setActiveSession(data);
          setTimerSeconds(data.secondsRemaining);
        } else {
          setActiveSession(null);
          setTimerSeconds(0);
        }
      }
    } catch (err) {
      console.error('Error fetching active session:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourse(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching courses list:', err);
    }
  };

  const handleLaunchSession = async (e) => {
    e.preventDefault();
    if (duration <= 0) return;
    if (!selectedCourse) {
      alert('You must configure and select an active course to launch attendance.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/attendance/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ durationMinutes: duration, courseName: selectedCourse })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start session');
      }

      confetti({
        particleCount: 80,
        spread: 60,
        colors: ['#f59e0b', '#6366f1']
      });

      fetchActiveSession();
      fetchHistory();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format timer seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  // Filter records belonging to the current active session
  const activeSessionRecords = records.filter(r => r.sessionId === activeSession?.session?.id);

  return (
    <div className="container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.2rem', color: 'var(--text-bright)' }}>Tutor <span className="gradient-text">Console</span></h2>
        <p style={{ color: 'var(--text-muted)' }}>Configure classroom attendance form and live sync logs</p>
      </div>

      <div className="grid-cols-2" style={{ gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Form Setup & Active session status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Form setup */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ color: 'var(--color-primary)' }} />
              <span>Launch Attendance Timer</span>
            </h3>
            
            <form onSubmit={handleLaunchSession}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="timeDuration">Timer Duration (Minutes)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="number"
                    id="timeDuration"
                    min="1"
                    max="60"
                    className="glass-input"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    required
                  />
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>minutes</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="tutorCourseSelect">Select Target Course</label>
                <select
                  id="tutorCourseSelect"
                  className="glass-input"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  required
                >
                  {courses.length === 0 ? (
                    <option value="" disabled>No active courses available</option>
                  ) : (
                    courses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  )}
                </select>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Only students with an approved payment subscription for this course can view/mark check-in.
                </p>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem' }}
                disabled={loading}
              >
                <Play size={16} />
                <span>{activeSession ? 'Restart Timer (Overwrites Active)' : 'Launch Timer'}</span>
              </button>
            </form>
          </div>

          {/* Active status */}
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ color: 'var(--color-warning)' }} />
              <span>Active Attendance Status</span>
            </h3>

            {activeSession ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <span className="badge badge-approved" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    Course: {activeSession.session?.courseName || 'General Arena'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>Form expires in</p>
                <div className="timer-circle">
                  <span className="timer-time">{formatTime(timerSeconds)}</span>
                  <span className="timer-label">Remaining</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tutor</p>
                    <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{activeSession.session?.tutor?.name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attendees</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-success)' }}>
                      {activeSessionRecords.length}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No active session currently running.</p>
                <p style={{ fontSize: '0.85rem' }}>Set a duration above to launch a check-in portal.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Live and History logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Live Check-ins */}
          {activeSession && (
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-success)' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users style={{ color: 'var(--color-success)' }} />
                <span>Live Attendees ({activeSessionRecords.length})</span>
              </h3>
              {activeSessionRecords.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Awaiting check-ins...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {activeSessionRecords.map(r => (
                    <div key={r.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{r.student?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.student?.email}</p>
                      </div>
                      <div className="flex-center" style={{ color: 'var(--color-success)', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 500 }}>
                        <CheckCircle size={16} />
                        <span>{new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* General History Logs */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List style={{ color: 'var(--color-accent)' }} />
              <span>Full Attendance Logs</span>
            </h3>
            {records.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No student check-in history found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                {records.map(r => (
                  <div key={r.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{r.student?.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.student?.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {new Date(r.markedAt).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
