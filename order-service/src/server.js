require('dotenv').config();

const express = require('express');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

app.use(express.json());
app.use('/orders', orderRoutes);

app.get('/', (req, res) => {
    res.send('Order Management Service is running!');
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Order Service running at http://localhost:${PORT}`);
});
