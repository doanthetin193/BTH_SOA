import express from 'express';
import {
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

// Các báo cáo
router.get('/overall', getOverallReport);                    // Báo cáo tổng quan
router.get('/products', getProductReport);                   // Báo cáo theo sản phẩm (tất cả)
router.get('/products/:productId', getProductReport);        // Báo cáo sản phẩm cụ thể
router.get('/inventory', getInventoryReport);                // Báo cáo tồn kho
router.get('/orders', getOrderReport);                       // Báo cáo theo đơn hàng
router.get('/revenue', getRevenueReport);                    // Báo cáo doanh thu & lợi nhuận
router.get('/top-products', getTopProductsReport);           // Top sản phẩm

export default router;
