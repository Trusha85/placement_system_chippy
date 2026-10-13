import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { evaluatePlacementPolicy } from '../policy/policyEngine.js';

const router = express.Router();

// GET /api/offers - List offers
router.get('/', requireAuth, (req, res) => {
  try {
    const user = req.session.user;
    let sql = `
      SELECT o.*, 
        s.full_name as student_name, s.placement_id, s.programme, s.academic_batch, s.registration_status, s.academic_eligibility,
        c.name as company_name, c.category as company_category,
        rd.title as drive_title
      FROM offers o
      JOIN students s ON o.student_id = s.id
      JOIN companies c ON o.company_id = c.id
      LEFT JOIN recruitment_drives rd ON o.drive_id = rd.id
    `;
    let params = [];

    // Recruiter only sees offers for their own company
    if (user.role === 'Recruiter' && user.company_id) {
      sql += ' WHERE o.company_id = ?';
      params.push(user.company_id);
    } else if (user.role === 'Coordinator' && user.assigned_programme) {
      sql += ' WHERE s.programme = ?';
      params.push(user.assigned_programme);
    }

    sql += ' ORDER BY o.offer_date DESC, o.id DESC';
    const offers = db.prepare(sql).all(...params);

    // Check deadlines for pending offers to compute expired status dynamically
    const now = new Date();
    const evaluatedOffers = offers.map(o => {
      let isExpired = false;
      if (o.acceptance_status === 'pending' && o.acceptance_deadline) {
        const deadlineDate = new Date(o.acceptance_deadline.replace(' ', 'T'));
        if (!isNaN(deadlineDate.getTime()) && now > deadlineDate) {
          isExpired = true;
        }
      }
      return {
        ...o,
        computed_expired: isExpired
      };
    });

    res.json(evaluatedOffers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offers - Issue new offer (Administrator or Officer)
router.post('/', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const {
      student_id,
      company_id,
      drive_id = null,
      offer_type, // I, F, I+F
      ctc_lpa = 0,
      stipend_amount = 0,
      stipend_period = '6 Months',
      ppo_status = 'not applicable',
      offer_date,
      acceptance_deadline,
      remarks = ''
    } = req.body;

    if (!student_id || !company_id || !offer_type) {
      return res.status(400).json({ error: 'Missing mandatory fields (student_id, company_id, offer_type).' });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(company_id);

    if (!student || !company) {
      return res.status(404).json({ error: 'Student or Company not found.' });
    }

    // Evaluate policy before issuing offer
    const existingOffers = db.prepare('SELECT * FROM offers WHERE student_id = ?').all(student_id);
    const targetDrive = {
      company_category: company.category,
      package_ctc: Number(ctc_lpa) || 0,
      role_type: offer_type,
      min_cgpa: company.min_cgpa,
      allowed_programmes: company.allowed_programmes ? JSON.parse(company.allowed_programmes) : []
    };

    const policyResult = evaluatePlacementPolicy(student, existingOffers, targetDrive);

    // If policy strictly blocks and no explicit override is provided
    if (policyResult.decision === 'BLOCK' && !req.body.bypass_policy) {
      return res.status(400).json({
        error: 'Policy Blocked',
        policyResult,
        message: 'This offer violates university placement policy. An authorized override is required.'
      });
    }

    // Acceptance deadline: Default to earlier of 24 hours and specified deadline
    const now = new Date();
    const default24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const finalDeadline = acceptance_deadline && new Date(acceptance_deadline) < new Date(default24h)
      ? acceptance_deadline
      : default24h;

    const finalOfferDate = offer_date || now.toISOString().replace('T', ' ').substring(0, 19);

    const stmt = db.prepare(`
      INSERT INTO offers (
        student_id, company_id, drive_id, offer_type, ctc_lpa, stipend_amount,
        stipend_period, ppo_status, acceptance_status, offer_date, acceptance_deadline, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `);

    const result = stmt.run(
      student_id,
      company_id,
      drive_id ? Number(drive_id) : null,
      offer_type,
      Number(ctc_lpa) || 0,
      Number(stipend_amount) || 0,
      stipend_period,
      ppo_status,
      finalOfferDate,
      finalDeadline,
      remarks
    );

    // Log policy evaluation in policy_reviews if it was a block/review
    if (policyResult.decision !== 'ALLOW') {
      db.prepare(`
        INSERT INTO policy_reviews (student_id, company_id, proposed_drive_id, rule_applied, decision, reasons, is_overridden, override_by, override_reason, override_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        student_id,
        company_id,
        drive_id ? Number(drive_id) : null,
        policyResult.ruleId,
        policyResult.decision,
        policyResult.reasons.join('; '),
        req.session.user.username,
        req.body.override_reason || 'Administrative override during offer dispatch'
      );
    }

    logAudit({
      req,
      action: 'CREATE_OFFER',
      entity: 'OFFER',
      entityId: result.lastInsertRowid,
      details: {
        student_id,
        placement_id: student.placement_id,
        company: company.name,
        offer_type,
        ctc_lpa,
        stipend_amount,
        policyDecision: policyResult.decision
      }
    });

    res.status(201).json({
      message: 'Offer recorded successfully',
      offer_id: result.lastInsertRowid,
      deadline: finalDeadline,
      policyResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/offers/:id/status - Update acceptance status (pending, accepted, declined, expired)
router.patch('/:id/status', requireAuth, requireRoles('Administrator', 'Officer'), (req, res) => {
  try {
    const { acceptance_status, joining_status, remarks } = req.body;
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const prevStatus = offer.acceptance_status;
    const newStatus = acceptance_status || offer.acceptance_status;
    const newJoining = joining_status || offer.joining_status;

    db.prepare(`
      UPDATE offers
      SET acceptance_status = ?, joining_status = ?, remarks = COALESCE(?, remarks), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, newJoining, remarks || null, req.params.id);

    // Update student's placement status if offer is accepted
    if (newStatus === 'accepted') {
      let updatedPlacementStatus = 'fte_only';
      if (offer.offer_type === 'I') updatedPlacementStatus = 'internship_only';
      else if (offer.offer_type === 'I+F') updatedPlacementStatus = 'internship_ppo_fte';

      db.prepare(`
        UPDATE students
        SET placement_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(updatedPlacementStatus, offer.student_id);
    }

    logAudit({
      req,
      action: 'UPDATE_OFFER_STATUS',
      entity: 'OFFER',
      entityId: req.params.id,
      details: { previousStatus: prevStatus, newStatus, newJoining }
    });

    res.json({ message: 'Offer status updated successfully', acceptance_status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
