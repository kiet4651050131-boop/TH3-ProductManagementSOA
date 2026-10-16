
require('dotenv').config();

const express = require('express');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(express.json());

// API quan ly san pham
app.use('/products', productRoutes);

// Kiem tra dich vu
app.get('/', (req, res) => {
    res.send('Product Management Service is running!');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Product Service running at http://localhost:${PORT}`);
});
