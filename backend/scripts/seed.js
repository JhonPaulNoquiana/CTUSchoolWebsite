require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO departments(code,name,dean) VALUES
      ('COE','College of Engineering','Engr. Maria Lourdes D. Reyes'),('COT','College of Technology','Dr. Adrian P. Flores'),('COED','College of Education','Dr. Lorna B. Villamor'),('CAS','College of Arts and Sciences','Dr. Elisa M. Tan')
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,dean=EXCLUDED.dean;
      INSERT INTO programs(department_id,code,name,description)
      SELECT d.id,x.code,x.name,x.description FROM (VALUES
      ('COE','BSIT','Bachelor of Science in Information Technology','Software, networks, data, and digital innovation.'),('COE','BSCE','Bachelor of Science in Civil Engineering','Infrastructure design and sustainable construction.'),('COT','BIT-CT','Bachelor of Industrial Technology - Computer Technology','Applied computing and industrial systems.'),('COED','BSED','Bachelor of Secondary Education','Future-ready teaching and learning practice.')) x(dept,code,name,description) JOIN departments d ON d.code=x.dept
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description;
      INSERT INTO academic_terms(school_year,semester,starts_on,ends_on,enrollment_open,is_current) VALUES
      ('2026-2027','1st Semester','2026-08-10','2026-12-18',TRUE,TRUE),('2025-2026','2nd Semester','2026-01-12','2026-05-22',FALSE,FALSE)
      ON CONFLICT(school_year,semester) DO UPDATE SET enrollment_open=EXCLUDED.enrollment_open,is_current=EXCLUDED.is_current;
    `);
    const accounts = [
      ['ADMIN-001','admin@ctu.edu.ph','admin','Amelia','Santos','#E79000'],['2026-0001','student@ctu.edu.ph','student','Juan','Reyes','#1A73E8'],
      ['REG-001','registrar@ctu.edu.ph','registrar','Camille','Navarro','#7B61FF'],['FAC-001','teacher@ctu.edu.ph','teacher','Rafael','Mendoza','#168B70'],
      ['FAC-002','teacher2@ctu.edu.ph','teacher','Elena','Torres','#287A65'],['FAC-003','teacher3@ctu.edu.ph','teacher','Noel','Garcia','#3D8C73'],['FAC-004','teacher4@ctu.edu.ph','teacher','Liza','Ramos','#4C9A82'],['FAC-005','teacher5@ctu.edu.ph','teacher','Marco','Villanueva','#5AA78F'],
      ['CLN-001','clinic@ctu.edu.ph','clinic','Andrea','Lim','#E45B73'],['CSH-001','cashier@ctu.edu.ph','cashier','Martin','Go','#0D7C86']
    ];
    for (const [no,email,role,first,last,color] of accounts) await client.query(`INSERT INTO users(employee_or_student_no,email,password_hash,role,first_name,last_name,avatar_color) VALUES($1,$2,crypt('CTU2026!',gen_salt('bf',10)),$3,$4,$5,$6) ON CONFLICT(email) DO UPDATE SET employee_or_student_no=EXCLUDED.employee_or_student_no,role=EXCLUDED.role,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name`,[no,email,role,first,last,color]);
    await client.query(`
      INSERT INTO students(user_id,program_id,year_level,section,admission_year,birth_date,gender,guardian_name,guardian_phone)
      SELECT u.id,p.id,3,'A',2024,'2005-04-18','Male','Elena Reyes','09171234567' FROM users u,programs p WHERE u.email='student@ctu.edu.ph' AND p.code='BSIT' ON CONFLICT(user_id) DO NOTHING;
      INSERT INTO teachers(user_id,department_id,position,specialization) SELECT u.id,d.id,'Assistant Professor IV','Web Systems and Database Engineering' FROM users u,departments d WHERE u.email='teacher@ctu.edu.ph' AND d.code='COE' ON CONFLICT(user_id) DO NOTHING;
      INSERT INTO teachers(user_id,department_id,position,specialization) SELECT u.id,d.id,'Instructor III','Information Technology' FROM users u,departments d WHERE u.role='teacher' AND d.code='COE' ON CONFLICT(user_id) DO NOTHING;
      INSERT INTO courses(program_id,code,title,units,lecture_hours,lab_hours,year_level,semester,prerequisite)
      SELECT p.id,x.code,x.title,x.units,x.lec,x.lab,3,'1st Semester',x.prereq FROM programs p,(VALUES
      ('IT 321','Web Systems and Technologies',3.0,2,3,'IT 221'),('IT 322','Information Assurance and Security',3.0,3,0,'IT 222'),('IT 323','Integrative Programming',3.0,2,3,'IT 223'),('IT 324','Systems Integration and Architecture',3.0,3,0,'IT 224'),('GE 8','Ethics',3.0,3,0,NULL)) x(code,title,units,lec,lab,prereq) WHERE p.code='BSIT' ON CONFLICT(code) DO UPDATE SET title=EXCLUDED.title;
      INSERT INTO courses(program_id,code,title,units,lecture_hours,lab_hours,year_level,semester)
      SELECT p.id,x.code,x.title,x.units,x.lec,x.lab,1,'1st Semester' FROM programs p,(VALUES
      ('IT 111','Introduction to Computing',3.0,2,3),('IT 112','Computer Programming 1',3.0,2,3),('IT 113','Discrete Mathematics',3.0,3,0),('GE 1','Mathematics in the Modern World',3.0,3,0),('GE 2','Purposive Communication',3.0,3,0)) x(code,title,units,lec,lab) WHERE p.code='BSIT' ON CONFLICT(code) DO UPDATE SET title=EXCLUDED.title;
      INSERT INTO academic_blocks(term_id,program_id,year_level,code,classification,capacity)
      SELECT t.id,p.id,x.year_level,x.code,x.classification,40 FROM academic_terms t,programs p,(VALUES
      (1,'BSIT-1A','regular'),(1,'BSIT-1B','regular'),(3,'BSIT-3A','regular'),(3,'BSIT-3B','regular'),(3,'BSIT-IRR-3A','irregular')) x(year_level,code,classification)
      WHERE t.is_current AND p.code='BSIT' ON CONFLICT(term_id,code) DO UPDATE SET classification=EXCLUDED.classification,year_level=EXCLUDED.year_level,is_active=TRUE;
      INSERT INTO class_sections(term_id,course_id,teacher_id,section_code,room,days,start_time,end_time,capacity)
      SELECT t.id,c.id,te.id,'BSIT-3A',x.room,x.days,x.start_time::time,x.end_time::time,40 FROM academic_terms t,teachers te,courses c JOIN
      (VALUES('IT 321','ICT 405','M/W','08:00','09:30'),('IT 322','ICT 301','T/Th','09:30','11:00'),('IT 323','ICT Lab 2','M/W','13:00','14:30'),('IT 324','ICT 402','T/Th','13:00','14:30'),('GE 8','Arts 203','Friday','10:00','13:00')) x(code,room,days,start_time,end_time) ON c.code=x.code
      WHERE t.is_current AND te.user_id=(SELECT id FROM users WHERE email='teacher@ctu.edu.ph') ON CONFLICT(term_id,course_id,section_code) DO UPDATE SET room=EXCLUDED.room;
      INSERT INTO class_sections(term_id,course_id,teacher_id,section_code,room,days,start_time,end_time,capacity)
      SELECT t.id,c.id,te.id,x.section_code,x.room,x.days,x.start_time::time,x.end_time::time,40 FROM academic_terms t,teachers te,courses c JOIN
      (VALUES
      ('BSIT-3B','IT 321','ICT 406','M/W','09:30','11:00'),('BSIT-3B','IT 322','ICT 302','T/Th','08:00','09:30'),('BSIT-3B','IT 323','ICT Lab 3','M/W','14:30','16:00'),('BSIT-3B','IT 324','ICT 403','T/Th','14:30','16:00'),('BSIT-3B','GE 8','Arts 204','Friday','13:00','16:00'),
      ('BSIT-1A','IT 111','ICT 201','M/W','08:00','09:30'),('BSIT-1A','IT 112','ICT Lab 1','T/Th','08:00','09:30'),('BSIT-1A','IT 113','ICT 202','M/W','09:30','11:00'),('BSIT-1A','GE 1','Arts 201','T/Th','09:30','11:00'),('BSIT-1A','GE 2','Arts 202','Friday','08:00','11:00'),
      ('BSIT-1B','IT 111','ICT 202','M/W','13:00','14:30'),('BSIT-1B','IT 112','ICT Lab 2','T/Th','13:00','14:30'),('BSIT-1B','IT 113','ICT 203','M/W','14:30','16:00'),('BSIT-1B','GE 1','Arts 202','T/Th','14:30','16:00'),('BSIT-1B','GE 2','Arts 203','Friday','13:00','16:00'),
      ('BSIT-IRR-3A','IT 321','ICT 407','Saturday','08:00','10:00'),('BSIT-IRR-3A','IT 323','ICT Lab 4','Saturday','10:00','12:00'),('BSIT-IRR-3A','GE 8','Arts 205','Saturday','13:00','16:00'))
      x(section_code,code,room,days,start_time,end_time) ON c.code=x.code WHERE t.is_current AND te.user_id=(SELECT id FROM users WHERE email='teacher@ctu.edu.ph')
      ON CONFLICT(term_id,course_id,section_code) DO UPDATE SET room=EXCLUDED.room,days=EXCLUDED.days,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time;
      UPDATE class_sections cs SET block_id=b.id FROM academic_blocks b WHERE b.term_id=cs.term_id AND b.code=cs.section_code AND cs.block_id IS DISTINCT FROM b.id;
      UPDATE class_sections SET meeting_days=CASE days WHEN 'M/W' THEN ARRAY['M','W'] WHEN 'T/Th' THEN ARRAY['T','Th'] WHEN 'Friday' THEN ARRAY['F'] WHEN 'Saturday' THEN ARRAY['Sa'] ELSE ARRAY[days] END WHERE cardinality(meeting_days)=0;
      UPDATE class_sections cs SET teacher_id=t.id FROM courses c,teachers t,users u WHERE cs.course_id=c.id AND t.user_id=u.id AND u.email=CASE WHEN c.code IN('IT 321','IT 322') THEN 'teacher@ctu.edu.ph' WHEN c.code IN('IT 323','IT 324') THEN 'teacher2@ctu.edu.ph' WHEN c.code IN('GE 8','IT 111') THEN 'teacher3@ctu.edu.ph' WHEN c.code IN('IT 112','IT 113') THEN 'teacher4@ctu.edu.ph' ELSE 'teacher5@ctu.edu.ph' END;
      INSERT INTO enrollments(student_id,term_id,status,enrollment_type,total_units,block_id,reviewed_by,reviewed_at,remarks)
      SELECT s.id,t.id,'enrolled','regular',15,b.id,u.id,NOW(),'Enrollment verified and approved.' FROM students s,academic_terms t,users u,academic_blocks b WHERE t.is_current AND b.term_id=t.id AND b.code='BSIT-3A' AND u.email='registrar@ctu.edu.ph'
      ON CONFLICT(student_id,term_id) DO UPDATE SET status='enrolled',enrollment_type='regular',total_units=15,block_id=EXCLUDED.block_id;
      INSERT INTO enrollment_items(enrollment_id,class_section_id,midterm_grade,grade_status,attendance_percent)
      SELECT e.id,cs.id,CASE c.code WHEN 'IT 321' THEN 1.50 WHEN 'IT 322' THEN 1.75 WHEN 'IT 323' THEN 1.25 WHEN 'IT 324' THEN 1.75 ELSE 1.50 END,'In Progress',CASE c.code WHEN 'IT 322' THEN 94 ELSE 98 END
      FROM enrollments e JOIN class_sections cs ON cs.term_id=e.term_id AND cs.section_code='BSIT-3A' JOIN courses c ON c.id=cs.course_id ON CONFLICT(enrollment_id,class_section_id) DO UPDATE SET midterm_grade=EXCLUDED.midterm_grade;
      INSERT INTO billing_items(student_id,term_id,description,category,amount,due_date,status)
      SELECT s.id,t.id,x.description,x.category,x.amount,x.due_date::date,x.status FROM students s,academic_terms t,(VALUES('Student Development Fee','School Fee',650.00,'2026-09-15','Unpaid'),('Laboratory Fee','Laboratory',1200.00,'2026-09-15','Paid'),('University ID Replacement','Other',250.00,'2026-10-01','Unpaid')) x(description,category,amount,due_date,status) WHERE t.is_current AND NOT EXISTS(SELECT 1 FROM billing_items);
      INSERT INTO payments(billing_item_id,student_id,amount,payment_method,reference_no,received_by,status,paid_at)
      SELECT b.id,b.student_id,b.amount,'Cash','OR-DEMO-2026-0001',u.id,'posted','2026-08-15 10:30+08' FROM billing_items b,users u WHERE b.description='Laboratory Fee' AND u.email='cashier@ctu.edu.ph'
      ON CONFLICT(reference_no) DO NOTHING;
      INSERT INTO announcements(title,body,audience,category,is_pinned,author_id,published_at)
      SELECT x.title,x.body,x.audience,x.category,x.pinned,u.id,x.published_at::timestamptz FROM users u,(VALUES
      ('Welcome to Academic Year 2026–2027','Classes officially begin on August 10. Check your student portal for enrolled subjects and room assignments.','all','Academic',TRUE,'2026-08-03 08:00+08'),('Enrollment validation period','Students with pending requirements should visit the Registrar before September 11.','student','Registrar',FALSE,'2026-09-01 09:30+08'),('Campus health advisory','Stay hydrated and visit the University Clinic if you experience flu-like symptoms.','all','Health',FALSE,'2026-08-28 11:00+08')) x(title,body,audience,category,pinned,published_at) WHERE u.email='admin@ctu.edu.ph' AND NOT EXISTS(SELECT 1 FROM announcements);
      INSERT INTO clinic_visits(student_id,attended_by,visited_at,complaint,assessment,treatment,vital_signs,disposition) SELECT s.id,u.id,'2026-08-26 10:15+08','Headache and fatigue','Likely dehydration','Rest, oral fluids, and paracetamol 500mg','{"temperature":"36.7 C","bloodPressure":"110/70","pulse":"78 bpm"}'::jsonb,'Returned to class' FROM students s,users u WHERE u.email='clinic@ctu.edu.ph' AND NOT EXISTS(SELECT 1 FROM clinic_visits);
      INSERT INTO document_requests(student_id,document_type,purpose,copies,status) SELECT s.id,'Certificate of Registration','Scholarship application',1,'processing' FROM students s WHERE NOT EXISTS(SELECT 1 FROM document_requests);
      INSERT INTO admission_applications(application_no,applicant_type,first_name,last_name,email,phone,birth_date,gender,address,guardian_name,guardian_phone,program_id,status,previous_school,previous_program,last_school_year)
      SELECT 'CTU-ADM-2026-100001','new','Maria','Cebu','maria.cebu@example.com','09181234567','2008-02-14','Female','Cebu City','Rosa Cebu','09181230000',p.id,'submitted',NULL,NULL,NULL FROM programs p WHERE p.code='BSIT'
      ON CONFLICT(application_no) DO NOTHING;
      INSERT INTO admission_applications(application_no,applicant_type,first_name,last_name,email,phone,birth_date,gender,address,guardian_name,guardian_phone,program_id,status,previous_school,previous_program,last_school_year)
      SELECT 'CTU-ADM-2026-100002','transferee','Paolo','Dizon','paolo.dizon@example.com','09191234567','2006-07-21','Male','Mandaue City','Carla Dizon','09191230000',p.id,'under_review','Cebu Community College','BS Computer Science','2025-2026' FROM programs p WHERE p.code='BSIT'
      ON CONFLICT(application_no) DO NOTHING;
    `);
    await client.query('COMMIT');
    const out=await client.query(`SELECT 'users' entity,count(*)::int total FROM users UNION ALL SELECT 'courses',count(*)::int FROM courses UNION ALL SELECT 'sections',count(*)::int FROM class_sections`);
    console.log('Database schema and demo data are ready.'); console.table(out.rows);
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
seed().catch(error=>{console.error(error);process.exit(1)});
