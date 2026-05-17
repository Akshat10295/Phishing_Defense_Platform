const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * Protect route - Validate JWT Access Token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route. Token missing.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwtsecret12345');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Not authorized. Token verification failed.',
    });
  }
};

/**
 * Enforce RBAC - Check user roles
 * @param {...String} roles Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({
        success: false,
        error: 'Authorization middleware used before authentication middleware.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
