@echo off
start "Auth 3000" cmd /k "cd /d %~dp0 && npm start"
start "Product 3001" cmd /k "cd /d %~dp0product-service && npm start"
start "Order 3002" cmd /k "cd /d %~dp0order-service && npm start"