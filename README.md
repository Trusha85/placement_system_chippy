# NFSU PlacementGuard | Secure Policy-Driven Placement System

[![Author](https://img.shields.io/badge/Author-Trusha85-blue.svg)](https://github.com/Trusha85)
[![Repository](https://img.shields.io/badge/GitHub-placement__system__chippy-black.svg)](https://github.com/Trusha85/placement_system_chippy)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()

> A secure, policy-driven student placement management administration system designed and engineered for **National Forensic Sciences University (NFSU), Gandhinagar**. Built with cybersecurity safeguards, role-based access control, automated placement policy evaluation, and audit logging.

---

## 📁 Repository Overview

This repository includes both the modern full-stack production application and the reference prototype:

| Subproject | Stack | Description | Directory |
| :--- | :--- | :--- | :--- |
| **NFSU PlacementGuard (Full Stack)** | **React 18 + Vite, Express, SQLite, Recharts** | Production-ready full-stack platform with dynamic dashboard, live policy engine simulator, audit logging, and automated test suite. | [`/nfsu-placementguard`](./nfsu-placementguard) |
| **Placement System (Django Prototype)** | **Python, Django 5, SQLite** | Reference backend implementation with student records, placement drives, and coordinator interfaces. | [`/placement_system`](./placement_system) |

---

## 🛡️ NFSU PlacementGuard (Full Stack Application)

### Key Features
- **Strict Role-Based Access Control (RBAC)**: Enforced on both server and client for Administrator, Placement Officer, Course Coordinator (scoped by department), and Recruiter.
- **Cybersecurity & Data Protection**:
  - `bcryptjs` password hashing
  - Server-side sessions with CSRF origin validation
  - Recruiter PII redaction (masking phone numbers and personal emails)
  - CSV formula injection sanitization (`=`, `+`, `-`, `@` neutralization)
  - Immutable audit logs for compliance
- **Policy Engine**:
  - Enforces NFSU tier rules (Super Dream Tier A+, Dream Tier A, Core Tier B, Mass Tier C)
  - Separate stipend vs CTC calculations
  - Offer acceptance rules & 24-hour expiration tracking
- **Interactive UI**:
  - Cybersecurity-themed enterprise dashboard
  - Program-wise placement stats and salary analytics
  - Real-time policy simulator

### Quick Start (NFSU PlacementGuard)

#### Prerequisites
- Node.js (v18+) & npm

#### Running the Full Stack App
```powershell
# Navigate to the full-stack project directory
cd nfsu-placementguard

# Option 1: Development Mode (Concurrent)
# Terminal 1: Backend API
cd server
npm install
npm run dev

# Terminal 2: Vite React Frontend
cd ../client
npm install
npm run dev
# Open http://localhost:5173

# Option 2: Run Tests
cd ../server
npm test
```

### Pre-seeded Demo Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@NFSU2026` |
| **Placement Officer** | `officer` | `Officer@NFSU2026` |
| **Course Coordinator (CS)** | `coord_cs` | `CoordCS@NFSU2026` |
| **Recruiter (CyberShield Corp)** | `recruiter` | `Recruit@NFSU2026` |

---

## 🐍 Django Placement System Prototype

### Prerequisites
- Python 3.10+

### Quick Start (Django)
```powershell
cd placement_system\placement_system
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

---

## 👩‍💻 Author & Maintainer

- **Trusha Parmar** — GitHub: [@Trusha85](https://github.com/Trusha85)
