import { runPolicyTests } from '../policy/policyEngine.test.js';
import { db, initializeDatabase } from '../db/database.js';
import { seedData } from '../db/seed.js';
import { maskSensitiveStudentData, sanitizeCsvField } from '../middleware/sanitize.js';

async function runAllTests() {
  console.log('====================================================');
  console.log('   NFSU PLACEMENTGUARD - AUTOMATED TEST SUITE');
  console.log('====================================================');

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      totalPassed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      totalFailed++;
    }
  }

  // 1. Run Policy Engine Tests
  const policyResults = runPolicyTests();
  totalPassed += policyResults.passed;
  totalFailed += policyResults.failed;

  // 2. Database Integration & Duplicate Placement ID Test
  console.log('\n--- [TEST SUITE 2: Database Integrity & Constraints] ---');
  seedData(); // Reseed fresh test database

  // Test duplicate ID rejection
  let duplicateCaught = false;
  try {
    const stmt = db.prepare(`
      INSERT INTO students (placement_id, full_name, mobile, email, programme, academic_batch)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    // Attempt inserting existing placement ID: NFSU26MTCS001
    stmt.run('NFSU26MTCS001', 'Clone Student', '9999999999', 'clone@nfsu.ac.in', 'M.Tech. Computer Science', '2024-2026');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('placement_id')) {
      duplicateCaught = true;
    }
  }
  assert(duplicateCaught, 'Duplicate Placement ID insert must trigger UNIQUE constraint violation');

  // 3. Stipend vs CTC Distinction Test
  console.log('\n--- [TEST SUITE 3: Stipend vs CTC Distinction] ---');
  const offersWithSeparateFigures = db.prepare(`
    SELECT ctc_lpa, stipend_amount, stipend_period
    FROM offers
    WHERE offer_type = 'I+F'
  `).all();

  assert(offersWithSeparateFigures.length > 0, 'Offers table records dual I+F offers');
  const dualOffer = offersWithSeparateFigures[0];
  assert(dualOffer.ctc_lpa === 18.0, `Dual offer records annual CTC in LPA (got: ${dualOffer.ctc_lpa} LPA)`);
  assert(dualOffer.stipend_amount === 50000, `Dual offer records monthly internship stipend in INR separately (got: ₹${dualOffer.stipend_amount})`);
  assert(dualOffer.stipend_period === '6 Months', 'Dual offer records distinct stipend duration period');

  // 4. Role-based PII Redaction Test
  console.log('\n--- [TEST SUITE 4: Role-based PII & Data Protection] ---');
  const rawStudent = {
    full_name: 'Aarav Mehta',
    mobile: '+91 98250 11001',
    email: 'aarav.mehta@students.nfsu.ac.in',
    cgpa: 9.2
  };

  const recruiterView = maskSensitiveStudentData(rawStudent, 'Recruiter');
  assert(recruiterView.mobile.includes('*****'), `Recruiter view masks mobile number (got: ${recruiterView.mobile})`);
  assert(recruiterView.email.includes('***'), `Recruiter view masks email address (got: ${recruiterView.email})`);
  assert(recruiterView.full_name === 'Aarav Mehta', 'Recruiter retains access to student name');

  const adminView = maskSensitiveStudentData(rawStudent, 'Administrator');
  assert(adminView.mobile === '+91 98250 11001', 'Administrator retains access to unredacted mobile number');

  // 5. CSV Formula Injection Defense Test
  console.log('\n--- [TEST SUITE 5: CSV Formula Injection (CWE-1236) Defense] ---');
  const dangerousPayload1 = '=cmd|/c calc.exe!A1';
  const sanitized1 = sanitizeCsvField(dangerousPayload1);
  assert(sanitized1.startsWith("\"'="), `Payload starting with '=' prepended with single quote: ${sanitized1}`);

  const dangerousPayload2 = '+1234567';
  const sanitized2 = sanitizeCsvField(dangerousPayload2);
  assert(sanitized2.startsWith("\"'+"), `Payload starting with '+' prepended with single quote: ${sanitized2}`);

  const normalPayload = 'M.Tech. Computer Science';
  const sanitizedNormal = sanitizeCsvField(normalPayload);
  assert(sanitizedNormal === '"M.Tech. Computer Science"', `Normal string escaped cleanly: ${sanitizedNormal}`);

  // Summary
  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('====================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
