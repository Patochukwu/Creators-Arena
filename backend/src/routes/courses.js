const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses - Retrieve active visible courses for Student enrollment
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Course } = req.app.locals.db;
    const courses = await Course.findAll({
      where: { isVisible: true },
      order: [['name', 'ASC']]
    });
    res.json(courses);
  } catch (error) {
    console.error('Fetch active courses error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/courses/all - Retrieve all courses for Admin management
router.get('/all', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { Course } = req.app.locals.db;
    const courses = await Course.findAll({ order: [['name', 'ASC']] });
    res.json(courses);
  } catch (error) {
    console.error('Fetch all courses error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/courses - Create a new course (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { Course } = req.app.locals.db;
    const { name, description, price, isVisible } = req.body;

    if (!name || price === undefined || isNaN(price) || parseFloat(price) < 0) {
      return res.status(400).json({ message: 'Valid course name and price are required' });
    }

    const existing = await Course.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'A course with this name already exists' });
    }

    const course = await Course.create({
      name,
      description,
      price: parseFloat(price),
      isVisible: isVisible !== false
    });

    res.status(201).json({ message: 'Course created successfully', course });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// PUT /api/courses/:id - Edit an existing course (Admin only)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { Course } = req.app.locals.db;
    const { id } = req.params;
    const { name, description, price, isVisible } = req.body;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (name) {
      const existing = await Course.findOne({ where: { name } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'A course with this name already exists' });
      }
      course.name = name;
    }
    if (description !== undefined) course.description = description;
    if (price !== undefined) {
      if (isNaN(price) || parseFloat(price) < 0) {
        return res.status(400).json({ message: 'Valid course price is required' });
      }
      course.price = parseFloat(price);
    }
    if (isVisible !== undefined) course.isVisible = !!isVisible;

    await course.save();
    res.json({ message: 'Course updated successfully', course });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// DELETE /api/courses/:id - Delete a course (Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { Course } = req.app.locals.db;
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await course.destroy();
    res.json({ message: 'Course deleted successfully' });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
