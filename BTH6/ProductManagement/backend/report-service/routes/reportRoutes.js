import express from 'express';
import {
    // Order Reports - BTH6
    createOrderReport,
    getOrderReports,
    getOrderReportById,
    deleteOrderReport,
    // Product Reports - BTH6
    createProductReport,
    getProductReports,
    getProductReportById,
    deleteProductReport,
    // Sync & Statistics
    syncReportData,
    getOverallReport,
    getProductReport,
    getInventoryReport,
    getOrderReport,
    getRevenueReport,
    getTopProductsReport
} from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả routes yêu cầu authentication
router.use(authMiddleware);

// Đồng bộ dữ liệu
router.post('/sync', syncReportData);

// ===== BÁO CÁO ĐƠN HÀNG (BTH6) =====
router.post('/orders', createOrderReport);              // Tạo báo cáo đơn hàng
router.get('/orders', getOrderReports);                 // Lấy danh sách báo cáo đơn hàng
router.get('/orders/:id', getOrderReportById);          // Lấy chi tiết báo cáo đơn hàng
router.delete('/orders/:id', deleteOrderReport);        // Xóa báo cáo đơn hàng

// ===== BÁO CÁO SẢN PHẨM (BTH6) =====
router.post('/products', createProductReport);          // Tạo báo cáo sản phẩm
router.get('/products', getProductReports);             // Lấy danh sách báo cáo sản phẩm
router.get('/products/:id', getProductReportById);      // Lấy chi tiết báo cáo sản phẩm
router.delete('/products/:id', deleteProductReport);    // Xóa báo cáo sản phẩm

// ===== CÁC BÁO CÁO THỐNG KÊ =====
router.get('/overall', getOverallReport);               // Báo cáo tổng quan
router.get('/inventory', getInventoryReport);           // Báo cáo tồn kho
router.get('/revenue', getRevenueReport);               // Báo cáo doanh thu & lợi nhuận
router.get('/top-products', getTopProductsReport);      // Top sản phẩm

export default router;
