const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let sequelize = require('./config/db');
if (sequelize.default) {
  sequelize = sequelize.default;
}
const { User, Setting, Course } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const settingsRoutes = require('./routes/settings');
const coursesRoutes = require('./routes/courses');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/courses', coursesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Database sync and server initialization (only run locally - Vercel resolves connections lazily)
if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      // Authenticate database connection
      await sequelize.authenticate();
      console.log('[DB] Connection to PostgreSQL established successfully.');

      // Sync models (creates tables if they don't exist)
      await sequelize.sync({ alter: true });
      console.log('[DB] Database synchronized successfully.');

      // Seed default Admin User if it does not exist
      const adminEmail = 'creatorstutorialinsight@gmail.com';
      const adminExists = await User.findOne({ where: { email: adminEmail } });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('adminpassword', salt);
        await User.create({
          name: 'Arena Admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN'
        });
        console.log(`[Seed] Default Admin created: ${adminEmail} (password: adminpassword)`);
      }

      // Seed default Tutor User if it does not exist
      const tutorEmail = 'tutor@arena.com';
      const tutorExists = await User.findOne({ where: { email: tutorEmail } });
      if (!tutorExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('tutorpassword', salt);
        await User.create({
          name: 'Dr. Tutor',
          email: tutorEmail,
          password: hashedPassword,
          role: 'TUTOR'
        });
        console.log(`[Seed] Default Tutor created: ${tutorEmail} (password: tutorpassword)`);
      }

      // Seed default fee setting
      const feeSetting = await Setting.findOne({ where: { key: 'monthly_fee' } });
      if (!feeSetting) {
        await Setting.create({ key: 'monthly_fee', value: '50.00' });
        console.log('[Seed] Default subscription fee set to $50.00');
      }

      // Seed default courses
      const defaultCourses = [
        {
          name: 'Video Editing & Content Creation',
          price: 60.00,
          description: 'Master video timeline editing, audio engineering, and digital content creation.'
        },
        {
          name: 'Basic Frontend Development',
          price: 50.00,
          description: 'Build web applications using HTML, CSS, JavaScript layouts, and React components.'
        },
        {
          name: 'Cloud Computing & Infrastructure',
          price: 80.00,
          description: 'Configure virtualizations, deploy container networks, and scale systems on AWS.'
        }
      ];

      for (const c of defaultCourses) {
        const exists = await Course.findOne({ where: { name: c.name } });
        if (!exists) {
          await Course.create(c);
          console.log(`[Seed] Course initialized: ${c.name} (Price: $${c.price})`);
        }
      }

      // Start listening
      app.listen(PORT, () => {
        console.log(`[Server] Server is running on port ${PORT}`);
      });

    } catch (error) {
      console.error('[DB] Database sync failed or server startup aborted:', error);
      process.exit(1);
    }
  };

  startServer();
} else {
  console.log('[Server] Loaded backend as Vercel serverless function (bypassing startup sync and port listener).');
}

module.exports = app;
