require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const { Sequelize, DataTypes } = require('sequelize');
// Explicitly require pg so Vercel's bundler (ncc/nft) includes it in the bundle.
// Sequelize loads pg dynamically which bundlers cannot trace — dialectModule fixes this.
const pg = require('pg');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// ─── Database Setup (inline to avoid bundler chunk-cache issues on Vercel) ───
const isProduction = process.env.DB_HOST &&
                     process.env.DB_HOST !== 'localhost' &&
                     process.env.DB_HOST !== '127.0.0.1' &&
                     process.env.DB_HOST !== 'db';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'tutorial_arena',
  process.env.DB_USER || 'tutorial_user',
  process.env.DB_PASSWORD || 'tutorial_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    dialectModule: pg,  // Force bundler to include pg statically
    logging: false,
    dialectOptions: isProduction ? {
      ssl: { require: true, rejectUnauthorized: false }
    } : {},
    pool: isProduction ? {
      max: 2,
      min: 0,
      acquire: 15000,
      idle: 5000
    } : {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ─── Model Definitions ───────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('STUDENT', 'TUTOR', 'ADMIN'), defaultValue: 'STUDENT' },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' },
  sessionMonth: { type: DataTypes.STRING, allowNull: false },
  courseName: { type: DataTypes.STRING, allowNull: true },
  transactionReference: { type: DataTypes.STRING, allowNull: true },
  approvedAt: { type: DataTypes.DATE, allowNull: true }
});

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  value: { type: DataTypes.STRING, allowNull: false }
});

const AttendanceSession = sequelize.define('AttendanceSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  courseName: { type: DataTypes.STRING, allowNull: true }
});

const AttendanceRecord = sequelize.define('AttendanceRecord', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  markedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const Course = sequelize.define('Course', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING, allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 50.00 },
  isVisible: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// ─── Associations ─────────────────────────────────────────────────────────────
User.hasMany(Payment, { foreignKey: 'studentId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(AttendanceSession, { foreignKey: 'tutorId', as: 'sessions' });
AttendanceSession.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });
AttendanceSession.hasMany(AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
AttendanceRecord.belongsTo(AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
User.hasMany(AttendanceRecord, { foreignKey: 'studentId', as: 'attendance' });
AttendanceRecord.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Bundle all models into one object for route injection
const db = { sequelize, User, Payment, Setting, AttendanceSession, AttendanceRecord, Course };

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Make models available to all routes via req.app.locals.db
app.locals.db = db;

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const settingsRoutes = require('./routes/settings');
const coursesRoutes = require('./routes/courses');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/courses', coursesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), isProduction });
});

// ─── Startup (local) / Vercel (serverless) ───────────────────────────────────
if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      await sequelize.authenticate();
      console.log('[DB] PostgreSQL connection established.');
      await sequelize.sync({ alter: true });
      console.log('[DB] Database synchronized.');

      // Seed Admin
      const adminEmail = 'creatorstutorialinsight@gmail.com';
      if (!await User.findOne({ where: { email: adminEmail } })) {
        const salt = await bcrypt.genSalt(10);
        await User.create({ name: 'Arena Admin', email: adminEmail, password: await bcrypt.hash('adminpassword', salt), role: 'ADMIN' });
        console.log(`[Seed] Admin created: ${adminEmail}`);
      }
      // Seed Tutor
      const tutorEmail = 'tutor@arena.com';
      if (!await User.findOne({ where: { email: tutorEmail } })) {
        const salt = await bcrypt.genSalt(10);
        await User.create({ name: 'Dr. Tutor', email: tutorEmail, password: await bcrypt.hash('tutorpassword', salt), role: 'TUTOR' });
        console.log(`[Seed] Tutor created: ${tutorEmail}`);
      }
      // Seed fee
      if (!await Setting.findOne({ where: { key: 'monthly_fee' } })) {
        await Setting.create({ key: 'monthly_fee', value: '50.00' });
        console.log('[Seed] Default fee: $50.00');
      }
      // Seed courses
      const defaultCourses = [
        { name: 'Video Editing & Content Creation', price: 60.00, description: 'Master video timeline editing, audio engineering, and digital content creation.' },
        { name: 'Basic Frontend Development', price: 50.00, description: 'Build web applications using HTML, CSS, JavaScript layouts, and React components.' },
        { name: 'Cloud Computing & Infrastructure', price: 80.00, description: 'Configure virtualizations, deploy container networks, and scale systems on AWS.' }
      ];
      for (const c of defaultCourses) {
        if (!await Course.findOne({ where: { name: c.name } })) {
          await Course.create(c);
          console.log(`[Seed] Course: ${c.name}`);
        }
      }

      app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
    } catch (error) {
      console.error('[DB] Startup failed:', error);
      process.exit(1);
    }
  };
  startServer();
} else {
  console.log('[Server] Loaded backend as Vercel serverless function (DB sync bypassed for low latency).');
}

module.exports = app;
