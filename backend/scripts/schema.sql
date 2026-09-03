BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','student','registrar','teacher','clinic','cashier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enrollment_status AS ENUM ('draft','pending','enrolled','rejected','completed','dropped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE request_status AS ENUM ('pending','processing','ready','released','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY,code VARCHAR(20) UNIQUE NOT NULL,name VARCHAR(150) UNIQUE NOT NULL,dean VARCHAR(120),created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS programs (id SERIAL PRIMARY KEY,department_id INTEGER REFERENCES departments(id),code VARCHAR(30) UNIQUE NOT NULL,name VARCHAR(180) NOT NULL,degree_level VARCHAR(40) NOT NULL DEFAULT 'Bachelor',duration_years INTEGER NOT NULL DEFAULT 4 CHECK(duration_years BETWEEN 1 AND 6),description TEXT,is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY,employee_or_student_no VARCHAR(30) UNIQUE NOT NULL,email VARCHAR(180) UNIQUE NOT NULL,password_hash TEXT NOT NULL,role user_role NOT NULL,first_name VARCHAR(80) NOT NULL,middle_name VARCHAR(80),last_name VARCHAR(80) NOT NULL,phone VARCHAR(30),address TEXT,avatar_color VARCHAR(20) DEFAULT '#F7A600',is_active BOOLEAN NOT NULL DEFAULT TRUE,last_login_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS students (id BIGSERIAL PRIMARY KEY,user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,program_id INTEGER REFERENCES programs(id),year_level INTEGER NOT NULL DEFAULT 1 CHECK(year_level BETWEEN 1 AND 6),section VARCHAR(20),admission_year INTEGER,birth_date DATE,gender VARCHAR(30),guardian_name VARCHAR(150),guardian_phone VARCHAR(30),academic_status VARCHAR(30) DEFAULT 'Good Standing');
CREATE TABLE IF NOT EXISTS teachers (id BIGSERIAL PRIMARY KEY,user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,department_id INTEGER REFERENCES departments(id),position VARCHAR(80),specialization VARCHAR(160));
CREATE TABLE IF NOT EXISTS academic_terms (id SERIAL PRIMARY KEY,school_year VARCHAR(20) NOT NULL,semester VARCHAR(30) NOT NULL,starts_on DATE,ends_on DATE,enrollment_open BOOLEAN DEFAULT FALSE,is_current BOOLEAN DEFAULT FALSE,UNIQUE(school_year,semester));
CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY,program_id INTEGER REFERENCES programs(id),code VARCHAR(30) UNIQUE NOT NULL,title VARCHAR(180) NOT NULL,units NUMERIC(3,1) NOT NULL DEFAULT 3,lecture_hours INTEGER DEFAULT 3,lab_hours INTEGER DEFAULT 0,year_level INTEGER DEFAULT 1,semester VARCHAR(30) DEFAULT '1st Semester',prerequisite VARCHAR(80),is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS class_sections (id BIGSERIAL PRIMARY KEY,term_id INTEGER NOT NULL REFERENCES academic_terms(id),course_id INTEGER NOT NULL REFERENCES courses(id),teacher_id BIGINT REFERENCES teachers(id),section_code VARCHAR(30) NOT NULL,room VARCHAR(50),days VARCHAR(30),start_time TIME,end_time TIME,capacity INTEGER NOT NULL DEFAULT 40 CHECK(capacity>0),UNIQUE(term_id,course_id,section_code));
CREATE TABLE IF NOT EXISTS academic_blocks (id BIGSERIAL PRIMARY KEY,term_id INTEGER NOT NULL REFERENCES academic_terms(id),program_id INTEGER NOT NULL REFERENCES programs(id),year_level INTEGER NOT NULL CHECK(year_level BETWEEN 1 AND 6),code VARCHAR(30) NOT NULL,classification VARCHAR(20) NOT NULL DEFAULT 'regular' CHECK(classification IN('regular','irregular')),capacity INTEGER NOT NULL DEFAULT 40 CHECK(capacity>0),is_active BOOLEAN NOT NULL DEFAULT TRUE,UNIQUE(term_id,code));
ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS block_id BIGINT REFERENCES academic_blocks(id);
ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS meeting_days TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE class_sections ALTER COLUMN teacher_id SET NOT NULL;
CREATE TABLE IF NOT EXISTS enrollments (id BIGSERIAL PRIMARY KEY,student_id BIGINT NOT NULL REFERENCES students(id),term_id INTEGER NOT NULL REFERENCES academic_terms(id),status enrollment_status NOT NULL DEFAULT 'pending',submitted_at TIMESTAMPTZ DEFAULT NOW(),reviewed_by BIGINT REFERENCES users(id),reviewed_at TIMESTAMPTZ,remarks TEXT,UNIQUE(student_id,term_id));
CREATE TABLE IF NOT EXISTS enrollment_items (id BIGSERIAL PRIMARY KEY,enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,class_section_id BIGINT NOT NULL REFERENCES class_sections(id),midterm_grade NUMERIC(5,2) CHECK(midterm_grade BETWEEN 1 AND 5),final_grade NUMERIC(5,2) CHECK(final_grade BETWEEN 1 AND 5),grade_status VARCHAR(30) DEFAULT 'In Progress',attendance_percent NUMERIC(5,2) DEFAULT 100,UNIQUE(enrollment_id,class_section_id));
CREATE TABLE IF NOT EXISTS billing_items (id BIGSERIAL PRIMARY KEY,student_id BIGINT NOT NULL REFERENCES students(id),term_id INTEGER REFERENCES academic_terms(id),description VARCHAR(180) NOT NULL,category VARCHAR(60) NOT NULL,amount NUMERIC(12,2) NOT NULL CHECK(amount>=0),due_date DATE,status VARCHAR(30) DEFAULT 'Unpaid',created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payments (id BIGSERIAL PRIMARY KEY,billing_item_id BIGINT REFERENCES billing_items(id),student_id BIGINT NOT NULL REFERENCES students(id),amount NUMERIC(12,2) NOT NULL CHECK(amount>0),payment_method VARCHAR(50) NOT NULL,reference_no VARCHAR(60) UNIQUE NOT NULL,received_by BIGINT REFERENCES users(id),paid_at TIMESTAMPTZ DEFAULT NOW(),notes TEXT);
CREATE TABLE IF NOT EXISTS clinic_visits (id BIGSERIAL PRIMARY KEY,student_id BIGINT NOT NULL REFERENCES students(id),attended_by BIGINT REFERENCES users(id),visited_at TIMESTAMPTZ DEFAULT NOW(),complaint TEXT NOT NULL,assessment TEXT,treatment TEXT,vital_signs JSONB DEFAULT '{}'::jsonb,disposition VARCHAR(80) DEFAULT 'Returned to class',is_confidential BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS document_requests (id BIGSERIAL PRIMARY KEY,student_id BIGINT NOT NULL REFERENCES students(id),document_type VARCHAR(100) NOT NULL,purpose TEXT,copies INTEGER NOT NULL DEFAULT 1 CHECK(copies BETWEEN 1 AND 10),status request_status NOT NULL DEFAULT 'pending',requested_at TIMESTAMPTZ DEFAULT NOW(),processed_by BIGINT REFERENCES users(id),released_at TIMESTAMPTZ,notes TEXT);
CREATE TABLE IF NOT EXISTS announcements (id BIGSERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,body TEXT NOT NULL,audience VARCHAR(40) NOT NULL DEFAULT 'all',category VARCHAR(50) DEFAULT 'General',is_pinned BOOLEAN DEFAULT FALSE,author_id BIGINT REFERENCES users(id),published_at TIMESTAMPTZ DEFAULT NOW(),expires_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS audit_logs (id BIGSERIAL PRIMARY KEY,user_id BIGINT REFERENCES users(id),action VARCHAR(100) NOT NULL,entity_type VARCHAR(60),entity_id VARCHAR(60),details JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS admission_applications (
  id BIGSERIAL PRIMARY KEY,
  application_no VARCHAR(30) UNIQUE NOT NULL,
  applicant_type VARCHAR(20) NOT NULL CHECK(applicant_type IN('new','transferee')),
  first_name VARCHAR(80) NOT NULL,
  middle_name VARCHAR(80),
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(30),
  address TEXT NOT NULL,
  guardian_name VARCHAR(150),
  guardian_phone VARCHAR(30),
  program_id INTEGER NOT NULL REFERENCES programs(id),
  previous_school VARCHAR(180),
  previous_program VARCHAR(180),
  last_school_year VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK(status IN('submitted','under_review','approved','rejected')),
  registrar_notes TEXT,
  student_id BIGINT UNIQUE REFERENCES students(id),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_type VARCHAR(20) DEFAULT 'new';
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_classification VARCHAR(20) DEFAULT 'regular';
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS enrollment_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS total_units NUMERIC(5,1) DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS block_id BIGINT REFERENCES academic_blocks(id);
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS credentials_claimed_at TIMESTAMPTZ;
ALTER TABLE billing_items ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
ALTER TABLE billing_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'posted';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_by BIGINT REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS void_reason TEXT;
CREATE OR REPLACE FUNCTION set_initial_student_classification() RETURNS TRIGGER AS $$ BEGIN IF NEW.admission_type='transferee' THEN NEW.enrollment_classification='irregular'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_initial_student_classification ON students;
CREATE TRIGGER trg_initial_student_classification BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION set_initial_student_classification();
CREATE OR REPLACE FUNCTION set_draft_enrollment_classification() RETURNS TRIGGER AS $$ BEGIN IF NEW.status='draft' THEN SELECT enrollment_classification INTO NEW.enrollment_type FROM students WHERE id=NEW.student_id; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_draft_enrollment_classification ON enrollments;
CREATE TRIGGER trg_draft_enrollment_classification BEFORE INSERT ON enrollments FOR EACH ROW EXECUTE FUNCTION set_draft_enrollment_classification();
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role); CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status); CREATE INDEX IF NOT EXISTS idx_enrollment_items_section ON enrollment_items(class_section_id); CREATE INDEX IF NOT EXISTS idx_billing_student ON billing_items(student_id); CREATE INDEX IF NOT EXISTS idx_clinic_student ON clinic_visits(student_id); CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(published_at DESC); CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admission_applications(status,submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_program_year ON academic_blocks(term_id,program_id,year_level,is_active);
CREATE INDEX IF NOT EXISTS idx_class_sections_block ON class_sections(block_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_teacher_time ON class_sections(term_id,teacher_id,start_time,end_time);
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON payments(status,paid_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_admission_email ON admission_applications(LOWER(email)) WHERE status IN('submitted','under_review','approved');
COMMIT;
