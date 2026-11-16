const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Vui long cung cap JWT token'
        });
    }

    const token = authHeader.slice('Bearer '.length);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({
                message: 'JWT token khong chua thong tin tai khoan'
            });
        }

        req.user = decoded;
        req.token = token;
        return next();
    } catch (error) {
        return res.status(401).json({
            message: 'Token khong hop le hoac da het han'
        });
    }
}

module.exports = authMiddleware;
