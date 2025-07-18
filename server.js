const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Import Routes
const authRoutes = require('./routes/auth');
const reliefCampRoutes = require('./routes/reliefCamps');
const donationRoutes = require('./routes/donations');

dotenv.config();

const app = express();  // ✅ Initialize app before using it

app.use(cors());
app.use(express.json());

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/relief-camps', reliefCampRoutes);
app.use('/api/donations', donationRoutes);

const PORT = process.env.PORT || 5000;

// MongoDB Connection and Server Start
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((err) => console.error('MongoDB connection error:', err));
