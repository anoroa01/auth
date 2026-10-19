import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  getMe,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
