-- Deploy with the admission INSERTs that explicitly supply classification.
BEGIN;
DROP TRIGGER IF EXISTS trg_initial_student_classification ON students;
DROP TRIGGER IF EXISTS trg_draft_enrollment_classification ON enrollments;
DROP FUNCTION IF EXISTS set_initial_student_classification();
DROP FUNCTION IF EXISTS set_draft_enrollment_classification();
COMMIT;
