import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    logAudit({
      req,
      action: 'LOGIN_FAILURE',
      entity: 'USER',
      entityId: username,
      details: { reason: 'User not found' }
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    logAudit({
      req,
      action: 'LOGIN_FAILURE',
      entity: 'USER',
      entityId: username,
      details: { reason: 'Password mismatch' }
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Regenerate session to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to initialize session' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      assigned_programme: user.assigned_programme
    };

    logAudit({
      req,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      details: { role: user.role }
    });

    res.json({
      message: 'Login successful',
      user: req.session.user
    });
  });
});

router.post('/logout', (req, res) => {
  if (req.session && req.session.user) {
    logAudit({
      req,
      action: 'LOGOUT',
      entity: 'USER',
      entityId: req.session.user.id
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to destroy session' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.user
  });
});

// Demo accounts endpoint for easy one-click testing by hackathon judges
router.get('/demo-accounts', (req, res) => {
  res.json([
    {
      role: 'Placement Administrator',
      roleKey: 'Administrator',
      username: 'admin',
      password: 'Admin@NFSU2026!',
      description: 'Full system privileges, user roles, policy override, audit logs, and reports.'
    },
    {
      role: 'Placement Officer',
      roleKey: 'Officer',
      username: 'officer',
      password: 'Officer@NFSU2026!',
      description: 'Student & offer management, recruitment activities, attendance, and policy reviews.'
    },
    {
      role: 'Course Coordinator (CS)',
      roleKey: 'Coordinator',
      username: 'coordinator_cs',
      password: 'Coord@NFSU2026!',
      description: 'Read-only access restricted to M.Tech. Computer Science students.'
    },
    {
      role: 'Course Coordinator (DFIS)',
      roleKey: 'Coordinator',
      username: 'coordinator_dfis',
      password: 'Coord@NFSU2026!',
      description: 'Read-only access restricted to M.Sc. Digital Forensics & Information Security.'
    },
    {
      role: 'Recruiter (Tata Cyber Defense)',
      roleKey: 'Recruiter',
      username: 'recruiter_tata',
      password: 'Recruit@NFSU2026!',
      description: 'Scoped to Tata Cyber Defense drive data; student PII redacted.'
    }
  ]);
});

export default router;
