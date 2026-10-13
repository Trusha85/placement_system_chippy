import { db } from '../db/database.js';

export function logAudit({ req, action, entity, entityId = null, details = null }) {
  try {
    const actorId = req?.session?.user?.id || null;
    const actorUsername = req?.session?.user?.username || 'SYSTEM_OR_ANON';
    const actorRole = req?.session?.user?.role || 'UNKNOWN';
    const ip = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      actorId,
      actorUsername,
      actorRole,
      action,
      entity,
      entityId ? String(entityId) : null,
      typeof details === 'object' ? JSON.stringify(details) : details,
      ip
    );
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}
