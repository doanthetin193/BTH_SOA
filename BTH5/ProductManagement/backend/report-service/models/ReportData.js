import mongoose from "mongoose";

// Schema lưu trữ snapshot dữ liệu để tạo báo cáo
const reportDataSchema = new mongoose.Schema(
    {
        // Thông tin sản phẩm (snapshot từ Product Service)
        productId: {
            type: String,
            required: true,
            index: true
        },
        productName: {
            type: String,
            required: true
        },
        currentStock: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: true
        },
        
        // Thống kê bán hàng
        totalSold: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        
        // Thống kê đơn hàng
        totalOrders: {
            type: Number,
            default: 0
        },
        
        // Chi phí và lợi nhuận (giả định)
        costPerUnit: {
            type: Number,
            default: 0
        },
        totalCost: {
            type: Number,
            default: 0
        },
        totalProfit: {
            type: Number,
            default: 0
        },
        
        // Metadata
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Schema lưu chi tiết từng giao dịch
const transactionSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            index: true
        },
        productId: {
            type: String,
            required: true,
            index: true
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        revenue: {
            type: Number,
            required: true
        },
        cost: {
            type: Number,
            default: 0
        },
        profit: {
            type: Number,
            default: 0
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'cancelled'],
            default: 'pending'
        },
        username: {
            type: String,
            required: true
        },
        transactionDate: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

const ReportData = mongoose.model("ReportData", reportDataSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

export { ReportData, Transaction };
