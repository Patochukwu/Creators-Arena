import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { CreditCard, Calendar, Clock, CheckCircle, AlertTriangle, List, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [currentFee, setCurrentFee] = useState(50);
  const [activeSession, setActiveSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Modal & Form State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 9010');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    // Set default month to current month (YYYY-MM)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);

    fetchData();
    fetchActiveAttendance();
    
    // Poll for active attendance every 10 seconds
    const pollInterval = setInterval(() => {
      fetchActiveAttendance();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Sync countdown timer local countdown
  useEffect(() => {
    if (timerSeconds > 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            fetchActiveAttendance(); // re-fetch to update state
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

  const fetchData = async () => {
    try {
      // 1. Fetch fee
      const feeRes = await fetch(`${API_URL}/settings/fee`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (feeRes.ok) {
        const feeData = await feeRes.json();
        setCurrentFee(feeData.monthlyFee);
      }

      // 2. Fetch payments
      const payRes = await fetch(`${API_URL}/payments/my-payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData);
      }

      // 3. Fetch attendance history
      const attRes = await fetch(`${API_URL}/attendance/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendanceHistory(attData);
      }
      // Fetch active courses list
      const courseRes = await fetch(`${API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourses(courseData);
        if (courseData.length > 0) {
          setSelectedCourse(courseData[0].name);
        }
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const fetchActiveAttendance = async () => {
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
    } catch (error) {
      console.error('Error fetching active attendance session:', error);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setPayError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/payments/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionMonth: selectedMonth,
          courseName: selectedCourse,
          transactionReference: `SIM-${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment simulation failed.');
      }

      // Celebratory animation
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setPaySuccess(true);
      fetchData(); // refresh payments logs
      setTimeout(() => {
        setShowPayModal(false);
        setPaySuccess(false);
      }, 2000);

    } catch (err) {
      setPayError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`${API_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: activeSession.session.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to mark attendance.');
        return;
      }

      // Success
      confetti({
        particleCount: 50,
        colors: ['#10b981', '#06b6d4']
      });

      fetchActiveAttendance(); // update active widget state
      fetchData(); // reload history

    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  };

  // Determine current subscription status for this month
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthPayment = payments.find(p => p.sessionMonth === currentMonthStr);
  
  let subscriptionBadge = (
    <span className="badge badge-rejected">Unpaid ({currentMonthStr})</span>
  );
  let isSubscriptionActive = false;

  if (currentMonthPayment) {
    if (currentMonthPayment.status === 'APPROVED') {
      subscriptionBadge = <span className="badge badge-approved">Active Subscription</span>;
      isSubscriptionActive = true;
    } else if (currentMonthPayment.status === 'PENDING') {
      subscriptionBadge = <span className="badge badge-pending">Payment Pending Approval</span>;
    } else {
      subscriptionBadge = <span className="badge badge-rejected">Payment Rejected</span>;
    }
  }

  // Format timer seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Welcome Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--text-bright)' }}>Welcome back, <span className="gradient-text">{user?.name}</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Student Workspace Dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</p>
            <div>{subscriptionBadge}</div>
          </div>
          {!isSubscriptionActive && !payments.some(p => p.sessionMonth === currentMonthStr && p.status === 'PENDING') && (
            <button onClick={() => setShowPayModal(true)} className="btn btn-primary">
              <CreditCard size={18} />
              <span>Join Tutorial</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid-cols-2" style={{ gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Interactive Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Attendance Form Card */}
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ color: 'var(--color-warning)' }} />
              <span>Live Attendance Portal</span>
            </h3>

            {activeSession ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-approved" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                    Course: {activeSession.session?.courseName || 'General Arena'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                  Active attendance session started by <strong>{activeSession.session?.tutor?.name || 'Tutor'}</strong>
                </p>

                {/* Animated countdown display */}
                <div className="timer-circle">
                  <span className="timer-time">{formatTime(timerSeconds)}</span>
                  <span className="timer-label">Remaining</span>
                </div>

                {activeSession.hasMarked ? (
                  <div className="flex-center" style={{ color: 'var(--color-success)', gap: '0.5rem', fontWeight: 600, fontSize: '1.1rem' }}>
                    <CheckCircle size={24} />
                    <span>Attendance Marked Successfully</span>
                  </div>
                ) : (
                  <div>
                    {isSubscriptionActive ? (
                      <button 
                        onClick={handleMarkAttendance} 
                        className="btn btn-accent" 
                        style={{ width: '100%', maxWidth: '280px', margin: '0 auto' }}
                      >
                        <Check size={18} />
                        <span>Check In Now</span>
                      </button>
                    ) : (
                      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)', padding: '0.8rem 1rem', maxWidth: '350px', margin: '0 auto' }}>
                        <AlertTriangle size={18} />
                        <span style={{ fontSize: '0.9rem' }}>Please make payment to mark attendance.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No active attendance forms at this time.</p>
                <p style={{ fontSize: '0.85rem' }}>Tutors launch these forms during live tutorials.</p>
              </div>
            )}
          </div>

          {/* Tutorial Info Card */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-bright)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar style={{ color: 'var(--color-primary)' }} />
              <span>Stipulated Session Rates</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Access to all study rooms, developer resources, and tutor guides is renewed monthly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Standard Rate</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-bright)' }}>${currentFee}/month</p>
              </div>
              <span className="badge badge-approved">Adjustable by Admin</span>
            </div>
          </div>

        </div>

        {/* Right Column: logs history logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Payment Logs */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard style={{ color: 'var(--color-primary)' }} />
              <span>Payment Records</span>
            </h3>
            {payments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No payment records found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {payments.map((p) => (
                  <div key={p.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{p.courseName || 'Arena Session'} Subscription</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Month: {p.sessionMonth} | Ref: {p.transactionReference}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-bright)' }}>${p.amount}</p>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance History */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List style={{ color: 'var(--color-accent)' }} />
              <span>Attendance History</span>
            </h3>
            {attendanceHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No check-in history found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {attendanceHistory.map((h) => (
                  <div key={h.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-bright)' }}>Check-in Logged</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Session Tutor: {h.session?.tutor?.name || 'Tutor'}
                      </p>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 500 }}>
                      {new Date(h.markedAt).toLocaleDateString()} {new Date(h.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Payment simulation Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-bright)', marginBottom: '1.5rem', textAlign: 'center' }}>
              Simulation Checkout
            </h3>

            {paySuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle size={60} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.2rem', color: 'var(--text-bright)' }}>Payment Request Sent!</h4>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Awaiting Admin approval & email verification.</p>
              </div>
            ) : (
              <form onSubmit={handlePaySubmit}>
                {payError && (
                  <div className="glass-card" style={{ color: 'var(--color-danger)', borderLeft: '4px solid var(--color-danger)', marginBottom: '1rem', padding: '0.5rem 1rem' }}>
                    {payError}
                  </div>
                )}
                
                {(() => {
                  const selectedCourseObj = courses.find(c => c.name === selectedCourse);
                  const currentCoursePrice = selectedCourseObj ? parseFloat(selectedCourseObj.price) : 0;
                  return (
                    <>
                      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Amount to Request</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>${currentCoursePrice.toFixed(2)}</p>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="courseSelect">Select Course</label>
                        <select
                          id="courseSelect"
                          className="glass-input"
                          value={selectedCourse}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          required
                        >
                          {courses.map(c => (
                            <option key={c.id} value={c.name}>{c.name} (${parseFloat(c.price).toFixed(2)})</option>
                          ))}
                        </select>
                      </div>
                    </>
                  );
                })()}

                <div className="form-group">
                  <label className="form-label" htmlFor="billingMonth">Subscription Month</label>
                  <input
                    type="month"
                    id="billingMonth"
                    className="glass-input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cardholder">Cardholder Name</label>
                  <input
                    type="text"
                    id="cardholder"
                    className="glass-input"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label" htmlFor="cardNum">Card Number (Mock Sandbox)</label>
                  <input
                    type="text"
                    id="cardNum"
                    className="glass-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }} 
                    onClick={() => setShowPayModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Pay Simulation'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
