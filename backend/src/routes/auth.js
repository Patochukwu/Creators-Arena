const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['STUDENT', 'TUTOR', 'ADMIN'].includes(role.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role.toUpperCase()
    });

    // Send successful registration email
    const emailSubject = 'Welcome to Creators Tutorial Arena!';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to Creators Tutorial Arena!</h2>
        <p>Dear ${name},</p>
        <p>Your registration as a <strong>${role.toUpperCase()}</strong> was successful.</p>
        <p>You can now sign in to your dashboard to manage tutorials, join sessions, and view your records.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">
          If you did not create this account, please contact our support team immediately.
        </p>
      </div>
    `;
    
    // Await email dispatch so Vercel does not terminate before completion
    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/forgot-password - User requests password reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return 200 to prevent user enumeration, but state the message
      return res.json({ message: 'If that email address exists in our database, we have sent a reset link to it.' });
    }

    // Generate token valid for 15 minutes
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/reset-password?token=${token}`;

    // Send reset email
    const emailSubject = 'Password Reset Request - Creators Tutorial Arena';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
        <p>Dear ${user.name},</p>
        <p>We received a request to reset your password for your Creators Tutorial Arena account. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 11px; color: #666; text-align: center; margin-top: 40px;">
          This link will expire in 15 minutes. If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    // Await email dispatch so Vercel does not terminate before completion
    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml
    });

    res.json({ message: 'If that email address exists in our database, we have sent a reset link to it.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/auth/reset-password - User submits new password using token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired password reset link' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now login.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
