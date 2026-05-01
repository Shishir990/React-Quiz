const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Temporary debug logger
app.use((req, res, next) => {
  console.log(`\n📥 ${req.method} ${req.url}`);
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    console.log(`📤 Response:`, JSON.stringify(body));
    return originalJson(body);
  };
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'QuizApp API is running ✅' });
});

app.use('/api/auth',       require('./Routes/authRoutes'));
app.use('/api/categories', require('./Routes/categoryRoutes'));
app.use('/api/questions',  require('./Routes/questionRoutes'));
app.use('/api/quizzes',    require('./Routes/quizRoutes'));
app.use('/api/results',    require('./Routes/resultRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', status: 404 });
});

// 🔴 Global error handler — must have 4 params
app.use((err, req, res, next) => {
  console.error('🔴 Global error:', err.stack);
  res.status(500).json({ message: err.message });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 8080} ✅`);
});