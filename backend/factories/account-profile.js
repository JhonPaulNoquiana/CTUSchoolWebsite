// Arrays: these account roles use the same staff profile behavior.
const staffRoles = ['admin', 'registrar', 'clinic', 'cashier'];

class StudentProfile {
  async save(client, userId, details) {
    return client.query(
      `INSERT INTO students(user_id,program_id,year_level,section,admission_year)
       VALUES($1,COALESCE($2,(SELECT id FROM programs ORDER BY id LIMIT 1)),$3,$4,EXTRACT(YEAR FROM CURRENT_DATE))`,
      [userId, details.program_id || null, details.year_level || 1, details.section || 'A']
    );
  }
}

class TeacherProfile {
  async save(client, userId, details) {
    return client.query(
      `INSERT INTO teachers(user_id,department_id,position)
       VALUES($1,COALESCE($2,(SELECT id FROM departments ORDER BY id LIMIT 1)),$3)`,
      [userId, details.department_id || null, details.position || 'Instructor']
    );
  }
}

class StaffProfile {
  async save() {
    // Staff accounts only need the users record already created by the route.
  }
}

// Simple Factory pattern: callers request a role without choosing a profile class.
// Every returned object exposes the same save(client, userId, details) operation.
function createAccountProfile(role) {
  if (role === 'student') return new StudentProfile();
  if (role === 'teacher') return new TeacherProfile();
  if (staffRoles.includes(role)) return new StaffProfile();

  const error = new Error('Select a valid account role.');
  error.status = 400;
  throw error;
}

module.exports = { createAccountProfile };
