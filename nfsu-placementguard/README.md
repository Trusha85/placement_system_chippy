# NFSU PlacementGuard 🛡️
### Secure, Policy-Driven Student Placement Management System
*National Forensic Sciences University (NFSU), Gandhinagar*

---

## 1. Executive Summary & Problem Statement

University placement management in specialized national security institutions requires strict policy adherence, tamper-evident audit trails, and strict role-based access control. Uncontrolled placement switching deprives unplaced students of opportunities, while accidental disclosure of contact details to unauthorized recruiters compromises student privacy.

**NFSU PlacementGuard** is a full-stack, enterprise-grade placement administration and policy-enforcement system designed specifically for NFSU's specialized postgraduate cybersecurity, digital forensics, and computing cohorts. It replaces manual spreadsheets with an automated policy engine, server-enforced RBAC, 24-hour offer countdown timers, and live database-driven analytics.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 6, Plain Modern CSS (Dark Navy & Cyan Cyber Design System), Recharts 2, Lucide React
- **Backend**: Node.js v24 (ES Modules), Express 4 REST API
- **Database**: SQLite with high-performance synchronous execution engine (`node:sqlite` DatabaseSync)
- **Authentication**: `express-session` with server-side cookie sessions (`HttpOnly`, `SameSite=lax`), `bcryptjs` password hashing
- **Security & Hardening**: Helmet security headers, `express-rate-limit` on login, CSRF origin verification, CSV formula injection defense (CWE-1236), PII masking for recruiters, append-only audit trail
- **Validation**: Server-side parameterized queries, duplicate Placement ID detection

---

## 3. Required NFSU Programmes Supported

1. **M.Tech. Computer Science** (M.Tech. CS)
2. **M.Tech. Artificial Intelligence and Data Science** (M.Tech. AIDS)
3. **B.Tech.–M.Tech. Computer Science and Engineering** (Integrated CS)
4. **M.Sc. Computer Science** (M.Sc. CS)
5. **M.Sc. Digital Forensics and Information Security** (M.Sc. DFIS)

---

## 4. Policy Engine Rules & Specifications

The testable Policy Engine enforces the following institutional placement rules:

| Category Tier | Package Threshold | Switching & Upward Mobility Policy |
| :--- | :--- | :--- |
| **Tier A+ (Dream)** | **≥ ₹16.0 LPA** | **Strict Lockout:** Selected students are out of process; no further applications permitted. |
| **Tier A** | **₹10.0 – 16.0 LPA** | **Tier Upgrade Only:** Switching is permitted *only* to Tier A+ category companies (≥ 16 LPA). Lateral switches are blocked. |
| **Tier B** | **₹6.0 – 10.0 LPA** | **1.5× Multiplier Rule:** Subsequent placement is allowed only if target CTC is at least 1.5× existing CTC. |
| **Tier C** | **< ₹6.0 LPA** | Upward mobility permitted to Tier B, A, or A+ opportunities. |

### Offer Type Constraints
- **Type I (Internship-Only):** Selection blocks another 'I' role, but permits Full-Time (F) or Dual (I+F) drives.
- **Type F (FTE-Only):** Selection blocks another 'F' role (unless valid tier upgrade), but permits standalone semester internship (I).
- **Type I+F (Dual Package):** Blocks all further I, F, and I+F roles at any other organization.
- **Unaccepted/Expired Offers:** Offers that expire or are declined do *not* lock the candidate. Only accepted offers bind the candidate.
- **Absenteeism Disciplinary Review:** 3 consecutive unexcused drive absences flags candidate for manual review for potential 3-drive exclusion. Final disciplinary action is never imposed automatically.

---

## 5. Demo Accounts & Credentials

The system seeds realistic demo accounts across all 4 roles:

| Role | Username | Password | Access Scope & Privileges |
| :--- | :--- | :--- | :--- |
| **Placement Administrator** | `admin` | `Admin@NFSU2026!` | Full administrative control, user roles, policy override, audit logs, and reports. |
| **Placement Officer** | `officer` | `Officer@NFSU2026!` | Student & offer management, recruitment drives, attendance logging, policy reviews. |
| **Course Coordinator (CS)** | `coordinator_cs` | `Coord@NFSU2026!` | Read-only access scoped strictly to *M.Tech. Computer Science*. |
| **Course Coordinator (DFIS)** | `coordinator_dfis` | `Coord@NFSU2026!` | Read-only access scoped strictly to *M.Sc. Digital Forensics & Info Sec*. |
| **Recruiter (Tata Cyber)** | `recruiter_tata` | `Recruit@NFSU2026!` | Scoped to Tata Cyber Defense drive data; student mobile & email PII is masked. |

---

## 6. Setup & Execution Instructions (Windows PowerShell)

### Step 1: Open Terminal in Project Directory
```powershell
cd "C:\Users\Ms. Trusha Parmar\.gemini\antigravity-ide\scratch\nfsu-placementguard"
```

### Step 2: Seed the Database
```powershell
npm run seed
```
*(Initializes SQLite tables and seeds 17 students across all 5 NFSU programmes, 8 hiring partners, drives, offers, and demo accounts).*

### Step 3: Run the Automated Test Suite
```powershell
npm test
```
*(Executes all 26 automated unit and integration tests covering policy logic, CTC vs stipend distinction, duplicate IDs, PII masking, and CSV injection defense).*

### Step 4: Start the Server and Client
In Terminal 1 (Backend API on port 5000):
```powershell
npm run server
```

In Terminal 2 (Frontend on port 5173):
```powershell
npm run dev:client
```

Open your browser at: **`http://localhost:5173`**

*(Alternatively, the production build can be served in a single command using `npm start` at `http://localhost:5000`)*.

---

## 7. Main API Routes

- `POST /api/auth/login` - Authenticate and establish server-side session
- `POST /api/auth/logout` - Invalidate session cookie
- `GET  /api/auth/me` - Fetch authenticated user profile
- `GET  /api/auth/demo-accounts` - Retrieve demo accounts list
- `GET  /api/students` - Query students with search, filters, pagination, and role-based scoping
- `POST /api/students` - Register new student (Administrator/Officer)
- `PUT  /api/students/:id` - Update student profile
- `PATCH /api/students/:id/archive` - Soft-archive student record
- `GET  /api/companies` - List companies with category tiers and eligibility
- `POST /api/companies` - Register new hiring partner
- `GET  /api/drives` - List recruitment drives
- `POST /api/drives` - Schedule campus drive
- `GET  /api/drives/:id/attendance` - Fetch drive attendance roster
- `POST /api/drives/:id/attendance` - Record stage attendance/absence & review flag
- `GET  /api/offers` - Query offers with 24-hr countdown status
- `POST /api/offers` - Record offer with policy pre-check
- `PATCH /api/offers/:id/status` - Update offer acceptance or joining status
- `POST /api/policy/evaluate` - Pure real-time policy evaluation simulator
- `GET  /api/policy/reviews` - List policy escalation queue
- `POST /api/policy/reviews/:id/override` - Authorized policy override workflow
- `GET  /api/stats/dashboard` - Live database-derived KPIs and distribution metrics
- `GET  /api/stats/export-csv` - Secure CSV report export with CWE-1236 defense
- `GET  /api/audit-logs` - Query append-only security audit trail (Administrator)

---

## 8. Five-Minute Judge Demonstration Sequence

1. **Sign in as Placement Administrator (`admin` / `Admin@NFSU2026!`)**:
   - Inspect the **Placement Analytics Dashboard**: note the live KPIs (Highest CTC ₹22.5L, Average CTC, Median CTC, separate Internship Stipend ₹41k/mo, and 5-programme outcomes chart).
   - Click **Export CSV**: inspect the downloaded CSV and verify formula characters (`=`, `+`, `-`, `@`) are safely neutralized.
2. **Explore Student Directory**:
   - Search for `NFSU26MTCS001` (Aarav Mehta).
   - Click the **Eye icon** to open his profile drawer: view his SentinelOne A+ offer, CGPA (9.2), and attendance log.
3. **Execute Policy Simulator (Scenarios 1 & 2)**:
   - Go to **Policy Engine Simulator**.
   - Test **Aarav Mehta**: target any company → Observe immediate `BLOCK (RULE_APLUS_LOCK)`: Dream offer holder is locked from further drives.
   - Test **Chetan Vora** (holds 7.5 LPA): set target CTC to 10 LPA (<1.5×) → Observe `BLOCK (RULE_B_1_5X_UPGRADE_FAILED)`. Then set target to 13.5 LPA (≥1.5×) → Observe `ALLOW (RULE_B_1_5X_UPGRADE_PASSED)`.
4. **Review Policy Overrides Queue**:
   - Go to **Policy Reviews & Overrides**: inspect the flagged cases.
   - Click **Override**: enter an administrative reason (e.g., *"Special placement committee approval based on advanced research patent"*). Submit and verify the audited timestamp and actor attribution.
5. **Demonstrate Server-Enforced RBAC & PII Redaction**:
   - In the top navbar, select **Switch Role: Recruiter (Tata Cyber Defense)**.
   - Navigate to **Student Directory**: observe that mobile numbers and emails are automatically masked (`+91 98*****50 11001` and `aa***a@students.nfsu.ac.in`).
   - Notice the **Security Audit Trail** tab disappears from the sidebar.
   - Switch role back to **Course Coordinator (CS)**: observe the student list is strictly filtered to *M.Tech. Computer Science*.

---

## 9. Security Controls & Honest Limitations

### Implemented & Tested Security Controls
- **Parameterized SQL:** All queries execute via prepared statements, preventing SQL injection.
- **Server-Side Authorization:** Every protected route verifies `req.session.user.role` on the server.
- **Bcrypt Password Hashes:** Passwords are salted and hashed (10 rounds); zero plaintext passwords stored.
- **Session Fixation Defense:** Sessions are regenerated upon login with `HttpOnly` and `SameSite=lax` cookie flags.
- **CWE-1236 CSV Injection Defense:** Formula injection vectors starting with `=`, `+`, `-`, `@`, `\t`, `\r` are sanitized.
- **PII Data Masking:** Recruiter views redact student phone and email.
- **Append-Only Audit Log:** Captures actor, action, timestamp, entity ID, and client IP.

### Honest Limitations for Hackathon Prototype
- *Encryption at Rest:* Database file is stored unencrypted locally; enterprise deployments require SQLite SQLCipher or full disk BitLocker encryption.
- *MFA:* Multi-Factor Authentication (TOTP / SMS) is not implemented in this 2-hour prototype.
- *Session Store:* Uses default in-memory session store; a production deployment should back sessions with Redis or PostgreSQL.
