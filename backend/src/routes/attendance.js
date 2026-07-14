const express = require('express');
const { Op } = require('sequelize');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/attendance/session - Tutor or Admin starts a session with a countdown timer
router.post('/session', authenticateToken, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
  try {
    const { AttendanceSession } = req.app.locals.db;
    const { durationMinutes, courseName } = req.body;

    if (!durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ message: 'Valid duration in minutes is required' });
    }
    if (!courseName) {
      return res.status(400).json({ message: 'Course selection is required to launch attendance' });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    await AttendanceSession.destroy({
      where: { expiresAt: { [Op.gt]: new Date() } }
    });

    const session = await AttendanceSession.create({
      tutorId: req.user.id,
      durationMinutes,
      expiresAt,
      courseName
    });

    res.status(201).json({
      message: `Attendance timer set for ${durationMinutes} minutes.`,
      session
    });

  } catch (error) {
    console.error('Create attendance session error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/attendance/active - Retrieve current active attendance session
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const { AttendanceSession, AttendanceRecord, User, Payment } = req.app.locals.db;
    const now = new Date();

    const session = await AttendanceSession.findOne({
      where: { expiresAt: { [Op.gt]: now } },
      include: [{ model: User, as: 'tutor', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    if (!session) {
      return res.json({ active: false });
    }

    let hasMarked = false;
    if (req.user.role === 'STUDENT') {
      const currentMonth = now.toISOString().substring(0, 7);

      const activePayment = await Payment.findOne({
        where: {
          studentId: req.user.id,
          sessionMonth: currentMonth,
          courseName: session.courseName,
          status: 'APPROVED'
        }
      });

      if (!activePayment) {
        return res.json({ active: false });
      }

      const record = await AttendanceRecord.findOne({
        where: { sessionId: session.id, studentId: req.user.id }
      });
      hasMarked = !!record;
    }

    res.json({
      active: true,
      session,
      hasMarked,
      secondsRemaining: Math.max(0, Math.floor((new Date(session.expiresAt) - now) / 1000))
    });

  } catch (error) {
    console.error('Fetch active attendance session error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/attendance/mark - Student marks their attendance
router.post('/mark', authenticateToken, requireRole(['STUDENT']), async (req, res) => {
  try {
    const { AttendanceSession, AttendanceRecord, Payment } = req.app.locals.db;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const session = await AttendanceSession.findByPk(sessionId);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Attendance window has closed' });
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const activePayment = await Payment.findOne({
      where: {
        studentId: req.user.id,
        sessionMonth: currentMonth,
        courseName: session.courseName,
        status: 'APPROVED'
      }
    });

    if (!activePayment) {
      return res.status(403).json({
        message: `Access denied: Please complete your subscription payment for course "${session.courseName || 'General Arena'}" to mark attendance.`
      });
    }

    const existingRecord = await AttendanceRecord.findOne({
      where: { sessionId, studentId: req.user.id }
    });

    if (existingRecord) {
      return res.status(400).json({ message: 'You have already marked attendance for this session' });
    }

    const record = await AttendanceRecord.create({
      studentId: req.user.id,
      sessionId
    });

    res.status(201).json({ message: 'Attendance marked successfully', record });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/attendance/history - Fetch student check-ins or live list for Tutors
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { AttendanceRecord, AttendanceSession, User } = req.app.locals.db;

    if (req.user.role === 'STUDENT') {
      const records = await AttendanceRecord.findAll({
        where: { studentId: req.user.id },
        include: [{
          model: AttendanceSession,
          as: 'session',
          include: [{ model: User, as: 'tutor', attributes: ['name'] }]
        }],
        order: [['markedAt', 'DESC']]
      });
      return res.json(records);
    }

    const records = await AttendanceRecord.findAll({
      include: [
        { model: User, as: 'student', attributes: ['name', 'email'] },
        { model: AttendanceSession, as: 'session' }
      ],
      order: [['markedAt', 'DESC']]
    });
    res.json(records);

  } catch (error) {
    console.error('Fetch attendance logs error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
