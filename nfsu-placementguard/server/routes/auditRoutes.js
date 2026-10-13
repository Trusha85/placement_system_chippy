import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit-logs - Administrator-only immutable audit trail view
router.get('/', requireAuth, requireRoles('Administrator'), (req, res) => {
  try {
    const { action = '', actor = '', search = '', limit = 100 } = req.query;

    let conditions = [];
    let params = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (actor) {
      conditions.push('actor_username LIKE ?');
      params.push(`%${actor.trim()}%`);
    }

    if (search) {
      conditions.push('(entity LIKE ? OR details LIKE ? OR actor_username LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT *
      FROM audit_logs
      ${whereClause}
      ORDER BY id DESC
      LIMIT ?
    `;

    const logs = db.prepare(sql).all(...params, Number(limit));

    const totalCount = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`).get(...params).count;

    res.json({
      logs,
      totalCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
