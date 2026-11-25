import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

// Used to equalise response time when the email is unknown (mitigates user enumeration by timing)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export async function register(req, res) {
  const { name, email, password, adminCode } = req.valid.body;

  let role = ROLES.USER;
  if (adminCode) {
    if (!env.adminSignupCode || adminCode !== env.adminSignupCode) {
      throw ApiError.forbidden('Invalid admin signup code');
    }
    role = ROLES.ADMIN;
  }

  if (await User.exists({ email })) throw ApiError.conflict('Email is already registered');

  const user = await User.create({ name, email, password, role });
  res.status(201).json({ success: true, data: { user, token: signToken(user) } });
}

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+password');

  const ok = user ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');

  res.json({ success: true, data: { user, token: signToken(user) } });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}
