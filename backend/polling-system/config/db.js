const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://SwetaKumari2020:Paul2020@url-shortner.mt3zbm1.mongodb.net/SwetaKumari2020', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  // Do not exit the process; just log the error
  }
};

module.exports = connectDB;
