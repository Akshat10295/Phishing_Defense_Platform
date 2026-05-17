const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../../config/db');

// Schema validations using Zod
const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  role: z.enum(['user', 'analyst', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * Generate Access and Refresh Tokens
 */
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'jwtsecret12345',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'jwtrefreshsecret12345',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Helper to set cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Register User
 */
const register = async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errors: parseResult.error.errors.map(err => err.message),
      });
    }

    const { email, password, role } = parseResult.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'user',
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during user registration',
    });
  }
};

/**
 * Login User
 */
const login = async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        errors: parseResult.error.errors.map(err => err.message),
      });
    }

    const { email, password } = parseResult.data;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication',
    });
  }
};

/**
 * Refresh Tokens
 */
const refresh = async (req, res) => {
  let token = req.cookies?.refreshToken;

  if (!token && req.body.refreshToken) {
    token = req.body.refreshToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token not found',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'jwtrefreshsecret12345');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists',
      });
    }

    // Rotate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Token Refresh Error:', error);
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please log in again.',
    });
  }
};

/**
 * Logout User
 */
const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
