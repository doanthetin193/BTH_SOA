// Middleware đọc user info từ API Gateway (đã verify JWT rồi)
const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-username'];
    
    if (!userId || !username) {
        return res.status(401).json({ message: 'Unauthorized - Missing user info' });
    }
    
    // Attach user info to request
    req.user = {
        id: userId,
        username: username
    };
    
    next();
};

export { authMiddleware };