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

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io); // Make io accessible in routes/controllers if needed

// Connect to MongoDB
connectDB();

// Periodic timer to close expired questions
setInterval(() => closeExpiredQuestions(app), 10000); // every 10 seconds

app.use(cors());
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

const Poll = require('./models/Poll'); // Make sure you have the Poll model imported

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('submitAnswer', async (data) => {
    // data: { studentId, option, pollId }
    try {
      const { studentId, option, pollId } = data;
      
      const Answer = require('./models/Answer');
      const Question = require('./models/Question');

      const question = await Question.findOne({ poll: pollId, isActive: true });
      if (!question) {
        console.error(`No active question found for poll ${pollId}`);
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
        pollId: question.poll // Including pollId is good practice
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

// ====================================================================
// THIS IS THE ONLY LINE THAT WAS CHANGED FOR THE DEPLOYMENT FIX
// ====================================================================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});