import bcrypt from 'bcryptjs';
import { db, initializeDatabase } from './database.js';

export function seedData() {
  initializeDatabase();

  // Clear existing records to ensure clean state
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM policy_reviews;
    DELETE FROM drive_attendance;
    DELETE FROM offers;
    DELETE FROM recruitment_drives;
    DELETE FROM companies;
    DELETE FROM students;
    DELETE FROM users;
  `);

  console.log('Seeding demo users...');
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@NFSU2026!', salt);
  const officerHash = bcrypt.hashSync('Officer@NFSU2026!', salt);
  const coordHash = bcrypt.hashSync('Coord@NFSU2026!', salt);
  const recruiterHash = bcrypt.hashSync('Recruit@NFSU2026!', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, email, role, company_id, assigned_programme)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', adminHash, 'Prof. Arvind Trivedi', 'admin.placement@nfsu.ac.in', 'Administrator', null, null);
  insertUser.run('officer', officerHash, 'Dr. Sunita Sharma', 'officer.placement@nfsu.ac.in', 'Officer', null, null);
  insertUser.run('coordinator_cs', coordHash, 'Dr. Rajesh Patel', 'coord.cs@nfsu.ac.in', 'Coordinator', null, 'M.Tech. Computer Science');
  insertUser.run('coordinator_dfis', coordHash, 'Dr. Meera Nambiar', 'coord.dfis@nfsu.ac.in', 'Coordinator', null, 'M.Sc. Digital Forensics and Information Security');

  console.log('Seeding companies...');
  const insertCompany = db.prepare(`
    INSERT INTO companies (id, name, category, industry, job_description, contact_email, min_cgpa, allowed_programmes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCompany.run(1, 'SentinelOne Labs', 'A+', 'Endpoint Autonomous Security', 'Security Research Engineer (Adversarial ML & Kernel Exploits)', 'campus@sentinelone.example.com', 8.0, JSON.stringify(['M.Tech. Computer Science', 'M.Tech. Artificial Intelligence and Data Science', 'M.Sc. Digital Forensics and Information Security']));
  insertCompany.run(2, 'CloudStrike Threat Intel', 'A+', 'Threat Intelligence & Detection', 'Cloud Security Architect & Reverse Engineer', 'hiring@cloudstrike.example.com', 7.5, JSON.stringify(['M.Tech. Computer Science', 'B.Tech.–M.Tech. Computer Science and Engineering', 'M.Sc. Digital Forensics and Information Security']));
  insertCompany.run(3, 'Tata Cyber Defense', 'A', 'Managed Detection & Response', 'SOC Specialist & Vulnerability Analyst', 'talent@tatacyber.example.com', 7.0, JSON.stringify(['M.Tech. Computer Science', 'M.Tech. Artificial Intelligence and Data Science', 'B.Tech.–M.Tech. Computer Science and Engineering', 'M.Sc. Computer Science', 'M.Sc. Digital Forensics and Information Security']));
  insertCompany.run(4, 'Fortinet Threat Research', 'A', 'Network Security Hardware & Software', 'Firmware Security Engineer', 'careers@fortinet.example.com', 7.2, JSON.stringify(['M.Tech. Computer Science', 'B.Tech.–M.Tech. Computer Science and Engineering']));
  insertCompany.run(5, 'CyberArk Global', 'B', 'Privileged Access Management', 'Identity Security Developer', 'india.campus@cyberark.example.com', 6.5, JSON.stringify(['M.Tech. Computer Science', 'M.Tech. Artificial Intelligence and Data Science', 'B.Tech.–M.Tech. Computer Science and Engineering', 'M.Sc. Computer Science']));
  insertCompany.run(6, 'QuickHeal Enterprise', 'B', 'Security Software Solutions', 'Threat Analyst & Malware Investigator', 'recruiting@quickheal.example.com', 6.0, JSON.stringify(['M.Sc. Digital Forensics and Information Security', 'M.Sc. Computer Science', 'B.Tech.–M.Tech. Computer Science and Engineering']));
  insertCompany.run(7, 'SecurePath Tech', 'C', 'IT Security Consultancy', 'Junior Penetration Tester', 'hr@securepathtech.example.com', 6.0, JSON.stringify(['M.Tech. Computer Science', 'M.Tech. Artificial Intelligence and Data Science', 'B.Tech.–M.Tech. Computer Science and Engineering', 'M.Sc. Computer Science', 'M.Sc. Digital Forensics and Information Security']));
  insertCompany.run(8, 'InfoShield Services', 'C', 'Security Audits & Compliance', 'GRC Associate', 'jobs@infoshield.example.com', 5.5, JSON.stringify(['M.Sc. Computer Science', 'M.Sc. Digital Forensics and Information Security']));

  // Assign recruiter to Tata Cyber Defense
  insertUser.run('recruiter_tata', recruiterHash, 'Vikram Malhotra', 'talent@tatacyber.example.com', 'Recruiter', 3, null);

  console.log('Seeding students across all 5 NFSU programmes...');
  const insertStudent = db.prepare(`
    INSERT INTO students (id, placement_id, full_name, mobile, email, programme, academic_batch, cgpa, registration_status, academic_eligibility, placement_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const studentsList = [
    // 1. M.Tech. Computer Science
    [1, 'NFSU26MTCS001', 'Aarav Mehta', '+91 98250 11001', 'aarav.mehta@students.nfsu.ac.in', 'M.Tech. Computer Science', '2024-2026', 9.2, 'registered', 'eligible', 'fte_only'],
    [2, 'NFSU26MTCS002', 'Bhavna Kulkarni', '+91 98250 11002', 'bhavna.k@students.nfsu.ac.in', 'M.Tech. Computer Science', '2024-2026', 8.4, 'registered', 'eligible', 'unplaced'],
    [3, 'NFSU26MTCS003', 'Chetan Vora', '+91 98250 11003', 'chetan.v@students.nfsu.ac.in', 'M.Tech. Computer Science', '2024-2026', 7.1, 'registered', 'eligible', 'fte_only'],
    [4, 'NFSU26MTCS004', 'Divya Nair', '+91 98250 11004', 'divya.n@students.nfsu.ac.in', 'M.Tech. Computer Science', '2024-2026', 8.8, 'registered', 'eligible', 'internship_only'],

    // 2. M.Tech. Artificial Intelligence and Data Science
    [5, 'NFSU26AIDS001', 'Eshan Bhatt', '+91 98250 22001', 'eshan.bhatt@students.nfsu.ac.in', 'M.Tech. Artificial Intelligence and Data Science', '2024-2026', 9.5, 'registered', 'eligible', 'internship_ppo_fte'],
    [6, 'NFSU26AIDS002', 'Farah Siddiqui', '+91 98250 22002', 'farah.s@students.nfsu.ac.in', 'M.Tech. Artificial Intelligence and Data Science', '2024-2026', 8.1, 'registered', 'eligible', 'unplaced'],
    [7, 'NFSU26AIDS003', 'Gautam Rao', '+91 98250 22003', 'gautam.r@students.nfsu.ac.in', 'M.Tech. Artificial Intelligence and Data Science', '2024-2026', 7.9, 'registered', 'eligible', 'fte_only'],

    // 3. B.Tech.–M.Tech. Computer Science and Engineering (CS)
    [8, 'NFSU26BMCS001', 'Harshita Joshi', '+91 98250 33001', 'harshita.j@students.nfsu.ac.in', 'B.Tech.–M.Tech. Computer Science and Engineering', '2021-2026', 8.7, 'registered', 'eligible', 'fte_only'],
    [9, 'NFSU26BMCS002', 'Ishan Deshmukh', '+91 98250 33002', 'ishan.d@students.nfsu.ac.in', 'B.Tech.–M.Tech. Computer Science and Engineering', '2021-2026', 7.6, 'registered', 'eligible', 'unplaced'],
    [10, 'NFSU26BMCS003', 'Juhi Chawla', '+91 98250 33003', 'juhi.c@students.nfsu.ac.in', 'B.Tech.–M.Tech. Computer Science and Engineering', '2021-2026', 6.4, 'registered', 'pending_verification', 'unplaced'],

    // 4. M.Sc. Computer Science
    [11, 'NFSU26MSCS001', 'Karan Singhania', '+91 98250 44001', 'karan.s@students.nfsu.ac.in', 'M.Sc. Computer Science', '2024-2026', 8.3, 'registered', 'eligible', 'fte_only'],
    [12, 'NFSU26MSCS002', 'Lavanya Iyer', '+91 98250 44002', 'lavanya.i@students.nfsu.ac.in', 'M.Sc. Computer Science', '2024-2026', 7.8, 'deregistered', 'eligible', 'unplaced'],
    [13, 'NFSU26MSCS003', 'Manish Pandey', '+91 98250 44003', 'manish.p@students.nfsu.ac.in', 'M.Sc. Computer Science', '2024-2026', 6.2, 'registered', 'ineligible', 'unplaced'],

    // 5. M.Sc. Digital Forensics and Information Security (DFIS)
    [14, 'NFSU26DFIS001', 'Neha Verma', '+91 98250 55001', 'neha.v@students.nfsu.ac.in', 'M.Sc. Digital Forensics and Information Security', '2024-2026', 9.1, 'registered', 'eligible', 'fte_only'],
    [15, 'NFSU26DFIS002', 'Omkar Patil', '+91 98250 55002', 'omkar.p@students.nfsu.ac.in', 'M.Sc. Digital Forensics and Information Security', '2024-2026', 8.5, 'registered', 'eligible', 'unplaced'],
    [16, 'NFSU26DFIS003', 'Pooja Hegde', '+91 98250 55003', 'pooja.h@students.nfsu.ac.in', 'M.Sc. Digital Forensics and Information Security', '2024-2026', 8.2, 'registered', 'eligible', 'fte_only'],
    [17, 'NFSU26DFIS004', 'Qasim Ali', '+91 98250 55004', 'qasim.ali@students.nfsu.ac.in', 'M.Sc. Digital Forensics and Information Security', '2024-2026', 7.4, 'registered', 'eligible', 'unplaced']
  ];

  for (const s of studentsList) {
    insertStudent.run(...s);
  }

  console.log('Seeding recruitment drives...');
  const insertDrive = db.prepare(`
    INSERT INTO recruitment_drives (id, company_id, title, drive_date, role_type, package_ctc, stipend_monthly, stipend_period, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDrive.run(1, 1, 'SentinelOne Autonomous Security Drive 2026', '2026-11-05', 'F', 22.5, 60000, '6 Months', 'active');
  insertDrive.run(2, 2, 'CloudStrike Threat Intel Specialist Drive', '2026-11-12', 'I+F', 18.0, 50000, '6 Months', 'active');
  insertDrive.run(3, 3, 'Tata Cyber Defense Campus Hiring', '2026-11-18', 'F', 13.5, 35000, '6 Months', 'active');
  insertDrive.run(4, 4, 'Fortinet Threat Research Firmware Drive', '2026-11-25', 'F', 11.0, 30000, '6 Months', 'active');
  insertDrive.run(5, 5, 'CyberArk IAM Identity Fellowship', '2026-12-02', 'I', 0, 45000, '6 Months', 'active');
  insertDrive.run(6, 6, 'QuickHeal Malware Research Drive', '2026-12-08', 'F', 8.0, 25000, '6 Months', 'active');
  insertDrive.run(7, 7, 'SecurePath Tech Cyber Analyst Drive', '2026-12-15', 'F', 5.2, 18000, '6 Months', 'active');

  console.log('Seeding drive attendance and disciplinary test flags...');
  const insertAttendance = db.prepare(`
    INSERT INTO drive_attendance (drive_id, student_id, stage, status, emergency_exception_approved, manual_review_status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Student 17 (Qasim Ali) has missed 3 drives consecutively -> flags manual review
  insertAttendance.run(1, 17, 'PPT', 'absent', 0, 'flagged_absent', 'Unexcused absence at PPT stage');
  insertAttendance.run(2, 17, 'Assessment', 'absent', 0, 'flagged_absent', 'Did not appear for online lab test');
  insertAttendance.run(3, 17, 'Technical Interview', 'absent', 0, 'disciplinary_review', '3rd consecutive absence - flagged for suspension review');

  // Student 2 (Bhavna Kulkarni) attended PPT & Assessment
  insertAttendance.run(1, 2, 'PPT', 'present', 0, 'none', 'Attended on time');
  insertAttendance.run(1, 2, 'Assessment', 'present', 0, 'none', 'Cleared threshold');

  console.log('Seeding existing offers for policy simulation...');
  const insertOffer = db.prepare(`
    INSERT INTO offers (id, student_id, company_id, drive_id, offer_type, ctc_lpa, stipend_amount, stipend_period, ppo_status, acceptance_status, offer_date, acceptance_deadline, joining_status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Aarav Mehta (M.Tech CS): Accepted A+ Offer (22.5 LPA) -> Triggers RULE_APLUS_LOCK
  insertOffer.run(1, 1, 1, 1, 'F', 22.5, 0, 'N/A', 'not applicable', 'accepted', '2026-10-01', '2026-10-03', 'joined', 'SentinelOne A+ Dream selection.');

  // 2. Chetan Vora (M.Tech CS): Accepted B Category Offer (7.5 LPA from CyberArk) -> Tests 1.5x Multiplier rule
  insertOffer.run(2, 3, 5, null, 'F', 7.5, 25000, '6 Months', 'not applicable', 'accepted', '2026-10-02', '2026-10-04', 'pending', 'CyberArk B tier offer.');

  // 3. Divya Nair (M.Tech CS): Accepted Internship-Only (I) offer (₹45k/mo) -> Tests Rule: Block another I, allow F/I+F
  insertOffer.run(3, 4, 5, 5, 'I', 0, 45000, '6 Months', 'pending', 'accepted', '2026-10-05', '2026-10-07', 'pending', 'CyberArk Research Internship.');

  // 4. Eshan Bhatt (M.Tech AIDS): Accepted I+F Offer (18 LPA + 50k stipend) -> Triggers RULE_IF_COMPLETE_LOCK
  insertOffer.run(4, 5, 2, 2, 'I+F', 18.0, 50000, '6 Months', 'offered', 'accepted', '2026-10-06', '2026-10-08', 'pending', 'CloudStrike Dual Internship + FTE package.');

  // 5. Gautam Rao (M.Tech AIDS): Accepted Category A Offer (13.5 LPA from Tata Cyber Defense) -> Can ONLY switch to A+
  insertOffer.run(5, 7, 3, 3, 'F', 13.5, 35000, '6 Months', 'not applicable', 'accepted', '2026-10-07', '2026-10-09', 'pending', 'Tata Cyber Defense Category A offer.');

  // 6. Harshita Joshi (B.Tech-M.Tech): Accepted Category C Offer (5.2 LPA from SecurePath) -> Tests Upward mobility
  insertOffer.run(6, 8, 7, 7, 'F', 5.2, 18000, '6 Months', 'not applicable', 'accepted', '2026-10-08', '2026-10-10', 'pending', 'SecurePath initial offer.');

  // 7. Karan Singhania (M.Sc CS): Pending Offer from QuickHeal (8.0 LPA) -> Pending 24-hr acceptance deadline
  const now = new Date();
  const deadline = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  insertOffer.run(7, 11, 6, 6, 'F', 8.0, 25000, '6 Months', 'not applicable', 'pending', now.toISOString().replace('T', ' ').substring(0, 19), deadline, 'pending', 'Awaiting student confirmation within 24hr window.');

  // 8. Neha Verma (M.Sc DFIS): Expired Offer from InfoShield (4.5 LPA) -> Expired offers do not lock student
  insertOffer.run(8, 14, 8, null, 'F', 4.5, 15000, '6 Months', 'not applicable', 'expired', '2026-09-15', '2026-09-16', 'declined', 'Student did not accept within 24h window; offer expired without locking.');

  // 9. Pooja Hegde (M.Sc DFIS): Accepted Category A Offer (11.0 LPA from Fortinet)
  insertOffer.run(9, 16, 4, 4, 'F', 11.0, 30000, '6 Months', 'not applicable', 'accepted', '2026-10-09', '2026-10-11', 'pending', 'Fortinet Firmware Security Engineer.');

  console.log('Seeding policy review logs...');
  const insertPolicyReview = db.prepare(`
    INSERT INTO policy_reviews (student_id, company_id, proposed_drive_id, rule_applied, decision, reasons, is_overridden, override_by, override_reason, override_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPolicyReview.run(1, 2, 2, 'RULE_APLUS_LOCK', 'BLOCK', 'Student Aarav Mehta already holds an accepted A+ category offer (22.5 LPA) from SentinelOne. Further placement blocked.', 0, null, null, null);
  insertPolicyReview.run(7, 4, 4, 'RULE_A_SWITCHING_RESTRICTION', 'BLOCK', 'Student Gautam Rao holds Category A offer (13.5 LPA). Attempted switch to Fortinet (11.0 LPA, Category A) blocked: can only switch to Category A+ (>=16 LPA).', 0, null, null, null);
  insertPolicyReview.run(17, 3, 3, 'RULE_ABSENTEEISM_DISCIPLINARY', 'MANUAL_REVIEW', 'Qasim Ali has 3 consecutive unexcused drive absences. Requires human review before allowing participation.', 0, null, null, null);

  console.log('Seeding audit logs...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, entity, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(1, 'admin', 'Administrator', 'SEED_SYSTEM', 'SYSTEM', '0', 'Initial demo dataset seeded securely with NFSU cyber placement records', '127.0.0.1');
  insertAudit.run(2, 'officer', 'Officer', 'CREATE_OFFER', 'OFFER', '1', 'Recorded SentinelOne A+ offer for Aarav Mehta (NFSU26MTCS001)', '127.0.0.1');
  insertAudit.run(2, 'officer', 'Officer', 'EVALUATE_POLICY', 'POLICY', '1', 'Evaluated CloudStrike drive for Aarav Mehta -> Result: BLOCK (A+ Lockout)', '127.0.0.1');

  console.log('Database seeded successfully!');
}

// If run directly via node db/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  seedData();
  process.exit(0);
}
