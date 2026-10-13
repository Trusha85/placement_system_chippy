import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { sanitizeCsvField } from '../middleware/sanitize.js';

const router = express.Router();

// GET /api/stats/dashboard - Compute live metrics directly from SQLite database
router.get('/dashboard', requireAuth, (req, res) => {
  try {
    const user = req.session.user;
    let programmeFilter = '';
    let params = [];

    if (user.role === 'Coordinator' && user.assigned_programme) {
      programmeFilter = 'WHERE programme = ?';
      params.push(user.assigned_programme);
    }

    // 1. Overall Student Counts
    const studentCounts = db.prepare(`
      SELECT
        COUNT(*) as total_students,
        SUM(CASE WHEN registration_status = 'registered' THEN 1 ELSE 0 END) as registered_count,
        SUM(CASE WHEN registration_status = 'deregistered' THEN 1 ELSE 0 END) as deregistered_count,
        SUM(CASE WHEN academic_eligibility = 'eligible' THEN 1 ELSE 0 END) as eligible_count,
        SUM(CASE WHEN academic_eligibility = 'ineligible' THEN 1 ELSE 0 END) as ineligible_count,
        SUM(CASE WHEN academic_eligibility = 'pending_verification' THEN 1 ELSE 0 END) as pending_verification_count,
        SUM(CASE WHEN placement_status != 'unplaced' THEN 1 ELSE 0 END) as placed_count,
        SUM(CASE WHEN placement_status = 'unplaced' THEN 1 ELSE 0 END) as unplaced_count
      FROM students
      ${programmeFilter}
    `).get(...params);

    // 2. Offer Type Counts (I, F, I+F)
    const offerTypeCounts = db.prepare(`
      SELECT
        offer_type,
        COUNT(*) as count,
        SUM(CASE WHEN acceptance_status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
        SUM(CASE WHEN acceptance_status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM offers o
      JOIN students s ON o.student_id = s.id
      ${programmeFilter ? 'WHERE s.programme = ?' : ''}
      GROUP BY offer_type
    `).all(...(programmeFilter ? [user.assigned_programme] : []));

    // 3. Compensation Metrics (FTE CTC: Highest, Average, Median)
    const fteCtcList = db.prepare(`
      SELECT ctc_lpa
      FROM offers o
      JOIN students s ON o.student_id = s.id
      WHERE (o.offer_type = 'F' OR o.offer_type = 'I+F')
        AND o.acceptance_status = 'accepted'
        AND o.ctc_lpa > 0
        ${programmeFilter ? 'AND s.programme = ?' : ''}
      ORDER BY ctc_lpa ASC
    `).all(...(programmeFilter ? [user.assigned_programme] : [])).map(r => Number(r.ctc_lpa));

    let highestCtc = 0;
    let avgCtc = 0;
    let medianCtc = 0;

    if (fteCtcList.length > 0) {
      highestCtc = fteCtcList[fteCtcList.length - 1];
      const sum = fteCtcList.reduce((acc, val) => acc + val, 0);
      avgCtc = Number((sum / fteCtcList.length).toFixed(2));

      const mid = Math.floor(fteCtcList.length / 2);
      if (fteCtcList.length % 2 !== 0) {
        medianCtc = fteCtcList[mid];
      } else {
        medianCtc = Number(((fteCtcList[mid - 1] + fteCtcList[mid]) / 2).toFixed(2));
      }
    }

    // 4. Internship Stipend Statistics Separately
    const stipendList = db.prepare(`
      SELECT stipend_amount
      FROM offers o
      JOIN students s ON o.student_id = s.id
      WHERE (o.offer_type = 'I' OR o.offer_type = 'I+F')
        AND o.acceptance_status = 'accepted'
        AND o.stipend_amount > 0
        ${programmeFilter ? 'AND s.programme = ?' : ''}
      ORDER BY stipend_amount ASC
    `).all(...(programmeFilter ? [user.assigned_programme] : [])).map(r => Number(r.stipend_amount));

    let minStipend = 0;
    let maxStipend = 0;
    let avgStipend = 0;

    if (stipendList.length > 0) {
      minStipend = stipendList[0];
      maxStipend = stipendList[stipendList.length - 1];
      const sum = stipendList.reduce((acc, v) => acc + v, 0);
      avgStipend = Math.round(sum / stipendList.length);
    }

    // 5. Unique Placed Students vs Total Offers
    const uniquePlaced = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as unique_placed
      FROM offers o
      JOIN students s ON o.student_id = s.id
      WHERE o.acceptance_status = 'accepted'
      ${programmeFilter ? 'AND s.programme = ?' : ''}
    `).get(...(programmeFilter ? [user.assigned_programme] : [])).unique_placed;

    const totalOffersAccepted = db.prepare(`
      SELECT COUNT(*) as total_offers
      FROM offers o
      JOIN students s ON o.student_id = s.id
      WHERE o.acceptance_status = 'accepted'
      ${programmeFilter ? 'AND s.programme = ?' : ''}
    `).get(...(programmeFilter ? [user.assigned_programme] : [])).total_offers;

    // 6. Course-wise Outcomes
    const courseStats = db.prepare(`
      SELECT
        s.programme,
        COUNT(*) as total,
        SUM(CASE WHEN s.placement_status != 'unplaced' THEN 1 ELSE 0 END) as placed,
        SUM(CASE WHEN s.placement_status = 'unplaced' THEN 1 ELSE 0 END) as unplaced,
        ROUND(AVG(s.cgpa), 2) as avg_cgpa
      FROM students s
      GROUP BY s.programme
    `).all();

    // 7. Company Category Distribution
    const categoryStats = db.prepare(`
      SELECT
        c.category,
        COUNT(DISTINCT c.id) as company_count,
        COUNT(o.id) as offers_count
      FROM companies c
      LEFT JOIN offers o ON c.id = o.company_id AND o.acceptance_status = 'accepted'
      GROUP BY c.category
      ORDER BY c.category ASC
    `).all();

    // 8. Pending Cases (Offer acceptance deadline, joining, and policy reviews)
    const pendingOfferAcceptances = db.prepare(`
      SELECT COUNT(*) as count FROM offers WHERE acceptance_status = 'pending'
    `).get().count;

    const pendingPolicyReviews = db.prepare(`
      SELECT COUNT(*) as count FROM policy_reviews WHERE is_overridden = 0
    `).get().count;

    const disciplinaryCases = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as count FROM drive_attendance WHERE manual_review_status = 'disciplinary_review'
    `).get().count;

    // 9. Students Eligible for Subsequent Drives
    // Registered, eligible, not in A+, not holding I+F
    const eligibleSubsequent = db.prepare(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.registration_status = 'registered'
        AND s.academic_eligibility = 'eligible'
        AND s.archived = 0
        AND s.id NOT IN (
          SELECT student_id FROM offers
          WHERE acceptance_status = 'accepted'
            AND (offer_type = 'I+F' OR ctc_lpa >= 16.0)
        )
    `).get().count;

    res.json({
      studentCounts: {
        total: studentCounts.total_students || 0,
        registered: studentCounts.registered_count || 0,
        deregistered: studentCounts.deregistered_count || 0,
        eligible: studentCounts.eligible_count || 0,
        ineligible: studentCounts.ineligible_count || 0,
        pendingVerification: studentCounts.pending_verification_count || 0,
        placed: studentCounts.placed_count || 0,
        unplaced: studentCounts.unplaced_count || 0,
        placementRate: studentCounts.registered_count > 0 ? Number(((studentCounts.placed_count / studentCounts.registered_count) * 100).toFixed(1)) : 0
      },
      compensation: {
        highestCtc,
        avgCtc,
        medianCtc,
        fteOfferCount: fteCtcList.length,
        minStipend,
        maxStipend,
        avgStipend,
        stipendOfferCount: stipendList.length
      },
      offerDistribution: {
        uniquePlaced,
        totalOffersAccepted,
        byType: offerTypeCounts,
        byCategory: categoryStats
      },
      courseStats,
      subsequentDriveEligibleCount: eligibleSubsequent,
      pendingAlerts: {
        pendingOfferAcceptances,
        pendingPolicyReviews,
        disciplinaryCases
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/export-csv - Secure CSV report export
router.get('/export-csv', requireAuth, requireRoles('Administrator', 'Officer', 'Coordinator'), (req, res) => {
  try {
    const user = req.session.user;
    let sql = `
      SELECT
        s.placement_id,
        s.full_name,
        s.programme,
        s.academic_batch,
        s.cgpa,
        s.registration_status,
        s.academic_eligibility,
        s.placement_status,
        COALESCE(c.name, 'N/A') as placed_company,
        COALESCE(c.category, 'N/A') as company_category,
        COALESCE(o.offer_type, 'N/A') as offer_type,
        COALESCE(o.ctc_lpa, 0) as ctc_lpa,
        COALESCE(o.stipend_amount, 0) as stipend_amount,
        COALESCE(o.acceptance_status, 'N/A') as acceptance_status
      FROM students s
      LEFT JOIN offers o ON s.id = o.student_id AND o.acceptance_status = 'accepted'
      LEFT JOIN companies c ON o.company_id = c.id
    `;
    let params = [];

    if (user.role === 'Coordinator' && user.assigned_programme) {
      sql += ' WHERE s.programme = ?';
      params.push(user.assigned_programme);
    }

    sql += ' ORDER BY s.programme ASC, s.placement_id ASC';
    const rows = db.prepare(sql).all(...params);

    const headers = [
      'Placement ID',
      'Full Name',
      'Programme',
      'Batch',
      'CGPA',
      'Registration Status',
      'Academic Eligibility',
      'Placement Status',
      'Placed Company',
      'Category',
      'Offer Type',
      'FTE CTC (LPA)',
      'Monthly Stipend (INR)',
      'Acceptance Status'
    ];

    let csvContent = headers.map(h => sanitizeCsvField(h)).join(',') + '\r\n';

    for (const r of rows) {
      const line = [
        sanitizeCsvField(r.placement_id),
        sanitizeCsvField(r.full_name),
        sanitizeCsvField(r.programme),
        sanitizeCsvField(r.academic_batch),
        sanitizeCsvField(r.cgpa),
        sanitizeCsvField(r.registration_status),
        sanitizeCsvField(r.academic_eligibility),
        sanitizeCsvField(r.placement_status),
        sanitizeCsvField(r.placed_company),
        sanitizeCsvField(r.company_category),
        sanitizeCsvField(r.offer_type),
        sanitizeCsvField(r.ctc_lpa),
        sanitizeCsvField(r.stipend_amount),
        sanitizeCsvField(r.acceptance_status)
      ].join(',');
      csvContent += line + '\r\n';
    }

    logAudit({
      req,
      action: 'EXPORT_CSV',
      entity: 'REPORT',
      details: { rowCount: rows.length, programmeScope: user.assigned_programme || 'ALL' }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="NFSU_PlacementGuard_Report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
