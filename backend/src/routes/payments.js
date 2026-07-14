const express = require('express');
const modelsModule = require('../models');
const models = modelsModule.User ? modelsModule : (modelsModule.default || modelsModule);
const { Payment, User, Setting, Course } = models;
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

// POST /api/payments/pay - Student submits payment simulation
router.post('/pay', authenticateToken, requireRole(['STUDENT']), async (req, res) => {
  try {
    const { sessionMonth, transactionReference, courseName } = req.body;

    if (!sessionMonth) {
      return res.status(400).json({ message: 'Session month is required (YYYY-MM)' });
    }
    if (!courseName) {
      return res.status(400).json({ message: 'Course selection is required' });
    }

    // Get current course price from Course model
    const course = await Course.findOne({ where: { name: courseName } });
    if (!course) {
      return res.status(404).json({ message: `Selected course "${courseName}" not found.` });
    }
    const amount = course.price;

    // Check if there is already a PENDING or APPROVED payment for this month and course by the student
    const existingPayment = await Payment.findOne({
      where: {
        studentId: req.user.id,
        sessionMonth,
        courseName,
      }
    });

    if (existingPayment) {
      if (existingPayment.status === 'APPROVED') {
        return res.status(400).json({ message: `You are already approved for the ${courseName} course in ${sessionMonth}.` });
      }
      if (existingPayment.status === 'PENDING') {
        return res.status(400).json({ message: `You have a pending approval request for the ${courseName} course in ${sessionMonth}.` });
      }
    }

    const payment = await Payment.create({
      studentId: req.user.id,
      amount,
      sessionMonth,
      courseName,
      transactionReference: transactionReference || `REF-${Date.now()}`,
      status: 'PENDING'
    });

    res.status(201).json({
      message: 'Payment details submitted successfully. Awaiting Admin verification.',
      payment
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/payments/my-payments - Student fetches their transaction logs
router.get('/my-payments', authenticateToken, requireRole(['STUDENT']), async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { studentId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    console.error('Fetch student payments error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/payments/all - Admin fetches all payments
router.get('/all', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [{ model: User, as: 'student', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    console.error('Fetch all payments error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/payments/approve/:id - Admin approves a payment
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [{ model: User, as: 'student', attributes: ['name', 'email'] }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ message: `Payment is already ${payment.status.toLowerCase()}` });
    }

    payment.status = 'APPROVED';
    payment.approvedAt = new Date();
    await payment.save();

    // Trigger confirmation email
    const emailSubject = 'Payment Confirmation - Creators Tutorial Arena';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10b981; text-align: center;">Payment Approved!</h2>
        <p>Dear ${payment.student.name},</p>
        <p>We are pleased to inform you that your payment of <strong>$${payment.amount}</strong> for the <strong>${payment.courseName}</strong> course during the <strong>${payment.sessionMonth}</strong> session has been verified and approved.</p>
        <p>You now have full access to the tutorial sessions and dashboard resources for this course.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">
          If you have any questions, please reply to this email or reach out to our admin team.
        </p>
      </div>
    `;

    // Await email dispatch so Vercel does not terminate before completion
    await sendEmail({
      to: payment.student.email,
      subject: emailSubject,
      html: emailHtml
    });

    res.json({ message: 'Payment approved successfully', payment });

  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/payments/reject/:id - Admin rejects a payment
router.post('/reject/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ message: `Payment is already ${payment.status.toLowerCase()}` });
    }

    payment.status = 'REJECTED';
    await payment.save();

    res.json({ message: 'Payment rejected successfully', payment });

  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
