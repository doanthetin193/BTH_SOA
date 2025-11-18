import { ReportData, Transaction } from "../models/ReportData.js";
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
    syncReportData,
    getOverallReport,
    getProductReport,
    getInventoryReport,
    getOrderReport,
    getRevenueReport,
    getTopProductsReport
};
