# Order Service

Dich vu quan ly don hang chay doc lap tren cong `3002` va co so du lieu
`order_service_db`. Dich vu goi Product Service (mac dinh `http://localhost:3001`)
de kiem tra san pham va ton kho truoc khi tao/cap nhat don. So luong ton kho
chi duoc kiem tra, khong bi tru hoac giu cho boi dich vu nay.

## Chay dich vu

1. Tao schema bang cach chay `database.sql` trong MySQL.
2. Sao chep `.env.example` thanh `.env`, sau do dien thong tin MySQL va
   `JWT_SECRET` (phai giong secret cua Auth va Product Service).
3. Trong thu muc `order-service`, chay `npm install`, sau do `npm start`.

Product Service can dang chay va cac dich vu can dung chung secret JWT.

## API

Tat ca endpoint `/orders` can header `Authorization: Bearer <token>`.
Don hang duoc gioi han theo `user_id` trong JWT.

- `POST /orders` - tao don: `{ "items": [{ "productId": 1, "quantity": 2 }] }`
- `GET /orders` - danh sach don hang cua tai khoan dang dang nhap
- `GET /orders/:id` - xem chi tiet don hang
- `PUT /orders/:id` - thay toan bo san pham trong don: `{ "items": [...] }`
- `PATCH /orders/:id/status` - cap nhat trang thai: `{ "status": "confirmed" }`
- `DELETE /orders/:id` - xoa don hang

Trang thai hop le: `pending`, `confirmed`, `processing`, `shipped`,
`delivered`, `cancelled`.
