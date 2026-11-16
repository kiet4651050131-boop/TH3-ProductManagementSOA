const mysql = require('mysql2/promise');
require('dotenv').config();

const requiredVariables = [
    'ORDER_DB_HOST',
    'ORDER_DB_USER',
    'ORDER_DB_NAME'
];
const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]
);

if (missingVariables.length > 0) {
    throw new Error(
        `Missing order database configuration: ${missingVariables.join(', ')}`
    );
}

const pool = mysql.createPool({
    host: process.env.ORDER_DB_HOST,
    user: process.env.ORDER_DB_USER,
    password: process.env.ORDER_DB_PASSWORD,
    database: process.env.ORDER_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;
