const pool = require('../config/database');
const { validateOrderItems } = require('../services/productService');

const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
];

function parseId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendError(res, error, fallbackMessage) {
    console.error(error);
    const response = { message: error.message || fallbackMessage };
    if (error.details) {
        response.details = error.details;
    }
    return res.status(error.status || 500).json(response);
}

async function loadOrders(userId, orderId) {
    const conditions = ['o.user_id = ?'];
    const values = [userId];

    if (orderId !== undefined) {
        conditions.push('o.id = ?');
        values.push(orderId);
    }

    const [rows] = await pool.query(
        `SELECT
            o.id,
            o.user_id AS userId,
            o.status,
            o.created_at AS createdAt,
            o.updated_at AS updatedAt,
            i.product_id AS productId,
            i.product_name AS productName,
            i.unit_price AS unitPrice,
            i.quantity
        FROM orders o
        LEFT JOIN order_items i ON i.order_id = o.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY o.id DESC, i.id ASC`,
        values
    );

    const orders = new Map();
    for (const row of rows) {
        let order = orders.get(row.id);
        if (!order) {
            order = {
                id: row.id,
                userId: row.userId,
                status: row.status,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                items: []
            };
            orders.set(row.id, order);
        }

        if (row.productId !== null) {
            order.items.push({
                productId: row.productId,
                productName: row.productName,
                unitPrice: row.unitPrice,
                quantity: row.quantity
            });
        }
    }

    return Array.from(orders.values());
}

async function insertItems(connection, orderId, items) {
    for (const item of items) {
        await connection.query(
            `INSERT INTO order_items
                (order_id, product_id, product_name, unit_price, quantity)
            VALUES (?, ?, ?, ?, ?)`,
            [
                orderId,
                item.productId,
                item.productName,
                item.unitPrice,
                item.quantity
            ]
        );
    }
}

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await loadOrders(req.user.id);
        return res.json(orders);
    } catch (error) {
        return sendError(res, error, 'Loi khi lay danh sach don hang');
    }
};

exports.getOrderById = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'Ma don hang khong hop le' });
    }

    try {
        const [order] = await loadOrders(req.user.id, id);
        if (!order) {
            return res.status(404).json({ message: 'Khong tim thay don hang' });
        }
        return res.json(order);
    } catch (error) {
        return sendError(res, error, 'Loi khi lay chi tiet don hang');
    }
};

exports.createOrder = async (req, res) => {
    let items;
    try {
        items = await validateOrderItems(req.body && req.body.items, req.token);
    } catch (error) {
        return sendError(res, error, 'Khong the kiem tra san pham');
    }

    let connection;
    let transactionStarted = false;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;
        const [result] = await connection.query(
            'INSERT INTO orders (user_id) VALUES (?)',
            [req.user.id]
        );
        await insertItems(connection, result.insertId, items);
        await connection.commit();
        transactionStarted = false;

        const [order] = await loadOrders(req.user.id, result.insertId);
        return res.status(201).json(order);
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        return sendError(res, error, 'Loi khi tao don hang');
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

exports.updateOrder = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'Ma don hang khong hop le' });
    }

    try {
        const [existing] = await pool.query(
            'SELECT id FROM orders WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Khong tim thay don hang' });
        }

        const items = await validateOrderItems(req.body && req.body.items, req.token);
        const connection = await pool.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [lockedOrder] = await connection.query(
                'SELECT id FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
                [id, req.user.id]
            );
            if (lockedOrder.length === 0) {
                await connection.rollback();
                transactionStarted = false;
                return res.status(404).json({ message: 'Khong tim thay don hang' });
            }

            await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
            await insertItems(connection, id, items);
            await connection.query(
                'UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            await connection.commit();
            transactionStarted = false;
        } catch (error) {
            if (transactionStarted) {
                await connection.rollback();
            }
            throw error;
        } finally {
            connection.release();
        }

        const [order] = await loadOrders(req.user.id, id);
        return res.json(order);
    } catch (error) {
        return sendError(res, error, 'Loi khi cap nhat don hang');
    }
};

exports.updateOrderStatus = async (req, res) => {
    const id = parseId(req.params.id);
    const status = req.body && req.body.status;

    if (!id) {
        return res.status(400).json({ message: 'Ma don hang khong hop le' });
    }
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
            message: `Trang thai don hang phai la mot trong: ${ORDER_STATUSES.join(', ')}`
        });
    }

    try {
        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ? AND user_id = ?',
            [status, id, req.user.id]
        );
        if (result.affectedRows === 0) {
            const [existing] = await pool.query(
                'SELECT id FROM orders WHERE id = ? AND user_id = ?',
                [id, req.user.id]
            );
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Khong tim thay don hang' });
            }
        }

        const [order] = await loadOrders(req.user.id, id);
        return res.json(order);
    } catch (error) {
        return sendError(res, error, 'Loi khi cap nhat trang thai don hang');
    }
};

exports.deleteOrder = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'Ma don hang khong hop le' });
    }

    try {
        const [result] = await pool.query(
            'DELETE FROM orders WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Khong tim thay don hang' });
        }
        return res.status(204).end();
    } catch (error) {
        return sendError(res, error, 'Loi khi xoa don hang');
    }
};
