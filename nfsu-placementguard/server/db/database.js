import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'placementguard.db');

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode if applicable
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('SQLite PRAGMA foreign_keys warning:', e.message);
}

// Database schema initialization
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL, -- Administrator, Officer, Coordinator, Recruiter
      company_id INTEGER,
      assigned_programme TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      programme TEXT NOT NULL,
      academic_batch TEXT NOT NULL,
      cgpa REAL NOT NULL DEFAULT 8.0,
      registration_status TEXT NOT NULL DEFAULT 'registered', -- registered, deregistered, not registered
      academic_eligibility TEXT NOT NULL DEFAULT 'eligible', -- eligible, ineligible, pending_verification
      placement_status TEXT NOT NULL DEFAULT 'unplaced', -- unplaced, internship_only, fte_only, internship_ppo_fte
      archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- A+, A, B, C
      industry TEXT DEFAULT 'Cybersecurity & Tech',
      job_description TEXT,
      contact_email TEXT,
      min_cgpa REAL DEFAULT 6.5,
      allowed_programmes TEXT, -- JSON array string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recruitment_drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      title TEXT NOT NULL,
      drive_date TEXT NOT NULL,
      role_type TEXT NOT NULL, -- I, F, I+F
      package_ctc REAL DEFAULT 0, -- LPA
      stipend_monthly REAL DEFAULT 0, -- INR per month
      stipend_period TEXT DEFAULT '6 Months',
      status TEXT NOT NULL DEFAULT 'active', -- upcoming, active, completed, cancelled
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drive_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drive_id INTEGER NOT NULL REFERENCES recruitment_drives(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      stage TEXT NOT NULL, -- PPT, Assessment, Technical Interview, HR Interview
      status TEXT NOT NULL DEFAULT 'present', -- present, absent, excused
      emergency_exception_approved INTEGER DEFAULT 0,
      manual_review_status TEXT DEFAULT 'none', -- none, flagged_absent, approved_exception, disciplinary_review
      remarks TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      company_id INTEGER NOT NULL REFERENCES companies(id),
      drive_id INTEGER REFERENCES recruitment_drives(id),
      offer_type TEXT NOT NULL, -- I, F, I+F
      ctc_lpa REAL DEFAULT 0, -- FTE annual CTC in LPA
      stipend_amount REAL DEFAULT 0, -- Monthly stipend in INR
      stipend_period TEXT DEFAULT '6 Months', -- distinct from annual CTC
      ppo_status TEXT NOT NULL DEFAULT 'not applicable', -- not applicable, pending, offered, accepted, declined
      acceptance_status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
      offer_date TEXT NOT NULL,
      acceptance_deadline TEXT NOT NULL,
      joining_status TEXT DEFAULT 'pending', -- pending, joined, declined
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS policy_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      company_id INTEGER NOT NULL REFERENCES companies(id),
      proposed_drive_id INTEGER REFERENCES recruitment_drives(id),
      rule_applied TEXT NOT NULL,
      decision TEXT NOT NULL, -- ALLOW, BLOCK, MANUAL_REVIEW
      reasons TEXT NOT NULL,
      is_overridden INTEGER DEFAULT 0,
      override_by TEXT,
      override_reason TEXT,
      override_timestamp DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_username TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Initialize tables immediately
initializeDatabase();
