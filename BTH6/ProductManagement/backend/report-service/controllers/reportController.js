import { OrderReport, ProductReport, ReportData, Transaction } from "../models/ReportData.js";
import { getServiceAddress } from "../config/consul.js";

// Lấy địa chỉ các services từ Consul
const getProductServiceUrl = async () => {
    try {
        return await getServiceAddress('product-service');
    } catch (err) {
        return process.env.PRODUCT_SERVICE || 'http://localhost:4001';
    }
};

const getOrderServiceUrl = async () => {
    try {
        return await getServiceAddress('order-service');
    } catch (err) {
        return process.env.ORDER_SERVICE || 'http://localhost:4002';
    }
};

// ==================== BÁO CÁO ĐƠN HÀNG (orders_reports) - BTH6 ====================

// Tạo báo cáo đơn hàng mới - POST /reports/orders
const createOrderReport = async (req, res) => {
    try {
        const { orderId, products, customer_name, customer_email } = req.body;
        const userId = req.user.id;
        const username = req.user.username;

        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        // Kiểm tra báo cáo đã tồn tại chưa
        const existingReport = await OrderReport.findOne({ orderId });
        if (existingReport) {
            return res.status(400).json({ message: 'Report for this order already exists', report: existingReport });
        }

        // Lấy thông tin đơn hàng từ Order Service
        const ORDER_SERVICE = await getOrderServiceUrl();
        let orderData = null;
        try {
            const orderResponse = await fetch(`${ORDER_SERVICE}/api/orders/${orderId}`, {
                headers: {
                    'x-user-id': userId,
                    'x-username': username
                }
            });
            if (orderResponse.ok) {
                orderData = await orderResponse.json();
            }
        } catch (err) {
            console.log('Could not fetch order data:', err.message);
        }

        // Tính toán từ products được gửi lên hoặc từ order data
        let totalRevenue = 0;
        let totalCost = 0;
        const productReportsList = [];

        const productsList = products || (orderData ? orderData.products : []);

        for (const product of productsList) {
            const quantity = product.total_sold || product.quantity || 0;
            const revenue = product.revenue || (product.price * quantity) || 0;
            const cost = product.cost || (revenue * 0.6);
            const profit = revenue - cost;

            totalRevenue += revenue;
            totalCost += cost;

            productReportsList.push({
                productId: product.product_id || product.productId,
                productName: product.product_name || product.name || 'Unknown',
                totalSold: quantity,
                revenue,
                cost,
                profit
            });
        }

        const totalProfit = totalRevenue - totalCost;

        // Tạo báo cáo đơn hàng
        const orderReport = new OrderReport({
            orderId,
            customerName: orderData?.customerName || customer_name || 'Unknown',
            customerEmail: orderData?.customerEmail || customer_email || 'unknown@email.com',
            totalRevenue,
            totalCost,
            totalProfit,
            orderStatus: orderData?.status || 'completed',
            orderDate: orderData?.createdAt || new Date()
        });

        await orderReport.save();

        // Tạo báo cáo sản phẩm liên kết
        const savedProductReports = [];
        for (const pr of productReportsList) {
            const productReport = new ProductReport({
                orderReportId: orderReport._id,
                productId: pr.productId,
                productName: pr.productName,
                totalSold: pr.totalSold,
                revenue: pr.revenue,
                cost: pr.cost,
                profit: pr.profit
            });
            await productReport.save();
            savedProductReports.push(productReport);
        }

        res.status(201).json({
            message: 'Order report created successfully',
            orderReport,
            productReports: savedProductReports
        });
    } catch (error) {
        console.error('Error creating order report:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Lấy danh sách báo cáo đơn hàng - GET /reports/orders
const getOrderReports = async (req, res) => {
    try {
        const { status, startDate, endDate, orderId } = req.query;

        let query = {};
        
        if (orderId) {
            query.orderId = orderId;
        }
        
        if (status) {
            query.orderStatus = status;
        }
        
        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) query.orderDate.$gte = new Date(startDate);
            if (endDate) query.orderDate.$lte = new Date(endDate);
        }

        const orderReports = await OrderReport.find(query).sort({ createdAt: -1 });

        const summary = {
            totalReports: orderReports.length,
            totalRevenue: orderReports.reduce((sum, r) => sum + r.totalRevenue, 0),
            totalCost: orderReports.reduce((sum, r) => sum + r.totalCost, 0),
            totalProfit: orderReports.reduce((sum, r) => sum + r.totalProfit, 0)
        };

        res.json({
            orders: orderReports,
            summary
        });
    } catch (error) {
        console.error('Error fetching order reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy chi tiết báo cáo đơn hàng - GET /reports/orders/:id
const getOrderReportById = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm theo _id hoặc orderId
        let orderReport = await OrderReport.findById(id).catch(() => null);
        if (!orderReport) {
            orderReport = await OrderReport.findOne({ orderId: id });
        }

        if (!orderReport) {
            return res.status(404).json({ message: 'Order report not found' });
        }

        const productReports = await ProductReport.find({ orderReportId: orderReport._id });

        res.json({
            orderReport,
            productReports
        });
    } catch (error) {
        console.error('Error fetching order report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Xóa báo cáo đơn hàng - DELETE /reports/orders/:id
const deleteOrderReport = async (req, res) => {
    try {
        const { id } = req.params;

        let orderReport = await OrderReport.findById(id).catch(() => null);
        if (!orderReport) {
            orderReport = await OrderReport.findOne({ orderId: id });
        }

        if (!orderReport) {
            return res.status(404).json({ message: 'Order report not found' });
        }

        await ProductReport.deleteMany({ orderReportId: orderReport._id });
        await OrderReport.findByIdAndDelete(orderReport._id);

        res.json({ message: 'Order report deleted successfully' });
    } catch (error) {
        console.error('Error deleting order report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ==================== BÁO CÁO SẢN PHẨM (product_reports) - BTH6 ====================

// Tạo báo cáo sản phẩm mới - POST /reports/products
const createProductReport = async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: 'Products data is required' });
        }

        const createdReports = [];

        for (const product of products) {
            const { product_id, productId, product_name, productName, total_sold, totalSold, revenue, cost } = product;

            const pid = product_id || productId;
            const pname = product_name || productName || 'Unknown';
            const sold = total_sold || totalSold || 0;
            const rev = revenue || 0;
            const cst = cost || (rev * 0.6);
            const profit = rev - cst;

            const reportData = await ReportData.findOneAndUpdate(
                { productId: pid },
                {
                    $inc: {
                        totalSold: sold,
                        totalRevenue: rev,
                        totalCost: cst,
                        totalProfit: profit,
                        totalOrders: 1
                    },
                    $set: {
                        productName: pname,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true, new: true }
            );

            createdReports.push(reportData);
        }

        res.status(201).json({
            message: 'Product reports created successfully',
            reports: createdReports
        });
    } catch (error) {
        console.error('Error creating product report:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Lấy danh sách báo cáo sản phẩm - GET /reports/products
const getProductReports = async (req, res) => {
    try {
        const { sortBy = 'totalRevenue', order = 'desc' } = req.query;

        const sortOrder = order === 'asc' ? 1 : -1;
        const reportData = await ReportData.find().sort({ [sortBy]: sortOrder });

        const summary = {
            totalProducts: reportData.length,
            totalSold: reportData.reduce((sum, r) => sum + r.totalSold, 0),
            totalRevenue: reportData.reduce((sum, r) => sum + r.totalRevenue, 0),
            totalCost: reportData.reduce((sum, r) => sum + r.totalCost, 0),
            totalProfit: reportData.reduce((sum, r) => sum + r.totalProfit, 0)
        };

        res.json({
            products: reportData,
            summary
        });
    } catch (error) {
        console.error('Error fetching product reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Lấy chi tiết báo cáo sản phẩm - GET /reports/products/:id
const getProductReportById = async (req, res) => {
    try {
        const { id } = req.params;

        let reportData = await ReportData.findById(id).catch(() => null);
        if (!reportData) {
            reportData = await ReportData.findOne({ productId: id });
        }

        if (!reportData) {
            return res.status(404).json({ message: 'Product report not found' });
        }

        const transactions = await Transaction.find({ productId: reportData.productId })
            .sort({ transactionDate: -1 })
            .limit(50);

        res.json({
            productReport: reportData,
            recentTransactions: transactions
        });
    } catch (error) {
        console.error('Error fetching product report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Xóa báo cáo sản phẩm - DELETE /reports/products/:id
const deleteProductReport = async (req, res) => {
    try {
        const { id } = req.params;

        let reportData = await ReportData.findById(id).catch(() => null);
        if (!reportData) {
            reportData = await ReportData.findOne({ productId: id });
        }

        if (!reportData) {
            return res.status(404).json({ message: 'Product report not found' });
        }

        await ProductReport.deleteMany({ productId: reportData.productId });
        await ReportData.findByIdAndDelete(reportData._id);

        res.json({ message: 'Product report deleted successfully' });
    } catch (error) {
        console.error('Error deleting product report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ==================== CÁC API THỐNG KÊ BỔ SUNG ====================

// Đồng bộ dữ liệu từ Product Service và Order Service
const syncReportData = async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;

        // Lấy dữ liệu sản phẩm
        const PRODUCT_SERVICE = await getProductServiceUrl();
        const productsResponse = await fetch(`${PRODUCT_SERVICE}/api/products`, {
            headers: {
                'x-user-id': userId,
                'x-username': username
            }
        });

        if (!productsResponse.ok) {
            return res.status(500).json({ message: 'Failed to fetch products' });
        }

        const products = await productsResponse.json();

        // Lấy dữ liệu đơn hàng
        const ORDER_SERVICE = await getOrderServiceUrl();
        const ordersResponse = await fetch(`${ORDER_SERVICE}/api/orders/all`, {
            headers: {
                'x-user-id': userId,
                'x-username': username
            }
        });

        if (!ordersResponse.ok) {
            return res.status(500).json({ message: 'Failed to fetch orders' });
        }

        const orders = await ordersResponse.json();

        // Tính toán thống kê cho từng sản phẩm
        for (const product of products) {
            let totalSold = 0;
            let totalRevenue = 0;
            let totalOrders = 0;

            // Tính toán từ các đơn hàng
            for (const order of orders) {
                if (order.status !== 'cancelled') {
                    const productInOrder = order.products.find(
                        p => p.productId === product._id
                    );

                    if (productInOrder) {
                        totalSold += productInOrder.quantity;
                        totalRevenue += productInOrder.price * productInOrder.quantity;
                        totalOrders++;
                    }
                }
            }

            // Giả định chi phí là 60% giá bán
            const costPerUnit = product.price * 0.6;
            const totalCost = totalSold * costPerUnit;
            const totalProfit = totalRevenue - totalCost;

            // Cập nhật hoặc tạo mới report data
            await ReportData.findOneAndUpdate(
                { productId: product._id },
                {
                    productId: product._id,
                    productName: product.name,
                    currentStock: product.quantity,
                    price: product.price,
                    totalSold,
                    totalRevenue,
                    totalOrders,
                    costPerUnit,
                    totalCost,
                    totalProfit,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );
        }

        // Đồng bộ transactions
        for (const order of orders) {
            for (const product of order.products) {
                const revenue = product.price * product.quantity;
                const cost = product.price * 0.6 * product.quantity;
                const profit = revenue - cost;

                await Transaction.findOneAndUpdate(
                    { orderId: order._id, productId: product.productId },
                    {
                        orderId: order._id,
                        productId: product.productId,
                        productName: product.name,
                        quantity: product.quantity,
                        price: product.price,
                        revenue,
                        cost,
                        profit,
                        orderStatus: order.status,
                        username: order.username,
                        transactionDate: order.createdAt
                    },
                    { upsert: true, new: true }
                );
            }
        }

        res.json({ 
            message: 'Report data synchronized successfully',
            productsProcessed: products.length,
            ordersProcessed: orders.length
        });
    } catch (error) {
        console.error('Error syncing report data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Báo cáo tổng quan
const getOverallReport = async (req, res) => {
    try {
        const reportData = await ReportData.find();

        const summary = {
            totalProducts: reportData.length,
            totalStockValue: 0,
            totalItemsInStock: 0,
            totalItemsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalOrders: 0
        };

        reportData.forEach(item => {
            summary.totalStockValue += item.currentStock * item.price;
            summary.totalItemsInStock += item.currentStock;
            summary.totalItemsSold += item.totalSold;
            summary.totalRevenue += item.totalRevenue;
            summary.totalCost += item.totalCost;
            summary.totalProfit += item.totalProfit;
            summary.totalOrders += item.totalOrders;
        });

        res.json({
            summary,
            lastUpdated: reportData[0]?.lastUpdated || new Date()
        });
    } catch (error) {
        console.error('Error generating overall report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Báo cáo theo sản phẩm
const getProductReport = async (req, res) => {
    try {
        const { productId } = req.params;
        const { sortBy = 'totalRevenue', order = 'desc' } = req.query;

        let query = {};
        if (productId) {
            query.productId = productId;
        }

        const sortOrder = order === 'asc' ? 1 : -1;
        const reportData = await ReportData.find(query).sort({ [sortBy]: sortOrder });

        if (productId && reportData.length === 0) {
            return res.status(404).json({ message: 'Product report not found' });
        }

        res.json({
            products: reportData,
            total: reportData.length
        });
    } catch (error) {
        console.error('Error generating product report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Báo cáo hàng tồn kho
const getInventoryReport = async (req, res) => {
    try {
        const { threshold = 10 } = req.query;

        const reportData = await ReportData.find().sort({ currentStock: 1 });

        const inventory = {
            lowStock: reportData.filter(item => item.currentStock < threshold && item.currentStock > 0),
            outOfStock: reportData.filter(item => item.currentStock === 0),
            inStock: reportData.filter(item => item.currentStock >= threshold),
            totalStockValue: 0,
            totalItems: 0
        };

        reportData.forEach(item => {
            inventory.totalStockValue += item.currentStock * item.price;
            inventory.totalItems += item.currentStock;
        });

        res.json({
            inventory,
            threshold,
            summary: {
                lowStockCount: inventory.lowStock.length,
                outOfStockCount: inventory.outOfStock.length,
                inStockCount: inventory.inStock.length,
                totalProducts: reportData.length,
                totalStockValue: inventory.totalStockValue,
                totalItems: inventory.totalItems
            }
        });
    } catch (error) {
        console.error('Error generating inventory report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Báo cáo theo đơn hàng
const getOrderReport = async (req, res) => {
    try {
        const { orderId, status, startDate, endDate } = req.query;

        let query = {};
        
        if (orderId) {
            query.orderId = orderId;
        }
        
        if (status) {
            query.orderStatus = status;
        }
        
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query).sort({ transactionDate: -1 });

        // Tính toán tổng hợp
        const summary = {
            totalTransactions: transactions.length,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0
        };

        transactions.forEach(trans => {
            summary.totalQuantity += trans.quantity;
            summary.totalRevenue += trans.revenue;
            summary.totalCost += trans.cost;
            summary.totalProfit += trans.profit;
        });

        // Nhóm theo đơn hàng
        const orderGroups = transactions.reduce((acc, trans) => {
            if (!acc[trans.orderId]) {
                acc[trans.orderId] = {
                    orderId: trans.orderId,
                    status: trans.orderStatus,
                    username: trans.username,
                    transactionDate: trans.transactionDate,
                    products: [],
                    totalRevenue: 0,
                    totalCost: 0,
                    totalProfit: 0
                };
            }
            
            acc[trans.orderId].products.push({
                productId: trans.productId,
                productName: trans.productName,
                quantity: trans.quantity,
                price: trans.price,
                revenue: trans.revenue,
                cost: trans.cost,
                profit: trans.profit
            });
            
            acc[trans.orderId].totalRevenue += trans.revenue;
            acc[trans.orderId].totalCost += trans.cost;
            acc[trans.orderId].totalProfit += trans.profit;
            
            return acc;
        }, {});

        res.json({
            orders: Object.values(orderGroups),
            transactions,
            summary
        });
    } catch (error) {
        console.error('Error generating order report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Báo cáo doanh thu và lợi nhuận theo thời gian
const getRevenueReport = async (req, res) => {
    try {
        const { period = 'all', startDate, endDate } = req.query;

        let query = {};
        
        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query).sort({ transactionDate: 1 });

        // Tính tổng
        const totals = {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalOrders: new Set(),
            totalItemsSold: 0
        };

        transactions.forEach(trans => {
            if (trans.orderStatus !== 'cancelled') {
                totals.totalRevenue += trans.revenue;
                totals.totalCost += trans.cost;
                totals.totalProfit += trans.profit;
                totals.totalOrders.add(trans.orderId);
                totals.totalItemsSold += trans.quantity;
            }
        });

        // Nhóm theo status
        const byStatus = transactions.reduce((acc, trans) => {
            if (!acc[trans.orderStatus]) {
                acc[trans.orderStatus] = {
                    status: trans.orderStatus,
                    count: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }
            acc[trans.orderStatus].count++;
            acc[trans.orderStatus].revenue += trans.revenue;
            acc[trans.orderStatus].cost += trans.cost;
            acc[trans.orderStatus].profit += trans.profit;
            return acc;
        }, {});

        // Top sản phẩm bán chạy
        const productStats = transactions.reduce((acc, trans) => {
            if (!acc[trans.productId]) {
                acc[trans.productId] = {
                    productId: trans.productId,
                    productName: trans.productName,
                    totalSold: 0,
                    revenue: 0,
                    profit: 0
                };
            }
            if (trans.orderStatus !== 'cancelled') {
                acc[trans.productId].totalSold += trans.quantity;
                acc[trans.productId].revenue += trans.revenue;
                acc[trans.productId].profit += trans.profit;
            }
            return acc;
        }, {});

        const topProducts = Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        res.json({
            summary: {
                totalRevenue: totals.totalRevenue,
                totalCost: totals.totalCost,
                totalProfit: totals.totalProfit,
                profitMargin: totals.totalRevenue > 0 
                    ? ((totals.totalProfit / totals.totalRevenue) * 100).toFixed(2) + '%'
                    : '0%',
                totalOrders: totals.totalOrders.size,
                totalItemsSold: totals.totalItemsSold,
                averageOrderValue: totals.totalOrders.size > 0
                    ? (totals.totalRevenue / totals.totalOrders.size).toFixed(2)
                    : 0
            },
            byStatus: Object.values(byStatus),
            topProducts,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Báo cáo top sản phẩm
const getTopProductsReport = async (req, res) => {
    try {
        const { limit = 10, sortBy = 'totalRevenue' } = req.query;
        
        const sortOrder = -1; // Descending
        const topProducts = await ReportData.find()
            .sort({ [sortBy]: sortOrder })
            .limit(parseInt(limit));

        res.json({
            topProducts,
            sortedBy: sortBy,
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error generating top products report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export {
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
};
