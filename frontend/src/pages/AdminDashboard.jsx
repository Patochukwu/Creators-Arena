import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { CreditCard, DollarSign, Users, Award, Settings, Check, X, ShieldAlert, Clock, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('payments'); // payments, settings
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeStudentsCount: 0,
    pendingApprovalsCount: 0,
    totalStudents: 0,
    totalTutors: 0,
    totalRecords: 0,
    currentMonth: ''
  });
  const [payments, setPayments] = useState([]);
  const [feeRate, setFeeRate] = useState('');
  const [duration, setDuration] = useState(10);
  const [activeSession, setActiveSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
    price: '',
    isVisible: true
  });
  const [selectedLaunchCourse, setSelectedLaunchCourse] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchPayments();
    fetchFeeRate();
    fetchActiveSession();
    fetchCourses();

    const pollInterval = setInterval(() => {
      fetchStats();
      fetchPayments();
      fetchActiveSession();
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

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/payments/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/courses/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0) {
          setSelectedLaunchCourse(prev => prev || data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleToggleCourseVisibility = async (courseId, currentVisibility) => {
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });
      if (res.ok) {
        fetchCourses();
      } else {
        alert('Failed to update course visibility.');
      }
    } catch (err) {
      console.error('Error toggling course visibility:', err);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const endpoint = editingCourse 
      ? `${API_URL}/courses/${editingCourse}`
      : `${API_URL}/courses`;
    const method = editingCourse ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: courseForm.name,
          description: courseForm.description,
          price: parseFloat(courseForm.price),
          isVisible: courseForm.isVisible
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save course');
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      setCourseForm({ name: '', description: '', price: '', isVisible: true });
      fetchCourses();
      
      confetti({
        particleCount: 50,
        spread: 40,
        colors: ['#0b968a', '#10b981']
      });

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCourses();
      } else {
        alert('Failed to delete course');
      }
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  const fetchFeeRate = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/fee`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeeRate(data.monthlyFee);
      }
    } catch (err) {
      console.error('Error fetching rate settings:', err);
    }
  };

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

  const handleApprovePayment = async (id) => {
    try {
      const res = await fetch(`${API_URL}/payments/approve/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        fetchStats();
        fetchPayments();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Approval failed');
      }
    } catch (err) {
      console.error('Approve payment error:', err);
    }
  };

  const handleRejectPayment = async (id) => {
    if (!confirm('Are you sure you want to reject this payment request?')) return;
    try {
      const res = await fetch(`${API_URL}/payments/reject/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchStats();
        fetchPayments();
      } else {
        alert('Rejection failed');
      }
    } catch (err) {
      console.error('Reject payment error:', err);
    }
  };

  const handleUpdateRateSetting = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/settings/fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monthlyFee: parseFloat(feeRate) })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Monthly fee updated successfully!');
        fetchStats();
        fetchFeeRate();
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update fee rate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchSession = async (e) => {
    e.preventDefault();
    if (duration <= 0) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/attendance/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ durationMinutes: duration, courseName: selectedLaunchCourse })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start session');
      }

      confetti({
        particleCount: 50,
        colors: ['#a855f7', '#06b6d4']
      });

      fetchActiveSession();

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

  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const pastPayments = payments.filter(p => p.status !== 'PENDING');

  return (
    <div className="container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--text-bright)' }}>Admin <span className="gradient-text">Dashboard</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Financial reconciliation and configurations workspace</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.4rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
          >
            Payments & Reconcile
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
          >
            Settings & Attendance
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <section className="grid-cols-3" style={{ marginBottom: '3rem' }}>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div className="flex-center" style={{ width: '55px', height: '55px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Earnings</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div className="flex-center" style={{ width: '55px', height: '55px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Subs ({stats.currentMonth})</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-bright)' }}>{stats.activeStudentsCount}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div className="flex-center" style={{ width: '55px', height: '55px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--color-warning)' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending Approvals</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-bright)' }}>{stats.pendingApprovalsCount}</p>
          </div>
        </div>

      </section>

      {/* Main Content Area based on Active Tab */}
      {activeTab === 'payments' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Pending Approvals */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard style={{ color: 'var(--color-warning)' }} />
              <span>Awaiting Approvals ({pendingPayments.length})</span>
            </h3>

            {pendingPayments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>All clear! No pending payments requests.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '0.8rem 1rem' }}>Student Details</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Billing Month</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Reference</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Amount</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '1rem' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{p.student?.name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.student?.email}</p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{ margin: 0 }}>{p.sessionMonth}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{p.courseName || 'General Arena'}</p>
                        </td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>{p.transactionReference}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-accent)' }}>${p.amount}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleApprovePayment(p.id)} 
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--color-success)', boxShadow: 'none' }}
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button 
                              onClick={() => handleRejectPayment(p.id)} 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past Payments History */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard style={{ color: 'var(--color-primary)' }} />
              <span>Processed Transactions History ({pastPayments.length})</span>
            </h3>

            {pastPayments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No historical logs available.</p>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '0.8rem 1rem' }}>Student</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Billing Month</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Reference</th>
                      <th style={{ padding: '0.8rem 1rem' }}>Amount</th>
                      <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '1rem' }}>
                          <p style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{p.student?.name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.student?.email}</p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{ margin: 0 }}>{p.sessionMonth}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{p.courseName || 'General Arena'}</p>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{p.transactionReference}</td>
                        <td style={{ padding: '1rem' }}>${p.amount}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : (
        <>
          <div className="grid-cols-2" style={{ gap: '2rem' }}>
          
          {/* Settings Section */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings style={{ color: 'var(--color-primary)' }} />
              <span>Subscription Rates Manager</span>
            </h3>

            <form onSubmit={handleUpdateRateSetting}>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="feeInput">Monthly Fee Rate ($ USD)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$</span>
                  <input
                    type="number"
                    id="feeInput"
                    step="0.01"
                    min="0"
                    className="glass-input"
                    value={feeRate}
                    onChange={(e) => setFeeRate(e.target.value)}
                    required
                  />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Updating this value alters the billing rate for any new join requests immediately.
                </p>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem' }}
                disabled={loading}
              >
                <span>Save Rate Configurations</span>
              </button>
            </form>
          </div>

          {/* Attendance Launcher for Admin */}
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ color: 'var(--color-warning)' }} />
              <span>Class Attendance Form Launcher</span>
            </h3>

            <form onSubmit={handleLaunchSession} style={{ marginBottom: '2rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="adminDuration">Timer Duration (Minutes)</label>
                <input
                  type="number"
                  id="adminDuration"
                  min="1"
                  className="glass-input"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="adminCourseSelect">Select Target Course</label>
                <select
                  id="adminCourseSelect"
                  className="glass-input"
                  value={selectedLaunchCourse}
                  onChange={(e) => setSelectedLaunchCourse(e.target.value)}
                  required
                >
                  {courses.length === 0 ? (
                    <option value="" disabled>No active courses configured</option>
                  ) : (
                    courses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  )}
                </select>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Only students with approved subscription payments for this course will see and check in.
                </p>
              </div>

              <button 
                type="submit" 
                className="btn btn-accent" 
                style={{ width: '100%', padding: '1rem' }}
                disabled={loading}
              >
                <Play size={16} />
                <span>{activeSession ? 'Restart Timer' : 'Launch Attendance Form'}</span>
              </button>
            </form>

            {activeSession ? (
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <span className="badge badge-approved" style={{ fontSize: '0.85rem' }}>
                    Course: {activeSession.session?.courseName || 'General Arena'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active Form Timer</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)', margin: '0.5rem 0' }}>
                  {formatTime(timerSeconds)}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
                  Started by: {activeSession.session?.tutor?.name || 'Administrator'}
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                No active attendance forms are running.
              </p>
            )}
          </div>

        </div>

        {/* Course Access Settings Card */}
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Settings style={{ color: 'var(--color-accent)' }} />
                <span>Course CRUD & Access Manager</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem', margin: 0 }}>
                Add new courses, configure pricing, and toggle visibilities for the Student Arena.
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setEditingCourse(null);
                setCourseForm({ name: '', description: '', price: '50.00', isVisible: true });
                setShowCourseModal(true);
              }}
              className="btn btn-accent" 
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
            >
              + Add Course
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No courses configured. Click + Add Course to begin.</p>
            ) : (
              courses.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '1.1rem', margin: 0 }}>{c.name}</p>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(11, 150, 138, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                        ${parseFloat(c.price).toFixed(2)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>{c.description || 'No description provided.'}</p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      onClick={() => handleToggleCourseVisibility(c.id, c.isVisible)}
                      className={`btn ${c.isVisible ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      {c.isVisible ? 'Visible / Active' : 'Hidden / Inactive'}
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingCourse(c.id);
                        setCourseForm({
                          name: c.name,
                          description: c.description || '',
                          price: c.price.toString(),
                          isVisible: c.isVisible
                        });
                        setShowCourseModal(true);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Edit
                    </button>

                    <button 
                      type="button" 
                      onClick={() => handleDeleteCourse(c.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </>
      )}

      {/* Course Add/Edit Modal */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-bright)', marginBottom: '1.5rem', textAlign: 'center' }}>
              {editingCourse ? 'Edit Course Details' : 'Add New Course'}
            </h3>

            <form onSubmit={handleSaveCourse}>
              <div className="form-group">
                <label className="form-label" htmlFor="courseNameInput">Course Name</label>
                <input
                  type="text"
                  id="courseNameInput"
                  className="glass-input"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Video Editing & Content Creation"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="courseDescInput">Course Description</label>
                <textarea
                  id="courseDescInput"
                  className="glass-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Summarize course contents and targets"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="coursePriceInput">Price Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="coursePriceInput"
                  className="glass-input"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                  placeholder="e.g. 50.00"
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <input
                  type="checkbox"
                  id="courseVisibleCheckbox"
                  checked={courseForm.isVisible}
                  onChange={(e) => setCourseForm({ ...courseForm, isVisible: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="courseVisibleCheckbox" style={{ color: 'var(--text-bright)', fontSize: '0.95rem', cursor: 'pointer', margin: 0 }}>
                  Make visible immediately under Join Tutorial
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    setShowCourseModal(false);
                    setEditingCourse(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
