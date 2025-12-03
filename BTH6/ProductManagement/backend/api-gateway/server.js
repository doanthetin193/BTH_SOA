import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getServiceAddress } from './config/consul.js';
import { authMiddleware } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4005;

// Consul-enabled service discovery
const getAuthService = async () => {
  try {
    return await getServiceAddress('auth-service');
  } catch (err) {
    return process.env.AUTH_SERVICE || 'http://localhost:4000';
  }
};

const getProductService = async () => {
  try {
    return await getServiceAddress('product-service');
  } catch (err) {
    return process.env.PRODUCT_SERVICE || 'http://localhost:4001';
  }
};

const getOrderService = async () => {
  try {
    return await getServiceAddress('order-service');
  } catch (err) {
    return process.env.ORDER_SERVICE || 'http://localhost:4002';
  }
};

const getReportService = async () => {
  try {
    return await getServiceAddress('report-service');
  } catch (err) {
    return process.env.REPORT_SERVICE || 'http://localhost:4003';
  }
};

console.log('🔗 API Gateway with Consul service discovery enabled');

// Manual proxy for auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const AUTH_SERVICE = await getAuthService();
    const response = await fetch(`${AUTH_SERVICE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const AUTH_SERVICE = await getAuthService();
    const response = await fetch(`${AUTH_SERVICE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

app.get('/auth/verify', async (req, res) => {
  try {
    const AUTH_SERVICE = await getAuthService();
    const response = await fetch(`${AUTH_SERVICE}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

// Products routes (protected)
app.get('/products', authMiddleware, async (req, res) => {
  try {
    const PRODUCT_SERVICE = await getProductService();
    const response = await fetch(`${PRODUCT_SERVICE}/api/products`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.post('/products', authMiddleware, async (req, res) => {
  try {
    const PRODUCT_SERVICE = await getProductService();
    const response = await fetch(`${PRODUCT_SERVICE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.get('/products/:id', authMiddleware, async (req, res) => {
  try {
    const PRODUCT_SERVICE = await getProductService();
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const PRODUCT_SERVICE = await getProductService();
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const PRODUCT_SERVICE = await getProductService();
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

// Order routes (protected)
app.post('/orders', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.get('/orders', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.get('/orders/all', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders/all`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.get('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders/${req.params.id}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.patch('/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders/${req.params.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

// PUT /orders/:id - Cập nhật đơn hàng (BTH6)
app.put('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.delete('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/orders/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

// ===== Order Items routes (BTH6) =====
app.get('/order_items', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${ORDER_SERVICE}/api/order_items?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.get('/order_items/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/order_items/${req.params.id}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.post('/order_items', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/order_items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.put('/order_items/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/order_items/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.delete('/order_items/:id', authMiddleware, async (req, res) => {
  try {
    const ORDER_SERVICE = await getOrderService();
    const response = await fetch(`${ORDER_SERVICE}/api/order_items/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

// Report routes (protected)
app.post('/reports/sync', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/overall', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/overall`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/products', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/products?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/products/:productId', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/products/${req.params.productId}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/inventory', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/inventory?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/orders', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/orders?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

// POST /reports/orders - Tạo báo cáo đơn hàng (BTH6)
app.post('/reports/orders', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

// GET /reports/orders/:id - Chi tiết báo cáo đơn hàng (BTH6)
app.get('/reports/orders/:id', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/orders/${req.params.id}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

// DELETE /reports/orders/:id - Xóa báo cáo đơn hàng (BTH6)
app.delete('/reports/orders/:id', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/orders/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

// POST /reports/products - Tạo báo cáo sản phẩm (BTH6)
app.post('/reports/products', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

// DELETE /reports/products/:id - Xóa báo cáo sản phẩm (BTH6)
app.delete('/reports/products/:id', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/products/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/revenue', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/revenue?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.get('/reports/top-products', authMiddleware, async (req, res) => {
  try {
    const REPORT_SERVICE = await getReportService();
    const queryParams = new URLSearchParams(req.query).toString();
    const response = await fetch(`${REPORT_SERVICE}/api/reports/top-products?${queryParams}`, {
      method: 'GET',
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username']
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Report service unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
});
