# Setup and Run Guide

This guide explains how to install and run the CTU Main Campus Digital Portal locally.

## 1. Prerequisites

Install the following software before continuing:

- Node.js 18 or newer
- npm, which is included with Node.js
- PostgreSQL
- A PostgreSQL database administration tool such as pgAdmin, although this is optional

Check that Node.js and npm are available:

```bash
node --version
npm --version
```

PostgreSQL must be running before the application or database setup command is started.

## 2. Open the project directory

In PowerShell or a VS Code terminal:

```powershell
cd C:\Users\jpaul\NoquianaAP6
```

All commands in this guide should be run from this directory.

## 3. Install Node.js dependencies

```bash
npm install
```

This installs Express, the PostgreSQL driver, and dotenv according to `package.json`.

## 4. Create the PostgreSQL database

Create a database named `SchoolDB` if it does not already exist.

Using PostgreSQL's command-line client:

```sql
CREATE DATABASE "SchoolDB";
```

If the database is already connected and working, do not create it again.

## 5. Configure environment variables

Copy `.env.example` to a new file named `.env`:

```powershell
Copy-Item .env.example .env
```

Open `.env` and enter the real PostgreSQL username, password, host, port, and database name:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/SchoolDB
TOKEN_SECRET=replace-this-with-a-long-random-secret
PORT=3000
```

Important notes:

- Replace `YOUR_PASSWORD` with the password for your PostgreSQL user.
- If the password contains characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode them in `DATABASE_URL`.
- Do not commit `.env` to source control. It is already listed in `.gitignore`.
- Use a long, unpredictable `TOKEN_SECRET`, especially outside local development.

Example with a different database user:

```env
DATABASE_URL=postgresql://ctu_app:encoded-password@localhost:5432/SchoolDB
```

## 6. Create tables and seed demo data

Run:

```bash
npm run db:setup
```

This command:

1. Enables the PostgreSQL `pgcrypto` extension.
2. Creates all required tables, enum types, foreign keys, constraints, and indexes.
3. Creates demonstration accounts for every role.
4. Inserts example programs, courses, sections, enrollment, grades, billing records, announcements, a clinic visit, and a document request.

The setup script is designed to be rerunnable. Core demonstration records use conflict handling to prevent duplicate accounts and courses.

Expected final output includes a summary similar to:

```text
Database schema and demo data are ready.
users      6
courses    5
sections   5
```

## 7. Start the application

Normal start:

```bash
npm start
```

The equivalent direct command is:

```bash
node backend/server.js
```

For development with automatic restart when files change:

```bash
npm run dev
```

When startup succeeds, the terminal displays:

```text
CTU Main Campus portal running at http://localhost:3000
```

Keep that terminal open while using the website.

## 8. Open the website

Visit:

```text
http://localhost:3000
```

Do not open `public/index.html` directly from the file system. The page needs the Express server to access the API and database.

## Demonstration credentials

All seeded accounts initially use the password:

```text
CTU2026!
```

| Role | Email | University ID |
|---|---|---|
| Administrator | `admin@ctu.edu.ph` | `ADMIN-001` |
| Student | `student@ctu.edu.ph` | `2026-0001` |
| Registrar | `registrar@ctu.edu.ph` | `REG-001` |
| Teacher | `teacher@ctu.edu.ph` | `FAC-001` |
| Clinic staff | `clinic@ctu.edu.ph` | `CLN-001` |
| Cashier | `cashier@ctu.edu.ph` | `CSH-001` |

Additional seeded teachers use `teacher2@ctu.edu.ph` through `teacher5@ctu.edu.ph`, university IDs `FAC-002` through `FAC-005`, and the same development password.

The sign-in form accepts either the email address or university ID.

These accounts are for development and demonstration only. Change their passwords before any real deployment.

## Testing public admission

1. Open `http://localhost:3000` without signing in.
2. Select **Apply to CTU** or **Start your application**.
3. Choose **New student** or **Transferee**. Transferees must provide their previous school.
4. Complete and submit the form.
5. Save the generated application number.
6. Use **Track an existing application** with the application number and applicant email.
7. Sign in as `registrar@ctu.edu.ph` and open **Admissions**.
8. Review the application. Approval creates the student number, account, profile, and draft enrollment.
9. Ask the applicant to track the approved application from the public website.
10. The applicant selects **Activate account and set password**, verifies their birth date, and creates a private password.
11. The applicant signs in using their application email or generated student number and the password they created.

The Registrar does not need to send or know the student's password. Once activation succeeds, the same application cannot be used to reset the password again.

Two sample applications are inserted by `npm run db:setup`:

- `CTU-ADM-2026-100001` — new student, submitted
- `CTU-ADM-2026-100002` — transferee, under review

## Testing semester enrollment

1. Sign in with an approved student account.
2. Open **Semester Enrollment**.
3. Confirm the regular or irregular classification shown on the page. This comes from the official student profile and cannot be changed by the student.
4. Choose exactly one eligible block section. Regular students see blocks for their program and year; irregular students see blocks prepared by the Registrar for irregular loads.
5. Review all courses, schedules, rooms, capacity, and total units already attached to that section. Students cannot individually add or remove courses.
6. Submit the section for Registrar review. The server validates the program, year level, classification, capacity, and 27-unit limit, then attaches every configured course in the block.
7. Sign in as the Registrar and open **Enrollments**.
8. Select **View & review** to inspect the block section and full course bundle before approving or rejecting it with remarks.
9. After approval, the student sees the official courses under **My Schedule** and cannot alter the approved enrollment online.

The enrollment relationship is:

```text
Student → chooses one block section → server attaches the section's courses → Registrar validates → official schedule
```

Admission type and enrollment classification are different:

- **New student** and **Transferee** describe how a student entered CTU.
- **Regular** and **Irregular** describe the student's subject load for a semester.

## Academic setup and block sections

The system uses the following responsibility order:

```text
Administrator creates the academic term, courses, and teacher accounts
                              ↓
Registrar creates a block and assigns courses, teachers, rooms, days, and times
                              ↓
Student chooses one eligible completed block
                              ↓
Registrar inspects the attached courses and approves enrollment
```

As Administrator:

1. Open **Academic Setup**.
2. Use **Academic term** to create or update a term and optionally make it current and open enrollment.
3. Use **New course** to create courses before the Registrar uses them in blocks.
4. Create teacher accounts under **User Accounts**. A teacher profile is created automatically.

As Registrar:

1. Open **Block Sections** and select **New block section**.
2. Select the program, year level, classification, capacity, and unique section code.
3. Add every course belonging to the block.
4. For every course, choose an active teacher and enter the room, meeting days, start time, and end time.
5. Enter meeting-day codes separated by commas: `M`, `T`, `W`, `Th`, `F`, or `Sa`. For example, Monday and Wednesday is `M,W`.
6. Save the block. The server checks teacher availability and room availability across the entire current term.

The save fails when:

- a course or teacher is missing;
- a course belongs to another program;
- days, room, or times are incomplete;
- end time is not after start time;
- the teacher has another class on an overlapping day and time;
- the room is already occupied on an overlapping day and time; or
- the block contains duplicate courses.

Teachers can open **Weekly Schedule** to view all conflict-free assignments by day.

## Complete billing process

As Cashier or Administrator:

1. Open **Billing & Payments**.
2. Select **New assessment**, choose the student, and enter the charge description, category, amount, due date, and notes.
3. Select **Receive payment** beside an open assessment.
4. Enter a partial or full amount, payment method, and unique official receipt/reference number.
5. The system marks the assessment **Partial** or **Paid** and recalculates the outstanding balance.
6. Use **Receipt** in the transaction table to view and print the payment record.
7. If a posted payment is incorrect, select **Void**, provide a reason, and confirm. The transaction stays visible as void while the assessment balance is recalculated.

The server prevents payments greater than the remaining balance. Students see assessments, amounts paid, balances, statuses, and payment references under **Account & Billing**.

## Normal development routine

After the first setup, the usual workflow is:

```bash
npm run dev
```

You only need to run `npm run db:setup` again when:

- setting up a new database;
- applying changes added to `schema.sql` or `seed.js`; or
- restoring the demonstration data.

You do not need to reseed the database every time the server starts.

## Stopping the server

In the terminal where the application is running, press:

```text
Ctrl+C
```

## Troubleshooting

### Database connection failed

- Confirm the PostgreSQL service is running.
- Verify the username, password, port, and database name in `.env`.
- Confirm that `SchoolDB` exists.
- Try signing in to the same database through pgAdmin or `psql`.

### `password authentication failed`

The username or password in `DATABASE_URL` is incorrect. Update `.env`, save it, and restart the server.

### `database "SchoolDB" does not exist`

Create the database first, or change the database name in `DATABASE_URL` to the database you already created.

### `permission denied to create extension pgcrypto`

Run the following as a PostgreSQL administrator connected to `SchoolDB`:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then run `npm run db:setup` again. The application database user needs permission to use the extension and create the schema objects during initial setup.

### Port 3000 is already in use

Change the port in `.env`:

```env
PORT=3001
```

Restart the server and open `http://localhost:3001`.

### Demo credentials do not work

Run:

```bash
npm run db:setup
```

Then restart the server. Ensure the application and seed command use the same `.env` and therefore the same database.

### The page loads but no records appear

- Check the terminal for API or PostgreSQL errors.
- Confirm `npm run db:setup` completed successfully.
- Sign out and sign in again to refresh the session.
- Check `http://localhost:3000/api/health`; a working server returns JSON containing `"ok": true`.

## Resetting demonstration data

Running `npm run db:setup` is safe for refreshing core seed records, but it does not delete operational records that users have added. A complete destructive reset should only be performed deliberately with a database backup. Do not drop tables containing information that must be retained.

## Security reminder

Never deploy using the demonstration passwords or the example token secret. Educational, financial, and clinic records are sensitive data and should be protected with HTTPS, controlled database access, backups, monitoring, and institution-approved privacy policies.
