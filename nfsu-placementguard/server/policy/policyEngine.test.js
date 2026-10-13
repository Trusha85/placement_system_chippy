import { evaluatePlacementPolicy, getCompanyCategoryByCTC, DEFAULT_POLICY_CONFIG } from './policyEngine.js';

export function runPolicyTests() {
  console.log('\n--- [TEST SUITE 1: Policy Engine Core Rules] ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Unregistered student blocked
  const resUnreg = evaluatePlacementPolicy({ registration_status: 'not registered', academic_eligibility: 'eligible' }, [], { package_ctc: 12 });
  assert(resUnreg.decision === 'BLOCK' && resUnreg.ruleId === 'RULE_REGISTRATION_STATUS', 'Unregistered student must be BLOCKED');

  // 2. Academically ineligible student blocked
  const resInelig = evaluatePlacementPolicy({ registration_status: 'registered', academic_eligibility: 'ineligible' }, [], { package_ctc: 12 });
  assert(resInelig.decision === 'BLOCK' && resInelig.ruleId === 'RULE_ACADEMIC_INELIGIBLE', 'Academically ineligible student must be BLOCKED');

  // 3. Pending academic verification triggers MANUAL_REVIEW
  const resPendingVerif = evaluatePlacementPolicy({ registration_status: 'registered', academic_eligibility: 'pending_verification' }, [], { package_ctc: 12 });
  assert(resPendingVerif.decision === 'MANUAL_REVIEW' && resPendingVerif.ruleId === 'RULE_ELIGIBILITY_PENDING', 'Pending verification triggers MANUAL_REVIEW');

  // 4. Consecutive unexcused absences (>=3) triggers MANUAL_REVIEW
  const resAbsences = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [],
    { package_ctc: 12 },
    { consecutive_unexcused_absences: 3 }
  );
  assert(resAbsences.decision === 'MANUAL_REVIEW' && resAbsences.ruleId === 'RULE_ABSENTEEISM_DISCIPLINARY', '3 consecutive absences flags MANUAL_REVIEW (never automatic exclusion)');

  // 5. Unplaced eligible student gets ALLOW
  const resUnplaced = evaluatePlacementPolicy({ registration_status: 'registered', academic_eligibility: 'eligible', cgpa: 8.5 }, [], { package_ctc: 14, min_cgpa: 7.0 });
  assert(resUnplaced.decision === 'ALLOW' && resUnplaced.ruleId === 'RULE_UNPLACED_ELIGIBLE', 'Unplaced eligible student is ALLOWED');

  // 6. A+ Tier Lockout (package >= 16 LPA)
  const resAPlus = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 22.5, acceptance_status: 'accepted' }],
    { package_ctc: 25.0 }
  );
  assert(resAPlus.decision === 'BLOCK' && resAPlus.ruleId === 'RULE_APLUS_LOCK', 'Student with accepted A+ offer is locked from further drives');

  // 7. A Tier (10-16 LPA) switching:
  // a) Switching from A (12 LPA) to another A (14 LPA) -> BLOCK
  const resAToA = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 12.0, acceptance_status: 'accepted' }],
    { package_ctc: 14.0, company_category: 'A' }
  );
  assert(resAToA.decision === 'BLOCK' && resAToA.ruleId === 'RULE_A_SWITCHING_RESTRICTION', 'Category A holder switching to Category A is BLOCKED');

  // b) Switching from A (12 LPA) to A+ (18 LPA) -> ALLOW
  const resAToAPlus = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 12.0, acceptance_status: 'accepted' }],
    { package_ctc: 18.0, company_category: 'A+' }
  );
  assert(resAToAPlus.decision === 'ALLOW' && resAToAPlus.ruleId === 'RULE_A_TO_APLUS_UPGRADE', 'Category A holder upgrading to Category A+ is ALLOWED');

  // 8. B Tier (6-10 LPA) 1.5x Multiplier rule:
  // Current: 8 LPA. 1.5x threshold = 12 LPA.
  // a) Target = 10 LPA (< 1.5x) -> BLOCK
  const resBSubMult = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 8.0, acceptance_status: 'accepted' }],
    { package_ctc: 10.0 }
  );
  assert(resBSubMult.decision === 'BLOCK' && resBSubMult.ruleId === 'RULE_B_1_5X_UPGRADE_FAILED', 'Category B holder switching with < 1.5x package is BLOCKED');

  // b) Target = 12.5 LPA (>= 1.5x) -> ALLOW
  const resBSuperMult = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 8.0, acceptance_status: 'accepted' }],
    { package_ctc: 12.5 }
  );
  assert(resBSuperMult.decision === 'ALLOW' && resBSuperMult.ruleId === 'RULE_B_1_5X_UPGRADE_PASSED', 'Category B holder switching with >= 1.5x package is ALLOWED');

  // 9. Offer Type I (Internship-Only):
  // a) Applying for another I -> BLOCK
  const resIToI = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'I', stipend_amount: 40000, acceptance_status: 'accepted' }],
    { role_type: 'I', package_ctc: 0 }
  );
  assert(resIToI.decision === 'BLOCK' && resIToI.ruleId === 'RULE_INTERNSHIP_DUPLICATE_BLOCK', 'Internship-only holder applying for another I role is BLOCKED');

  // b) Applying for F -> ALLOW
  const resIToF = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'I', stipend_amount: 40000, acceptance_status: 'accepted' }],
    { role_type: 'F', package_ctc: 9.0 }
  );
  assert(resIToF.decision === 'ALLOW' && resIToF.ruleId === 'RULE_INTERNSHIP_UPGRADE_TO_FTE', 'Internship-only holder applying for F role is ALLOWED');

  // 10. Offer Type I+F Accepted -> Complete Lockout
  const resIFLock = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'I+F', ctc_lpa: 15.0, acceptance_status: 'accepted' }],
    { role_type: 'F', package_ctc: 25.0 }
  );
  assert(resIFLock.decision === 'BLOCK' && resIFLock.ruleId === 'RULE_IF_COMPLETE_LOCK', 'Dual I+F offer holder is completely LOCKED from further drives');

  // 11. Expired/Declined offers do not lock
  const resExpired = evaluatePlacementPolicy(
    { registration_status: 'registered', academic_eligibility: 'eligible' },
    [{ offer_type: 'F', ctc_lpa: 25.0, acceptance_status: 'expired' }],
    { role_type: 'F', package_ctc: 10.0 }
  );
  assert(resExpired.decision === 'ALLOW', 'Expired offer does not lock student');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('policyEngine.test.js')) {
  const result = runPolicyTests();
  if (result.failed > 0) process.exit(1);
}
