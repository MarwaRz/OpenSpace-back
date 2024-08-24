const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'token invalide' });
    }

    try {
        const tokenData = token.split(' ')[1];
        const decodedToken = jwt.verify(tokenData, process.env.JWT_SECRET);


        if (!decodedToken || !decodedToken.userId) {
            return res.status(401).json({ message: 'Authentication failed' });
        }

        req.userId = decodedToken.userId;
        req.userRole = decodedToken.role || ''; 
        req.user = decodedToken; 
        next();
    } catch (error) {
        console.error(' Erreur:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = requireAuth;
