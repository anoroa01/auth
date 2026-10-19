import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { sendVerificationEmail } from '../utils/email.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  generateVerificationToken,
} from '../utils/tokens.js';
import { config } from '../config.js';

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const { token, hash, expiresAt } = generateRefreshToken();

  await RefreshToken.create({ tokenHash: hash, user: user._id, expiresAt });
  setRefreshCookie(res, token);

  return accessToken;
}

// POST /api/auth/register
export async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const verificationToken = generateVerificationToken();
  const user = await User.create({
    name,
    email,
    password,
    verificationToken,
    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await sendVerificationEmail(user.email, user.name, verificationToken);

  res.status(201).json({
    message: 'Account created. Check your inbox to verify your email.',
    user: user.toSafeJSON(),
  });
}

// GET /api/auth/verify-email/:token
export async function verifyEmail(req, res) {
  const user = await User.findOne({
    verificationToken: req.params.token,
    verificationExpires: { $gt: new Date() },
  }).select('+verificationToken +verificationExpires');

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired verification link' });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified. You can now log in.' });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ message: 'Please verify your email before logging in' });
  }

  const accessToken = await issueTokens(res, user);

  res.json({ accessToken, user: user.toSafeJSON() });
}

// POST /api/auth/refresh
export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  stored.revokedAt = new Date();
  await stored.save();

  const user = await User.findById(stored.user);
  if (!user) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const accessToken = await issueTokens(res, user);

  res.json({ accessToken });
}

// POST /api/auth/logout
export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { revokedAt: new Date() });
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me
export async function getMe(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ user: user.toSafeJSON() });
}
