
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { router } = require('./routes/api');
const { seedDatabase } = require('./seed');
const { Project } = require('./models');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', router);

// Handle unknown API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((e) => e.message)
        .join(' ')
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid value for "${err.path}".`
    });
  }

  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    message:
      status === 500
        ? 'Unexpected server error'
        : err.message
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from the .env file');
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB Atlas connected successfully');

    // Seed sample data only if the Project collection is empty
    if (!(await Project.exists({}))) {
      await seedDatabase();
      console.log('Database was empty -> sample case-study data loaded');
    }

    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
