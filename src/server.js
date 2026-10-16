
require('dotenv').config();

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

app.use(express.json());

// Router dang nhap va xac thuc
app.use('/', authRoutes);

// API Hello World duoc bao ve bang JWT
app.get('/hello', authMiddleware, (req, res) => {
    res.send('Hello World');
});

// Kiem tra server
app.get('/', (req, res) => {
    res.send('JWT Authentication API is running!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
