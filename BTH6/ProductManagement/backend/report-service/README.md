# Report Service - Product Management System

## 📊 Tổng quan

**Report Service** là một microservice độc lập chuyên xử lý các báo cáo thống kê và phân tích dữ liệu trong hệ thống Product Management.

### Đặc điểm chính:
- ✅ Hoạt động độc lập trên **port 4003**
- ✅ Có database riêng (**report_db** trên MongoDB)
- ✅ Tích hợp với Consul để service discovery
- ✅ Đồng bộ dữ liệu từ Product Service và Order Service
- ✅ Cung cấp nhiều loại báo cáo chi tiết

---

## 🏗️ Kiến trúc

```
Report Service (Port 4003)
    ├── Database: report_db (MongoDB)
    ├── Models:
    │   ├── ReportData (snapshot dữ liệu sản phẩm)
    │   └── Transaction (chi tiết giao dịch)
    ├── Tích hợp:
    │   ├── Product Service (lấy thông tin sản phẩm)
    │   └── Order Service (lấy thông tin đơn hàng)
    └── Service Discovery: Consul
```

---

## 📋 Chức năng

### 1. **Báo cáo hàng tồn kho**
- Số lượng hàng tồn kho hiện tại
- Giá trị tồn kho
- Cảnh báo hàng sắp hết (low stock)
- Danh sách hàng hết hàng (out of stock)

### 2. **Báo cáo hàng bán được**
- Tổng số lượng đã bán theo từng sản phẩm
- Top sản phẩm bán chạy nhất
- Số lượng bán theo thời gian

### 3. **Báo cáo doanh thu**
- Tổng doanh thu
- Doanh thu theo sản phẩm
- Doanh thu theo đơn hàng
- Doanh thu theo thời gian

### 4. **Báo cáo chi phí**
- Chi phí theo sản phẩm (60% giá bán)
- Tổng chi phí hệ thống

### 5. **Báo cáo lợi nhuận**
- Lợi nhuận theo sản phẩm
- Tổng lợi nhuận
- Tỷ suất lợi nhuận (profit margin)

### 6. **Báo cáo theo đơn hàng**
- Chi tiết từng đơn hàng
- Thống kê theo trạng thái đơn (pending, completed, cancelled)
- Lọc theo thời gian

---

## 🚀 API Endpoints

### Đồng bộ dữ liệu
```
POST /reports/sync
```
Đồng bộ dữ liệu từ Product Service và Order Service vào Report Service.

**Response:**
```json
{
  "message": "Report data synchronized successfully",
  "productsProcessed": 10,
  "ordersProcessed": 25
}
```

---

### Báo cáo tổng quan
```
GET /reports/overall
```
Báo cáo tổng quan toàn hệ thống.

**Response:**
```json
{
  "summary": {
    "totalProducts": 10,
    "totalStockValue": 150000,
    "totalItemsInStock": 250,
    "totalItemsSold": 180,
    "totalRevenue": 360000,
    "totalCost": 216000,
    "totalProfit": 144000,
    "totalOrders": 25
  },
  "lastUpdated": "2025-11-18T10:30:00.000Z"
}
```

---

### Báo cáo theo sản phẩm
```
GET /reports/products
GET /reports/products/:productId
```

**Query Parameters:**
- `sortBy` - Sắp xếp theo (totalRevenue, totalSold, totalProfit, currentStock)
- `order` - Thứ tự (asc, desc)

**Response:**
```json
{
  "products": [
    {
      "productId": "abc123",
      "productName": "Laptop Dell XPS 13",
      "currentStock": 15,
      "price": 25000000,
      "totalSold": 45,
      "totalRevenue": 1125000000,
      "totalOrders": 30,
      "costPerUnit": 15000000,
      "totalCost": 675000000,
      "totalProfit": 450000000,
      "lastUpdated": "2025-11-18T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Báo cáo tồn kho
```
GET /reports/inventory
```

**Query Parameters:**
- `threshold` - Ngưỡng cảnh báo hàng sắp hết (default: 10)

**Response:**
```json
{
  "inventory": {
    "lowStock": [...],      // Sản phẩm < threshold
    "outOfStock": [...],    // Sản phẩm hết hàng
    "inStock": [...],       // Sản phẩm đủ hàng
    "totalStockValue": 150000000,
    "totalItems": 250
  },
  "threshold": 10,
  "summary": {
    "lowStockCount": 3,
    "outOfStockCount": 2,
    "inStockCount": 5,
    "totalProducts": 10,
    "totalStockValue": 150000000,
    "totalItems": 250
  }
}
```

---

### Báo cáo theo đơn hàng
```
GET /reports/orders
```

**Query Parameters:**
- `orderId` - Lọc theo ID đơn hàng
- `status` - Lọc theo trạng thái (pending, processing, completed, cancelled)
- `startDate` - Từ ngày (ISO 8601)
- `endDate` - Đến ngày (ISO 8601)

**Response:**
```json
{
  "orders": [
    {
      "orderId": "order123",
      "status": "completed",
      "username": "john_doe",
      "transactionDate": "2025-11-15T14:20:00.000Z",
      "products": [...],
      "totalRevenue": 50000000,
      "totalCost": 30000000,
      "totalProfit": 20000000
    }
  ],
  "transactions": [...],
  "summary": {
    "totalTransactions": 25,
    "totalQuantity": 180,
    "totalRevenue": 360000000,
    "totalCost": 216000000,
    "totalProfit": 144000000
  }
}
```

---

### Báo cáo doanh thu và lợi nhuận
```
GET /reports/revenue
```

**Query Parameters:**
- `period` - Khoảng thời gian (all, month, week)
- `startDate` - Từ ngày
- `endDate` - Đến ngày

**Response:**
```json
{
  "summary": {
    "totalRevenue": 360000000,
    "totalCost": 216000000,
    "totalProfit": 144000000,
    "profitMargin": "40.00%",
    "totalOrders": 25,
    "totalItemsSold": 180,
    "averageOrderValue": "14400000.00"
  },
  "byStatus": [
    {
      "status": "completed",
      "count": 20,
      "revenue": 320000000,
      "cost": 192000000,
      "profit": 128000000
    },
    {
      "status": "cancelled",
      "count": 5,
      "revenue": 40000000,
      "cost": 24000000,
      "profit": 16000000
    }
  ],
  "topProducts": [
    {
      "productId": "abc123",
      "productName": "Laptop Dell XPS 13",
      "totalSold": 45,
      "revenue": 1125000000,
      "profit": 450000000
    }
  ],
  "period": {
    "startDate": "2025-11-01",
    "endDate": "2025-11-18"
  }
}
```

---

### Top sản phẩm
```
GET /reports/top-products
```

**Query Parameters:**
- `limit` - Số lượng sản phẩm (default: 10)
- `sortBy` - Sắp xếp theo (totalRevenue, totalSold, totalProfit)

**Response:**
```json
{
  "topProducts": [
    {
      "productId": "abc123",
      "productName": "Laptop Dell XPS 13",
      "totalSold": 45,
      "totalRevenue": 1125000000,
      "totalProfit": 450000000
    }
  ],
  "sortedBy": "totalRevenue",
  "limit": 10
}
```

---

## 🔐 Authentication

Tất cả API endpoints đều yêu cầu authentication thông qua **JWT token** được gửi từ API Gateway.

Headers cần thiết:
```
x-user-id: <user_id>
x-username: <username>
```

---

## 💾 Database Models

### ReportData
Lưu trữ snapshot dữ liệu sản phẩm:
- `productId` - ID sản phẩm
- `productName` - Tên sản phẩm
- `currentStock` - Số lượng tồn kho
- `price` - Giá bán
- `totalSold` - Tổng số đã bán
- `totalRevenue` - Tổng doanh thu
- `totalOrders` - Số đơn hàng
- `costPerUnit` - Chi phí trên đơn vị
- `totalCost` - Tổng chi phí
- `totalProfit` - Tổng lợi nhuận

### Transaction
Lưu trữ chi tiết từng giao dịch:
- `orderId` - ID đơn hàng
- `productId` - ID sản phẩm
- `productName` - Tên sản phẩm
- `quantity` - Số lượng
- `price` - Giá
- `revenue` - Doanh thu
- `cost` - Chi phí
- `profit` - Lợi nhuận
- `orderStatus` - Trạng thái đơn
- `username` - Người đặt
- `transactionDate` - Ngày giao dịch

---

## 🔄 Quy trình sử dụng

1. **Khởi động service:**
   ```bash
   npm run dev:report
   ```

2. **Đồng bộ dữ liệu lần đầu:**
   ```bash
   POST http://localhost:4005/reports/sync
   Authorization: Bearer <token>
   ```

3. **Truy xuất báo cáo:**
   ```bash
   GET http://localhost:4005/reports/overall
   GET http://localhost:4005/reports/revenue
   GET http://localhost:4005/reports/inventory
   ```

4. **Đồng bộ định kỳ:**
   - Nên gọi `/reports/sync` sau mỗi lần có thay đổi dữ liệu
   - Hoặc thiết lập cron job để đồng bộ tự động

---

## 🎯 Tuân theo nguyên tắc SOA

✅ **Independence**: Service hoạt động độc lập trên port riêng (4003)  
✅ **Database per Service**: Có database riêng (report_db)  
✅ **Service Discovery**: Tích hợp Consul  
✅ **Loose Coupling**: Giao tiếp qua HTTP/REST API  
✅ **Reusability**: Có thể tái sử dụng cho nhiều client khác nhau  
✅ **Autonomy**: Tự quản lý logic nghiệp vụ và dữ liệu  

---

## 📊 Ví dụ Use Case

### Kiểm tra hàng tồn kho sắp hết:
```bash
GET /reports/inventory?threshold=5
```

### Xem top 5 sản phẩm bán chạy:
```bash
GET /reports/top-products?limit=5&sortBy=totalSold
```

### Báo cáo doanh thu tháng 11:
```bash
GET /reports/revenue?startDate=2025-11-01&endDate=2025-11-30
```

### Chi tiết đơn hàng đã hoàn thành:
```bash
GET /reports/orders?status=completed
```

---

## 🛠️ Technologies

- **Node.js** + **Express.js**
- **MongoDB** (Mongoose)
- **Consul** (Service Discovery)
- **JWT** (Authentication)
- **Morgan** (Logging)

---

## 📝 Notes

- Chi phí sản phẩm được tính là **60% giá bán** (có thể điều chỉnh)
- Đơn hàng bị **cancelled** không tính vào doanh thu/lợi nhuận
- Nên đồng bộ dữ liệu thường xuyên để báo cáo chính xác
- Các báo cáo có thể mở rộng thêm theo nhu cầu

---

Được tạo bởi Report Service - Product Management System 🚀
