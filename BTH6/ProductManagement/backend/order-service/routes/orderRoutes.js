import express from 'express';
import { 
    createOrder, 
    getOrders, 
    getAllOrders,
    getOrderById, 
    updateOrderStatus,
    updateOrder,
    deleteOrder 
} from '../controllers/orderController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware);

// Routes
router.post('/', createOrder);                    // Tạo đơn hàng mới
router.get('/', getOrders);                       // Lấy đơn hàng của user
router.get('/all', getAllOrders);                 // Lấy tất cả đơn hàng (admin)
router.get('/:id', getOrderById);                 // Lấy chi tiết 1 đơn hàng
router.put('/:id', updateOrder);                  // Cập nhật đơn hàng (PUT theo BTH6)
router.patch('/:id/status', updateOrderStatus);   // Cập nhật trạng thái đơn hàng
router.delete('/:id', deleteOrder);               // Xóa đơn hàng

export default router;
