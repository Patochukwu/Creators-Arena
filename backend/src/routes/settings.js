const express = require('express');
const { Setting, Payment, User, AttendanceRecord, AttendanceSession } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sequelize } = require('../config/db');

const router = express.Router();

// GET /api/settings/fee - Retrieve current subscription rate
router.get('/fee', authenticateToken, async (req, res) => {
  try {
    let feeSetting = await Setting.findOne({ where: { key: 'monthly_fee' } });
    if (!feeSetting) {
      // Seed default rate
      feeSetting = await Setting.create({ key: 'monthly_fee', value: '50.00' });
    }
    res.json({ monthlyFee: parseFloat(feeSetting.value) });
  } catch (error) {
    console.error('Fetch fee setting error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/settings/fee - Update subscription rate (Admin only)
router.post('/fee', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { monthlyFee } = req.body;

    if (monthlyFee === undefined || isNaN(monthlyFee) || parseFloat(monthlyFee) < 0) {
      return res.status(400).json({ message: 'Valid monthly fee amount is required' });
    }

    let feeSetting = await Setting.findOne({ where: { key: 'monthly_fee' } });
    if (!feeSetting) {
      feeSetting = await Setting.create({ key: 'monthly_fee', value: parseFloat(monthlyFee).toFixed(2) });
    } else {
      feeSetting.value = parseFloat(monthlyFee).toFixed(2);
      await feeSetting.save();
    }

    res.json({ message: 'Monthly fee updated successfully', monthlyFee: parseFloat(feeSetting.value) });
  } catch (error) {
    console.error('Update fee setting error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/settings/stats - Retrieve Admin dashboard analytics
router.get('/stats', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    // 1. Total revenue (sum of APPROVED payments)
    const totalRevenueResult = await Payment.findAll({
      where: { status: 'APPROVED' },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']]
    });
    const totalRevenue = parseFloat(totalRevenueResult[0]?.dataValues?.total || 0);

    // 2. Active students for the current month
    const activeStudentsCount = await Payment.count({
      where: {
        sessionMonth: currentMonth,
        status: 'APPROVED'
      },
      distinct: true,
      col: 'studentId'
    });

    // 3. Pending approvals count
    const pendingApprovalsCount = await Payment.count({
      where: { status: 'PENDING' }
    });

    // 4. Overall user counts
    const totalStudents = await User.count({ where: { role: 'STUDENT' } });
    const totalTutors = await User.count({ where: { role: 'TUTOR' } });

    // 5. Total check-ins logged
    const totalRecords = await AttendanceRecord.count();

    res.json({
      totalRevenue,
      activeStudentsCount,
      pendingApprovalsCount,
      totalStudents,
      totalTutors,
      totalRecords,
      currentMonth
    });

  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/settings/courses - Fetch active status for all courses
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const videoEditing = await Setting.findOne({ where: { key: 'course_video_editing_enabled' } });
    const basicFrontend = await Setting.findOne({ where: { key: 'course_basic_frontend_enabled' } });
    const cloudComputing = await Setting.findOne({ where: { key: 'course_cloud_computing_enabled' } });

    res.json({
      video_editing: videoEditing ? videoEditing.value === 'true' : true,
      basic_frontend: basicFrontend ? basicFrontend.value === 'true' : true,
      cloud_computing: cloudComputing ? cloudComputing.value === 'true' : true,
    });
  } catch (error) {
    console.error('Fetch courses settings error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/settings/courses - Update active status for courses (Admin only)
router.post('/courses', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { video_editing, basic_frontend, cloud_computing } = req.body;

    const updates = [
      { key: 'course_video_editing_enabled', value: video_editing !== false ? 'true' : 'false' },
      { key: 'course_basic_frontend_enabled', value: basic_frontend !== false ? 'true' : 'false' },
      { key: 'course_cloud_computing_enabled', value: cloud_computing !== false ? 'true' : 'false' }
    ];

    for (const u of updates) {
      let setting = await Setting.findOne({ where: { key: u.key } });
      if (!setting) {
        await Setting.create(u);
      } else {
        setting.value = u.value;
        await setting.save();
      }
    }

    res.json({ message: 'Course configurations updated successfully' });
  } catch (error) {
    console.error('Update courses settings error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
