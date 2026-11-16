const PRODUCT_SERVICE_URL =
    process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

function serviceError(status, message, details) {
    const error = new Error(message);
    error.status = status;
    error.details = details;
    return error;
}

async function getProduct(productId, token) {
    const url = `${PRODUCT_SERVICE_URL.replace(/\/+$/, '')}/products/${productId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            signal: controller.signal
        });

        if (response.status === 404) {
            throw serviceError(404, `Khong tim thay san pham ${productId}`);
        }

        if (!response.ok) {
            throw serviceError(
                502,
                `Product Service tra ve loi HTTP ${response.status}`
            );
        }

        let product;
        try {
            product = await response.json();
        } catch (error) {
            throw serviceError(502, 'Product Service tra ve du lieu khong hop le');
        }

        if (
            !product ||
            typeof product !== 'object' ||
            Number(product.id) !== productId ||
            product.price === null ||
            product.price === undefined ||
            product.price === '' ||
            product.quantity === null ||
            product.quantity === undefined ||
            product.quantity === ''
        ) {
            throw serviceError(502, 'Product Service tra ve du lieu san pham khong hop le');
        }

        const price = Number(product.price);
        const stock = Number(product.quantity);

        if (
            typeof product.name !== 'string' ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            throw serviceError(502, 'Product Service tra ve du lieu san pham khong hop le');
        }

        return {
            name: product.name,
            price,
            stock
        };
    } catch (error) {
        if (error.status) {
            throw error;
        }
        throw serviceError(
            502,
            `Khong the ket noi Product Service: ${error.message}`
        );
    } finally {
        clearTimeout(timeout);
    }
}

async function validateOrderItems(items, token) {
    if (!Array.isArray(items) || items.length === 0) {
        throw serviceError(400, 'Don hang phai co it nhat mot san pham');
    }

    const quantities = new Map();
    for (const item of items) {
        if (
            !item ||
            !Number.isSafeInteger(item.productId) ||
            item.productId < 1 ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1
        ) {
            throw serviceError(400, 'Danh sach san pham trong don khong hop le');
        }

        const quantity = (quantities.get(item.productId) || 0) + item.quantity;
        if (!Number.isSafeInteger(quantity)) {
            throw serviceError(400, 'So luong san pham vuot qua gioi han');
        }
        quantities.set(item.productId, quantity);
    }

    return Promise.all(
        Array.from(quantities.entries()).map(async ([productId, quantity]) => {
            const product = await getProduct(productId, token);

            if (quantity > product.stock) {
                throw serviceError(
                    409,
                    `San pham ${productId} khong du so luong trong kho`,
                    {
                        productId,
                        available: product.stock,
                        requested: quantity
                    }
                );
            }

            return {
                productId,
                productName: product.name,
                unitPrice: product.price,
                quantity
            };
        })
    );
}

module.exports = { validateOrderItems };
