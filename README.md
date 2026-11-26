# CTU Main Campus Digital Portal

A role-based school information system for Cebu Technological University – Main Campus. It combines public new-student and transferee admissions with secure portals for students, teachers, the Registrar, Cashier, Clinic, and system administrators.

## Required JavaScript concepts implemented

> **This system uses all six required JavaScript concepts: Arrays, Objects, Functions, Factory, JavaScript Basics (Variables), and Singleton Pattern.**

- **1. Arrays** — Role navigation lists, meeting days, and course assignments.
- **2. Objects** — Application state, user data, and account profile objects.
- **3. Functions** — Authentication, validation, API requests, and reusable helpers.
- **4. Factory** — `createAccountProfile(role)` creates student, teacher, or staff profile objects using the Simple Factory pattern.
- **5. JavaScript Basics (Variables)** — `const` and `let` store configuration, application state, and values used in workflows.
- **6. Singleton Pattern** — One exported database pool is shared across backend modules within each Node.js process.

See the [JavaScript grading checklist](#javascript-grading-checklist) for implementation details and code locations for each requirement.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, Vite, CSS3 | Responsive single-page interface and role dashboards |
| Backend | Node.js and Express 5 | REST API, authentication, authorization, validation, and static-file hosting |
| Database | PostgreSQL | Users, academic records, billing, clinic visits, requests, and audit records |
| Database driver | `pg` | PostgreSQL connection pool and parameterized queries |
| Configuration | `dotenv` | Loads `DATABASE_URL`, `TOKEN_SECRET`, and `PORT` from `backend/.env` |
| Authentication | HMAC-signed bearer tokens | Eight-hour authenticated sessions |
| Password security | PostgreSQL `pgcrypto` | Salted bcrypt-compatible password hashes using `crypt()` |

Vite runs the React frontend during development and creates the production bundle in `frontend/dist/`. Express serves that bundle in production and continues to provide the `/api` routes. The frontend and backend are independently installable applications.

## Project structure

```text
NoquianaAP6/
├── backend/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection pool
│   ├── scripts/
│   │   ├── schema.sql         # Tables, enums, constraints, and indexes
│   │   └── seed.js            # Schema runner and demonstration data
│   ├── .env.example           # Backend environment variable template
│   ├── package.json           # Express and PostgreSQL dependencies
│   └── server.js              # Express server, authentication, and REST APIs
├── frontend/
│   ├── src/
│   │   ├── legacy/portal.js   # Existing portal workflows mounted by React
│   │   ├── styles/            # Responsive UI styles
│   │   ├── App.jsx            # React application shell
│   │   └── main.jsx           # React entry point
│   ├── index.html             # Vite browser entry point
│   ├── package.json           # React and Vite dependencies
│   └── vite.config.mjs        # Dev server and API proxy configuration
├── notes.md                   # Detailed installation and run guide
└── README.md                  # Project overview
```

## System request flow

```text
Browser interface
      │
      │  JSON request + bearer token
      ▼
Express REST API
      │
      ├── verifies the signed session token
      ├── checks the user's role
      ├── validates the requested operation
      └── executes parameterized SQL
              │
              ▼
          PostgreSQL
              │
              ├── returns records
              └── stores an audit entry for important actions
```

1. A user signs in with an email address or university ID.
2. The API compares the supplied password with the `pgcrypto` hash in `users`.
3. The API returns an eight-hour signed bearer token.
4. The browser stores that token and includes it with subsequent API requests.
5. Server middleware verifies the token and rejects routes outside the user's role.
6. The appropriate dashboard is rendered from live PostgreSQL data.

## Roles and workflows

### Public admissions

- Incoming first-year applicants select **New student** and submit their preferred program and personal information.
- Applicants who previously attended another college select **Transferee** and supply their previous school, program, and last school year.
- Every submission receives a unique application number.
- Applicants can track the application with that number and the email used during registration.
- The Registrar moves applications through submitted, under review, approved, or rejected.
- Approval generates the official student number, portal account, student profile, and draft semester enrollment.
- When the applicant tracks an approved application, they verify their birth date and create their own portal password. The password is hashed immediately and is never shown to the Registrar.

### Administrator

- View system totals and recent audit activity.
- Create accounts for all supported roles.
- Activate or deactivate user accounts.
- Browse student, academic, financial, clinic, and enrollment data.
- Publish announcements to selected audiences.
- Create academic terms and control whether enrollment is open.
- Create courses with program, year level, units, lecture/laboratory hours, semester, and prerequisites.
- Access block-section management and institution-wide finance records.

Creating a user with the `student` role also creates a basic student profile. Creating a `teacher` account creates the corresponding faculty profile.

### Student

- View the current schedule, instructors, rooms, and subject units.
- View midterm/final grades and attendance.
- Review assessments, payments, and outstanding balances.
- Submit and track official document requests.
- View their own clinic encounter history.
- Read student and university-wide announcements.
- Choose one eligible block section for the current semester. The system uses the regular/irregular classification maintained by the Registrar; students cannot change it themselves.
- Review the complete course and schedule bundle attached to a section; courses cannot be individually added or removed by the student.

An approved study load becomes read-only online. Schedule adjustments then require Registrar assistance.

### Teacher

- View assigned classes and class lists.
- Update midterm grades, final grades, and attendance.
- Read university announcements.
- View a day-by-day weekly teaching schedule containing every assigned section, room, and time.

Teacher assignments are mandatory. A block cannot be saved if any course has no active teacher. The API rejects overlapping assignments when the same teacher is scheduled on a shared meeting day and time. It also prevents two classes from occupying the same room at the same time.

### Registrar

- Browse official student records and the academic catalog.
- Review enrollment records and update their status.
- Process document requests through pending, processing, ready, released, or rejected states.
- Publish Registrar announcements.
- Review new-student and transferee admission applications.
- Approve applicants and direct them to self-service account activation.
- Validate regular and irregular semester enrollment submissions.
- Inspect the chosen section and every attached course before approving enrollment.
- Create and edit block sections for the current term.
- Attach courses to a block and assign a teacher, meeting days, start/end time, and room to every course.
- Set block program, year level, regular/irregular classification, capacity, and active status.
- Change a student's regular/irregular classification while no enrollment is approved.

Blocks with pending, approved, or completed enrollment records cannot have their course bundle replaced or be deactivated. This preserves the students' official enrollment history.

### Cashier

- Browse student billing accounts.
- Create itemized student assessments with category, amount, due date, and notes.
- Record partial or full payments with payment method and a unique official reference number.
- Prevent zero, negative, duplicate-reference, and overpayments.
- Automatically maintain Unpaid, Partial, and Paid assessment states.
- View transaction history and printable payment receipts.
- Void an incorrect payment with a required reason while preserving its audit history and recalculating the balance.
- Monitor daily collections, transactions, and receivables.

### Clinic staff

- Search the student directory.
- Record complaints, assessments, treatments, vital signs, and disposition.
- View confidential patient-visit history.
- Monitor daily and monthly visit totals.

## Main database entities

- `users`, `students`, and `teachers` store identities and role profiles.
- `departments`, `programs`, and `courses` define the academic catalog.
- `academic_terms`, `academic_blocks`, `class_sections`, `enrollments`, and `enrollment_items` manage block-section registration, schedules, grades, and attendance.
- `billing_items` and `payments` manage student accounts.
- `clinic_visits` stores campus health encounters.
- `document_requests` tracks Registrar requests.
- `admission_applications` stores public new-student and transferee applications.
- `announcements` delivers role-aware campus notices.
- `audit_logs` records security-relevant activity.

Foreign keys, unique constraints, validation checks, and indexes are defined in `backend/scripts/schema.sql`.

## API overview

| Area | Example endpoints |
|---|---|
| Authentication | `POST /api/auth/login`, `GET /api/me` |
| Public admissions | `GET /api/public/programs`, `POST /api/public/admissions`, `POST /api/public/admissions/status` |
| Dashboard | `GET /api/dashboard` |
| Announcements | `GET /api/announcements`, `POST /api/announcements` |
| Administration | `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id/status` |
| Academic setup | `POST /api/admin/terms`, `POST /api/admin/courses` |
| Block sections | `GET/POST /api/registrar/blocks`, `PUT /api/registrar/blocks/:id` |
| Student | `/api/student/schedule`, `/grades`, `/billing`, `/clinic`, `/documents` |
| Teacher | `/api/teacher/classes`, `/api/teacher/grades/:id` |
| Registrar | `/api/registrar/enrollments`, `/api/registrar/documents` |
| Cashier | `/api/cashier/accounts`, `/api/cashier/assessments`, `/api/cashier/payments` |
| Clinic | `/api/clinic/visits` |

## npm commands

The backend is configured for the **SchoolWebsiteCTU** Supabase project using database `postgres`. Existing records have been migrated; `db:setup` is only needed for a fresh development database. The backend verifies Supabase TLS certificates using the bundled CA, and its existing API handles application authentication and authorization.

```bash
cd backend
npm install
npm run db:setup # Create/update the schema and insert demo data
npm run dev      # Start the Express API with automatic restart

cd ../frontend
npm install
npm run dev      # Start the React development server
npm run build    # Build frontend/dist for Express production serving
```

For full setup instructions and demonstration credentials, see [notes.md](notes.md).

## JavaScript grading checklist

All six concepts are used in application workflows:

| Requirement | Implementation | Where to demonstrate it |
|---|---|---|
| Arrays | Each role has an array of navigation entries; meeting days use array filtering and mapping. | `frontend/src/legacy/portal.js`: `nav`; `backend/server.js`: `normalizeDays()` |
| Objects | `state` groups the current token, user, details, and page. Profile objects group role-specific behavior. | `frontend/src/legacy/portal.js`: `state`; `backend/factories/account-profile.js` |
| Functions | Named, arrow, and asynchronous functions handle validation, API calls, and authorization. | `backend/server.js`: `normalizeDays()`, `auth()`, `audit()` |
| Factory | `createAccountProfile(role)` selects and creates a `StudentProfile`, `TeacherProfile`, or `StaffProfile`. Each object has the same `save()` interface. | `backend/factories/account-profile.js`; called by `POST /api/users` in `backend/server.js` |
| JavaScript basics / variables | `const` stores bindings such as `state` and `profile`; `let` holds reassigned values such as the block ID. | `frontend/src/legacy/portal.js`; `backend/server.js`: `saveAcademicBlock()` |
| Singleton Pattern | The database module constructs and exports one shared pool. CommonJS caches the module so imports within one backend process receive the same instance. | `backend/config/db.js`: `pool` and `module.exports` |

Factory demonstration: when an administrator creates a student, the factory returns a student profile object that saves the academic details. For a teacher, it returns a teacher profile object that saves faculty details. Other staff roles need only the account record. Both the account and its profile are saved within the same database transaction.

The factory is a **Simple Factory**, rather than the inheritance-based Factory Method variant. The database is a **module Singleton per Node.js process**, and its shared pool manages multiple database connections.

Run `npm --prefix backend test` to check profile selection, defaults, failure propagation, and shared pool identity. These tests do not connect to or modify the database.

## Production considerations

Before deploying the system publicly:

- Replace all seeded passwords and use a long random `TOKEN_SECRET`.
- Serve the application through HTTPS.
- Limit database privileges to only those required by the application.
- Add rate limiting to the sign-in route.
- Add database backups, monitoring, and centralized error logging.
- Review privacy access controls for educational and medical records.
- Move bearer-token storage to secure, HTTP-only cookies if the deployment threat model requires it.
