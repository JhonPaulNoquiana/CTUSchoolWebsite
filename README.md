# CTU Main Campus Digital Portal

A role-based school information system for Cebu Technological University – Main Campus. It combines public new-student and transferee admissions with secure portals for students, teachers, the Registrar, Cashier, Clinic, and system administrators.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript | Responsive single-page interface and role dashboards |
| Backend | Node.js and Express 5 | REST API, authentication, authorization, validation, and static-file hosting |
| Database | PostgreSQL | Users, academic records, billing, clinic visits, requests, and audit records |
| Database driver | `pg` | PostgreSQL connection pool and parameterized queries |
| Configuration | `dotenv` | Loads `DATABASE_URL`, `TOKEN_SECRET`, and `PORT` from `.env` |
| Authentication | HMAC-signed bearer tokens | Eight-hour authenticated sessions |
| Password security | PostgreSQL `pgcrypto` | Salted bcrypt-compatible password hashes using `crypt()` |

No frontend framework or build step is required. Express serves the files inside `public/` directly.

## Project structure

```text
NoquianaAP6/
├── backend/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection pool
│   ├── scripts/
│   │   ├── schema.sql         # Tables, enums, constraints, and indexes
│   │   └── seed.js            # Schema runner and demonstration data
│   └── server.js              # Express server, authentication, and REST APIs
├── public/
│   ├── css/style.css          # Responsive UI styles
│   ├── js/main.js             # SPA rendering and API interactions
│   └── index.html             # Browser entry point
├── .env.example               # Environment variable template
├── notes.md                   # Detailed installation and run guide
└── package.json               # Dependencies and npm commands
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

```bash
npm start       # Start the application normally
npm run dev     # Start with automatic restart after source changes
npm run db:setup # Create/update the schema and insert demo data
```

For full setup instructions and demonstration credentials, see [notes.md](notes.md).

## Production considerations

Before deploying the system publicly:

- Replace all seeded passwords and use a long random `TOKEN_SECRET`.
- Serve the application through HTTPS.
- Limit database privileges to only those required by the application.
- Add rate limiting to the sign-in route.
- Add database backups, monitoring, and centralized error logging.
- Review privacy access controls for educational and medical records.
- Move bearer-token storage to secure, HTTP-only cookies if the deployment threat model requires it.
