import jwt from 'jsonwebtoken';

// Middleware xác thực JWT tại API Gateway
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Forward user info to downstream services via headers
        req.headers['x-user-id'] = decoded.id;
        req.headers['x-username'] = decoded.username;
        
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

export { authMiddleware };
