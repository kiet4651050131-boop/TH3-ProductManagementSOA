
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Dang ky tai khoan
router.post('/register', async (req, res) => {
    try {
        const { userName, password } = req.body;

        if (!userName || !password) {
            return res.status(400).json({
                message: 'Vui long nhap tai khoan va mat khau'
            });
        }

        const [rows] = await pool.query(
            'SELECT IdUser FROM Users WHERE UserName = ?',
            [userName]
        );

        if (rows.length > 0) {
            return res.status(409).json({
                message: 'Tai khoan da ton tai'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO Users (UserName, Password) VALUES (?, ?)',
            [userName, hashedPassword]
        );

        return res.status(201).json({
            message: 'Dang ky thanh cong'
        });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
        message: 'Loi server',
        detail: error.message,
        code: error.code
    });
}
});

// Dang nhap va tao JWT
router.post('/login', async (req, res) => {
    try {
        const { userName, password } = req.body;

        if (!userName || !password) {
            return res.status(400).json({
                message: 'Vui long nhap tai khoan va mat khau'
            });
        }

        const [rows] = await pool.query(
            'SELECT * FROM Users WHERE UserName = ?',
            [userName]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: 'Sai tai khoan hoac mat khau'
            });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.Password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: 'Sai tai khoan hoac mat khau'
            });
        }

        const token = jwt.sign(
            {
                id: user.IdUser,
                userName: user.UserName
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        await pool.query(
            'UPDATE Users SET Token = ? WHERE IdUser = ?',
            [token, user.IdUser]
        );

        return res.json({
            message: 'Dang nhap thanh cong',
            token: token,
            tokenType: 'Bearer'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Loi server'
        });
    }
});

// Dang xuat
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await pool.query(
            'UPDATE Users SET Token = NULL WHERE IdUser = ?',
            [req.user.id]
        );

        return res.json({
            message: 'Dang xuat thanh cong'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Loi server'
        });
    }
});

// Xac thuc JWT
router.get('/auth', authMiddleware, (req, res) => {
    res.json({
        message: 'Token hop le',
        user: req.user
    });
});

module.exports = router;
