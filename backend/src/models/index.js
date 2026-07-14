const { DataTypes } = require('sequelize');
const db = require('../config/db');
const sequelize = db.sequelize || db.default?.sequelize || db.default || db;

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('STUDENT', 'TUTOR', 'ADMIN'),
    defaultValue: 'STUDENT',
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // Auto-approve accounts, payments are approved separately
  }
});

// Payment Model
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  sessionMonth: {
    type: DataTypes.STRING, // format: "YYYY-MM" e.g., "2026-07"
    allowNull: false,
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

// Setting Model (for Admin configurations)
const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

// AttendanceSession Model
const AttendanceSession = sequelize.define('AttendanceSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

// AttendanceRecord Model
const AttendanceRecord = sequelize.define('AttendanceRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  markedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

// Course Model
const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 50.00,
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

// Associations
User.hasMany(Payment, { foreignKey: 'studentId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

User.hasMany(AttendanceSession, { foreignKey: 'tutorId', as: 'sessions' });
AttendanceSession.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });

AttendanceSession.hasMany(AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
AttendanceRecord.belongsTo(AttendanceSession, { foreignKey: 'sessionId', as: 'session' });

User.hasMany(AttendanceRecord, { foreignKey: 'studentId', as: 'attendance' });
AttendanceRecord.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

module.exports = {
  sequelize,
  User,
  Payment,
  Setting,
  AttendanceSession,
  AttendanceRecord,
  Course
};
