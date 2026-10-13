/**
 * NFSU PlacementGuard - Core Policy Engine
 * Evaluates student eligibility and company drive participation against university placement policies.
 * 
 * Rules:
 * 1. Pre-requisite checks: Registration status, Academic Eligibility, Absenteeism flag.
 * 2. Category tier logic:
 *    - A+ (>= 16 LPA): No switching. Placed students in A+ are strictly out of process.
 *    - A (10 - 16 LPA): Switching allowed ONLY to A+ category companies.
 *    - B (6 - 10 LPA): Further placement allowed only if new package >= 1.5x existing package.
 *    - C (< 6 LPA): Higher category opportunities (B, A, A+) are allowed.
 * 3. Offer type constraints:
 *    - Selected in 'I' (Internship-only): Blocks another 'I', allows 'F' or 'I+F'.
 *    - Selected in 'F' (FTE-only): Blocks another 'F', allows 'I' if other rules pass.
 *    - Selected in 'I+F': Blocks further I, F, and I+F roles completely.
 * 4. Offer Status:
 *    - Only 'accepted' offers are binding final selections.
 *    - 'pending' offers can trigger a MANUAL_REVIEW if another active drive is being attempted.
 *    - 'declined' and 'expired' offers do not constrain subsequent applications.
 */

export const DEFAULT_POLICY_CONFIG = {
  APLUS_THRESHOLD_LPA: 16.0,
  A_THRESHOLD_LPA: 10.0,
  B_THRESHOLD_LPA: 6.0,
  B_SWITCH_MULTIPLIER: 1.5,
  MAX_CONSECUTIVE_UNEXCUSED_ABSENCES: 3
};

/**
 * Categorize a package CTC in LPA
 */
export function getCompanyCategoryByCTC(ctcLpa, config = DEFAULT_POLICY_CONFIG) {
  if (ctcLpa >= config.APLUS_THRESHOLD_LPA) return 'A+';
  if (ctcLpa >= config.A_THRESHOLD_LPA) return 'A';
  if (ctcLpa >= config.B_THRESHOLD_LPA) return 'B';
  return 'C';
}

/**
 * Evaluates policy for a student applying or being placed in a target drive/company.
 * 
 * @param {Object} student - Student record
 * @param {Array} existingOffers - Array of student's past/current offers
 * @param {Object} targetDrive - Target drive details { company_category, package_ctc, role_type, min_cgpa, allowed_programmes }
 * @param {Object} attendanceHistory - { consecutive_unexcused_absences, has_pending_disciplinary_flag }
 * @param {Object} customConfig - Optional policy overrides
 * @returns {Object} { decision: 'ALLOW' | 'BLOCK' | 'MANUAL_REVIEW', ruleId: string, ruleName: string, reasons: string[], metadata: object }
 */
export function evaluatePlacementPolicy(
  student,
  existingOffers = [],
  targetDrive = {},
  attendanceHistory = {},
  customConfig = {}
) {
  const config = { ...DEFAULT_POLICY_CONFIG, ...customConfig };
  const reasons = [];

  // 1. REGISTRATION CHECK
  if (!student || student.registration_status !== 'registered') {
    return {
      decision: 'BLOCK',
      ruleId: 'RULE_REGISTRATION_STATUS',
      ruleName: 'Placement Registration Inactive',
      reasons: [`Student status is '${student?.registration_status || 'not registered'}'. Only registered students can participate in placement activities.`],
      canOverride: true,
      metadata: { registration_status: student?.registration_status }
    };
  }

  // 2. ACADEMIC ELIGIBILITY CHECK
  if (student.academic_eligibility === 'ineligible') {
    return {
      decision: 'BLOCK',
      ruleId: 'RULE_ACADEMIC_INELIGIBLE',
      ruleName: 'Academically Ineligible',
      reasons: ['Student is marked as Academically Ineligible by Academic Affairs due to pending backlogs or attendance criteria.'],
      canOverride: true,
      metadata: { academic_eligibility: student.academic_eligibility }
    };
  }

  if (student.academic_eligibility === 'pending_verification') {
    return {
      decision: 'MANUAL_REVIEW',
      ruleId: 'RULE_ELIGIBILITY_PENDING',
      ruleName: 'Academic Verification Pending',
      reasons: ['Academic credentials or grade sheet verification is pending. Requires Placement Officer review before drive confirmation.'],
      canOverride: true,
      metadata: { academic_eligibility: student.academic_eligibility }
    };
  }

  // 3. COMPANY SPECIFIC CRITERIA (CGPA & Programme)
  if (targetDrive.min_cgpa && student.cgpa && student.cgpa < targetDrive.min_cgpa) {
    return {
      decision: 'BLOCK',
      ruleId: 'RULE_CGPA_CRITERIA',
      ruleName: 'Minimum CGPA Requirement Not Met',
      reasons: [`Drive requires minimum CGPA of ${targetDrive.min_cgpa}. Student has CGPA ${student.cgpa}.`],
      canOverride: true,
      metadata: { required_cgpa: targetDrive.min_cgpa, student_cgpa: student.cgpa }
    };
  }

  if (targetDrive.allowed_programmes && Array.isArray(targetDrive.allowed_programmes) && targetDrive.allowed_programmes.length > 0) {
    if (!targetDrive.allowed_programmes.includes(student.programme)) {
      return {
        decision: 'BLOCK',
        ruleId: 'RULE_PROGRAMME_DISALLOWED',
        ruleName: 'Programme Excluded by Company Criteria',
        reasons: [`Target company has restricted drive to: ${targetDrive.allowed_programmes.join(', ')}. Student is enrolled in '${student.programme}'.`],
        canOverride: true,
        metadata: { allowed: targetDrive.allowed_programmes, student_programme: student.programme }
      };
    }
  }

  // 4. ATTENDANCE & ABSENTEEISM DISCIPLINARY REVIEW
  const unexcused = attendanceHistory.consecutive_unexcused_absences || 0;
  if (unexcused >= config.MAX_CONSECUTIVE_UNEXCUSED_ABSENCES || attendanceHistory.has_pending_disciplinary_flag) {
    return {
      decision: 'MANUAL_REVIEW',
      ruleId: 'RULE_ABSENTEEISM_DISCIPLINARY',
      ruleName: 'Attendance / Disciplinary Review Flagged',
      reasons: [
        `Student has ${unexcused} consecutive unexcused drive absences. Flagged for potential 3-drive suspension. Official policy requires human placement officer review rather than automated exclusion.`
      ],
      canOverride: true,
      metadata: { consecutive_unexcused_absences: unexcused }
    };
  }

  // 5. EXISTING OFFERS EVALUATION
  // Filter only binding offers: 'accepted'
  const acceptedOffers = existingOffers.filter(o => o.acceptance_status === 'accepted');
  const pendingOffers = existingOffers.filter(o => o.acceptance_status === 'pending');

  // If student has pending offers, flag for manual review if they're attempting another drive while pending
  if (pendingOffers.length > 0 && !targetDrive.is_system_evaluation) {
    reasons.push(`Student currently has ${pendingOffers.length} pending offer awaiting acceptance decision.`);
  }

  // If no accepted offers, student is eligible for any role
  if (acceptedOffers.length === 0) {
    return {
      decision: 'ALLOW',
      ruleId: 'RULE_UNPLACED_ELIGIBLE',
      ruleName: 'Standard Eligible (No Existing Accepted Offers)',
      reasons: ['Student is registered, academically eligible, and holds no prior accepted offers.'],
      canOverride: false,
      metadata: { accepted_offers_count: 0 }
    };
  }

  // Find existing offer types held
  const hasAcceptedIF = acceptedOffers.some(o => o.offer_type === 'I+F');
  const hasAcceptedF = acceptedOffers.some(o => o.offer_type === 'F');
  const hasAcceptedI = acceptedOffers.some(o => o.offer_type === 'I');

  const targetRoleType = targetDrive.role_type || 'F';
  const targetCategory = targetDrive.company_category || (targetDrive.package_ctc ? getCompanyCategoryByCTC(targetDrive.package_ctc, config) : 'C');
  const targetCTC = targetDrive.package_ctc || 0;

  // RULE: I+F Accepted -> Block further I, F, or I+F roles at any other organization
  if (hasAcceptedIF) {
    return {
      decision: 'BLOCK',
      ruleId: 'RULE_IF_COMPLETE_LOCK',
      ruleName: 'Dual Internship + FTE Lockout',
      reasons: [
        'Student has already accepted an Internship + FTE (I+F) package. Under NFSU policy, students with I+F selections are strictly locked from all further placement processes.'
      ],
      canOverride: true,
      metadata: { current_offers: acceptedOffers }
    };
  }

  // Check highest current FTE package
  const existingFTEOffers = acceptedOffers.filter(o => o.offer_type === 'F' || o.offer_type === 'I+F');
  const highestCurrentCTC = existingFTEOffers.reduce((max, o) => Math.max(max, Number(o.ctc_lpa) || 0), 0);
  const highestAcceptedOffer = existingFTEOffers.sort((a, b) => (Number(b.ctc_lpa) || 0) - (Number(a.ctc_lpa) || 0))[0];
  const highestCategory = highestAcceptedOffer ? (highestAcceptedOffer.company_category || getCompanyCategoryByCTC(highestCurrentCTC, config)) : null;

  // RULE: A+ Category Accepted (>= 16 LPA) -> No switching allowed, student is completely out of process
  if (highestCategory === 'A+' || highestCurrentCTC >= config.APLUS_THRESHOLD_LPA) {
    return {
      decision: 'BLOCK',
      ruleId: 'RULE_APLUS_LOCK',
      ruleName: 'A+ Category Dream Offer Lockout',
      reasons: [
        `Student holds an accepted A+ category offer (${highestCurrentCTC} LPA). Under university policy, no switching is permitted once placed in A+ tier; student is out of the placement process.`
      ],
      canOverride: true,
      metadata: { current_ctc: highestCurrentCTC, target_ctc: targetCTC }
    };
  }

  // RULE OFFER TYPE INTERNSHIP-ONLY ('I')
  // After internship-only selection, block another 'I' role, but allow 'F' or 'I+F' if other checks pass.
  if (hasAcceptedI && !hasAcceptedF) {
    if (targetRoleType === 'I') {
      return {
        decision: 'BLOCK',
        ruleId: 'RULE_INTERNSHIP_DUPLICATE_BLOCK',
        ruleName: 'Internship-Only Repeat Block',
        reasons: [
          'Student has already accepted an Internship-only role. University policy permits only one primary internship offer; student is eligible solely for Full-Time (F) or Dual (I+F) recruitment.'
        ],
        canOverride: true,
        metadata: { current_offer_type: 'I', target_role_type: targetRoleType }
      };
    }
    // Student can pursue F or I+F
    return {
      decision: 'ALLOW',
      ruleId: 'RULE_INTERNSHIP_UPGRADE_TO_FTE',
      ruleName: 'Internship to Full-Time Upgrade Permitted',
      reasons: [
        'Student holds an Internship-only selection and is eligible to participate in Full-Time (F) or Dual (I+F) placement drives.'
      ],
      canOverride: false,
      metadata: { current_offer_type: 'I', target_role_type: targetRoleType }
    };
  }

  // RULE OFFER TYPE FTE-ONLY ('F')
  // After FTE-only selection, block another 'F' role (unless valid tier upgrade), but allow 'I' if other checks pass.
  if (hasAcceptedF) {
    if (targetRoleType === 'I') {
      // Allowed if student doesn't hold an internship
      if (!hasAcceptedI) {
        return {
          decision: 'ALLOW',
          ruleId: 'RULE_FTE_SEEKING_INTERNSHIP',
          ruleName: 'Full-Time Placed Seeking Standalone Internship',
          reasons: [
            'Student holds an FTE offer with no preceding internship. Applying for a standalone semester internship is permitted.'
          ],
          canOverride: false,
          metadata: { target_role_type: targetRoleType }
        };
      } else {
        return {
          decision: 'BLOCK',
          ruleId: 'RULE_INTERNSHIP_ALREADY_HELD',
          ruleName: 'Internship Already Held',
          reasons: ['Student already holds both an internship and an FTE offer.'],
          canOverride: true,
          metadata: { target_role_type: targetRoleType }
        };
      }
    }

    // Now evaluate target role is F or I+F for student with existing FTE offer:
    // Check Category Tier Switching Rules:

    // 1. Existing Category is 'A' (10 - 16 LPA):
    // Switching is allowed ONLY to A+ category companies (package >= 16 LPA)
    if (highestCategory === 'A' || (highestCurrentCTC >= config.A_THRESHOLD_LPA && highestCurrentCTC < config.APLUS_THRESHOLD_LPA)) {
      if (targetCategory === 'A+' || targetCTC >= config.APLUS_THRESHOLD_LPA) {
        return {
          decision: 'ALLOW',
          ruleId: 'RULE_A_TO_APLUS_UPGRADE',
          ruleName: 'Category A to A+ Dream Upgrade Permitted',
          reasons: [
            `Student holds a Category A offer (${highestCurrentCTC} LPA). Upgrading to Category A+ (target: ${targetCTC} LPA) is authorized under university policy.`
          ],
          canOverride: false,
          metadata: { current_category: 'A', current_ctc: highestCurrentCTC, target_category: targetCategory, target_ctc: targetCTC }
        };
      } else {
        return {
          decision: 'BLOCK',
          ruleId: 'RULE_A_SWITCHING_RESTRICTION',
          ruleName: 'Category A Lateral/Sub-tier Switching Blocked',
          reasons: [
            `Student holds a Category A offer (${highestCurrentCTC} LPA). Under NFSU policy, Category A holders can ONLY switch to Category A+ (>= ${config.APLUS_THRESHOLD_LPA} LPA) companies. Target offer is Category ${targetCategory} (${targetCTC} LPA).`
          ],
          canOverride: true,
          metadata: { current_category: 'A', current_ctc: highestCurrentCTC, target_category: targetCategory, target_ctc: targetCTC }
        };
      }
    }

    // 2. Existing Category is 'B' (6 - 10 LPA):
    // Further placement is allowed if the new package is at least 1.5 times the existing package.
    if (highestCategory === 'B' || (highestCurrentCTC >= config.B_THRESHOLD_LPA && highestCurrentCTC < config.A_THRESHOLD_LPA)) {
      const minRequiredCTC = Number((highestCurrentCTC * config.B_SWITCH_MULTIPLIER).toFixed(2));
      if (targetCTC >= minRequiredCTC) {
        return {
          decision: 'ALLOW',
          ruleId: 'RULE_B_1_5X_UPGRADE_PASSED',
          ruleName: 'Category B 1.5x Multiplier Upgrade Permitted',
          reasons: [
            `Student holds Category B offer of ${highestCurrentCTC} LPA. Target package of ${targetCTC} LPA satisfies the policy requirement of >= 1.5x (${minRequiredCTC} LPA).`
          ],
          canOverride: false,
          metadata: { current_ctc: highestCurrentCTC, target_ctc: targetCTC, required_ctc: minRequiredCTC, multiplier: config.B_SWITCH_MULTIPLIER }
        };
      } else {
        return {
          decision: 'BLOCK',
          ruleId: 'RULE_B_1_5X_UPGRADE_FAILED',
          ruleName: 'Category B Insufficient Package Multiplier',
          reasons: [
            `Student holds Category B offer of ${highestCurrentCTC} LPA. Policy mandates that any subsequent placement offer must be at least 1.5x the current package (>= ${minRequiredCTC} LPA). Proposed package is ${targetCTC} LPA.`
          ],
          canOverride: true,
          metadata: { current_ctc: highestCurrentCTC, target_ctc: targetCTC, required_ctc: minRequiredCTC, multiplier: config.B_SWITCH_MULTIPLIER }
        };
      }
    }

    // 3. Existing Category is 'C' (< 6 LPA):
    // Higher-category opportunities (B, A, A+) are allowed as described in policy.
    if (highestCategory === 'C' || highestCurrentCTC < config.B_THRESHOLD_LPA) {
      if (targetCTC > highestCurrentCTC) {
        return {
          decision: 'ALLOW',
          ruleId: 'RULE_C_HIGHER_CATEGORY_PERMITTED',
          ruleName: 'Category C Upward Mobility Permitted',
          reasons: [
            `Student holds Category C offer (${highestCurrentCTC} LPA). Policy permits transitioning to higher tier compensation (proposed: ${targetCTC} LPA, Category ${targetCategory}).`
          ],
          canOverride: false,
          metadata: { current_ctc: highestCurrentCTC, target_ctc: targetCTC, target_category: targetCategory }
        };
      } else {
        return {
          decision: 'BLOCK',
          ruleId: 'RULE_C_LATERAL_SUB_BLOCK',
          ruleName: 'Category C Lateral/Lower Offer Blocked',
          reasons: [
            `Student already holds a Category C offer of ${highestCurrentCTC} LPA. Lateral or lower compensation drives are blocked to protect placement opportunities for unplaced peers.`
          ],
          canOverride: true,
          metadata: { current_ctc: highestCurrentCTC, target_ctc: targetCTC }
        };
      }
    }
  }

  // Fallback: Default to Manual Review if ambiguous state
  return {
    decision: 'MANUAL_REVIEW',
    ruleId: 'RULE_UNSPECIFIED_COMBINATION',
    ruleName: 'Complex Profile Policy Review',
    reasons: ['Edge combination detected. Case escalated for Placement Officer review.'],
    canOverride: true,
    metadata: { current_offers_count: acceptedOffers.length, target_ctc: targetCTC }
  };
}
