const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coaching_quiz_db';
    await mongoose.connect(uri);
    console.log('MongoDB connected:', mongoose.connection.name);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
