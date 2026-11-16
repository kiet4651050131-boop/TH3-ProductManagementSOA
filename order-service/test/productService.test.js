const assert = require('node:assert/strict');
const test = require('node:test');
const { validateOrderItems } = require('../src/services/productService');

async function withMockedFetch(fetchMock, run) {
    const originalFetch = global.fetch;
    global.fetch = fetchMock;
    try {
        await run();
    } finally {
        global.fetch = originalFetch;
    }
}

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

test('validates stock and snapshots product details', async () => {
    await withMockedFetch(async (url, options) => {
        assert.equal(url, 'http://localhost:3001/products/7');
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        return jsonResponse({
            id: 7,
            name: 'Keyboard',
            price: '25.50',
            quantity: 4
        });
    }, async () => {
        const items = await validateOrderItems(
            [{ productId: 7, quantity: 2 }],
            'test-token'
        );

        assert.deepEqual(items, [{
            productId: 7,
            productName: 'Keyboard',
            unitPrice: 25.5,
            quantity: 2
        }]);
    });
});

test('aggregates duplicate product lines before checking stock', async () => {
    await withMockedFetch(async () => jsonResponse({
        id: 7,
        name: 'Keyboard',
        price: 25.5,
        quantity: 3
    }), async () => {
        await assert.rejects(
            validateOrderItems([
                { productId: 7, quantity: 2 },
                { productId: 7, quantity: 2 }
            ], 'test-token'),
            (error) => error.status === 409 &&
                error.details.available === 3 &&
                error.details.requested === 4
        );
    });
});

test('rejects invalid items before calling Product Service', async () => {
    let called = false;
    await withMockedFetch(async () => {
        called = true;
        return jsonResponse({});
    }, async () => {
        await assert.rejects(
            validateOrderItems([{ productId: 7, quantity: 0 }], 'test-token'),
            (error) => error.status === 400
        );
    });
    assert.equal(called, false);
});

test('returns not found when Product Service does not contain a product', async () => {
    await withMockedFetch(async () => jsonResponse({}, 404), async () => {
        await assert.rejects(
            validateOrderItems([{ productId: 99, quantity: 1 }], 'test-token'),
            (error) => error.status === 404
        );
    });
});

test('rejects malformed product data from Product Service', async () => {
    await withMockedFetch(async () => jsonResponse({
        id: 7,
        name: 'Keyboard',
        price: null,
        quantity: 4
    }), async () => {
        await assert.rejects(
            validateOrderItems([{ productId: 7, quantity: 1 }], 'test-token'),
            (error) => error.status === 502
        );
    });
});
