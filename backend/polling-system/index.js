const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { closeExpiredQuestions } = require('./utils/timing');

// Routes
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// --- ROBUST CORS CONFIGURATION ---
// This list contains all the URLs that are allowed to connect to your backend.
const allowedOrigins = [
  process.env.CORS_ORIGIN, // This will be your Vercel URL from Render's Environment Variables
  'http://localhost:5173'  // This is for your local development environment
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // If the origin is in our allowed list, allow it.
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};
// --- END OF CORS CONFIGURATION ---

// Socket.io setup with the new, secure CORS options
const { Server } = require('socket.io');
const io = new Server(server, { cors: corsOptions });
app.set('io', io); // Make io accessible in routes/controllers if needed

// Connect to MongoDB
connectDB();

// Periodic timer to close expired questions
setInterval(() => closeExpiredQuestions(app), 10000); // every 10 seconds

// Use the CORS options for all Express API routes
app.use(cors(corsOptions));
app.use(bodyParser.json());

// API routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Polling System API!');
});

// Import models needed for socket logic
const Poll = require('./models/Poll');
const Answer = require('./models/Answer');
const Question = require('./models/Question');

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('submitAnswer', async (data) => {
    try {
      const { studentId, option, pollId } = data;
      
      const question = await Question.findOne({ poll: pollId, isActive: true });
      if (!question) {
        console.error(`Socket Error: No active question found for poll ${pollId}`);
        return; 
      }
      
      const newAnswer = new Answer({
        student: studentId,
        question: question._id,
        answer: option,
      });
      await newAnswer.save();
      
      const pollResults = await Answer.aggregate([
        { $match: { question: question._id } },
        { $group: { _id: '$answer', count: { $sum: 1 } } },
        { $project: { _id: 0, option: '$_id', count: '$count' } }
      ]);

      const totalVotes = pollResults.reduce((sum, current) => sum + current.count, 0);

      const finalPayload = {
        question: question.question,
        options: question.options,
        results: pollResults,
        totalVotes: totalVotes,
        pollId: question.poll
      };

      io.emit('pollUpdated', finalPayload);

    } catch (err) {
      console.error('Socket submitAnswer error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Final server listen call with the host fix for Render
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});