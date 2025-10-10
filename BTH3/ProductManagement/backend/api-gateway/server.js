import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4005;
const AUTH_SERVICE = process.env.AUTH_SERVICE || 'http://localhost:4000';
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE || 'http://localhost:4001';

console.log('🔗 Auth service:', AUTH_SERVICE);
console.log('🔗 Product service:', PRODUCT_SERVICE);

// Manual proxy for auth routes
app.post('/auth/register', async (req, res) => {
  try {
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

// Products routes
app.get('/products', async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE}/api/products`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.post('/products', async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE}/api/products/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
});
