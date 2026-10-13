import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/companies
router.get('/', requireAuth, (req, res) => {
  try {
    const user = req.session.user;
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM recruitment_drives WHERE company_id = c.id) as drives_count,
        (SELECT COUNT(*) FROM offers WHERE company_id = c.id) as total_offers_count
      FROM companies c
    `;
    let params = [];

    // Recruiter only sees their own company
    if (user.role === 'Recruiter' && user.company_id) {
      sql += ' WHERE c.id = ?';
      params.push(user.company_id);
    }

    sql += ' ORDER BY c.category ASC, c.name ASC';
    const companies = db.prepare(sql).all(...params);

    const formatted = companies.map(c => ({
      ...c,
      allowed_programmes: c.allowed_programmes ? JSON.parse(c.allowed_programmes) : []
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies
router.post('/', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const { name, category, industry = 'Cybersecurity & Tech', job_description = '', contact_email = '', min_cgpa = 6.5, allowed_programmes = [] } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Company name and category (A+, A, B, C) are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO companies (name, category, industry, job_description, contact_email, min_cgpa, allowed_programmes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      category.trim().toUpperCase(),
      industry.trim(),
      job_description.trim(),
      contact_email.trim(),
      Number(min_cgpa) || 6.5,
      JSON.stringify(allowed_programmes)
    );

    logAudit({
      req,
      action: 'CREATE_COMPANY',
      entity: 'COMPANY',
      entityId: result.lastInsertRowid,
      details: { name, category, min_cgpa }
    });

    res.status(201).json({ message: 'Company created successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/companies/:id
router.put('/:id', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const { name, category, industry, job_description, contact_email, min_cgpa, allowed_programmes } = req.body;
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const stmt = db.prepare(`
      UPDATE companies
      SET name = ?, category = ?, industry = ?, job_description = ?, contact_email = ?,
          min_cgpa = ?, allowed_programmes = ?
      WHERE id = ?
    `);

    stmt.run(
      name || existing.name,
      category || existing.category,
      industry || existing.industry,
      job_description !== undefined ? job_description : existing.job_description,
      contact_email || existing.contact_email,
      min_cgpa !== undefined ? Number(min_cgpa) : existing.min_cgpa,
      allowed_programmes ? JSON.stringify(allowed_programmes) : existing.allowed_programmes,
      req.params.id
    );

    logAudit({
      req,
      action: 'UPDATE_COMPANY',
      entity: 'COMPANY',
      entityId: req.params.id,
      details: { before: existing, after: req.body }
    });

    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
