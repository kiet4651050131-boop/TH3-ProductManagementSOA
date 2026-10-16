
const pool = require('../config/database');

// GET /products - Lay danh sach san pham
exports.getAllProducts = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM products ORDER BY id DESC'
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Loi khi lay danh sach san pham'
        });
    }
};

// GET /products/:id - Lay chi tiet san pham
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Khong tim thay san pham'
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Loi khi lay chi tiet san pham'
        });
    }
};

// POST /products - Them san pham
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, quantity } = req.body;

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            price === undefined ||
            quantity === undefined ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(quantity)) ||
            Number(quantity) < 0
        ) {
            return res.status(400).json({
                message: 'Du lieu san pham khong hop le'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO products
            (name, description, price, quantity)
            VALUES (?, ?, ?, ?)`,
            [name.trim(), description || null, price, quantity]
        );

        res.status(201).json({
            message: 'Them san pham thanh cong',
            id: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Loi khi them san pham'
        });
    }
};

// PUT /products/:id - Cap nhat san pham
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, quantity } = req.body;

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            price === undefined ||
            quantity === undefined ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(quantity)) ||
            Number(quantity) < 0
        ) {
            return res.status(400).json({
                message: 'Du lieu san pham khong hop le'
            });
        }

        const [result] = await pool.query(
            `UPDATE products
            SET name = ?, description = ?, price = ?, quantity = ?
            WHERE id = ?`,
            [name.trim(), description || null, price, quantity, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Khong tim thay san pham'
            });
        }

        res.json({
            message: 'Cap nhat san pham thanh cong'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Loi khi cap nhat san pham'
        });
    }
};

// DELETE /products/:id - Xoa san pham
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM products WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Khong tim thay san pham'
            });
        }

        res.json({
            message: 'Xoa san pham thanh cong'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Loi khi xoa san pham'
        });
    }
};
