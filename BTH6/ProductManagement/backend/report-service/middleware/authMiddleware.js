// Middleware nhận thông tin user từ API Gateway
const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-username'];
    
    if (!userId || !username) {
        return res.status(401).json({ message: 'Unauthorized - Missing user information' });
    }
    
    req.user = {
        id: userId,
        username: username
    };
    
    next();
};

export { authMiddleware };
