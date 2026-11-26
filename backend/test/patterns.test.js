const test = require('node:test');
const assert = require('node:assert/strict');
const { createAccountProfile } = require('../factories/account-profile');

test('student profiles persist the selected academic details', async () => {
  const calls = [];
  const client = { query: async (sql, values) => calls.push({ sql, values }) };
  await createAccountProfile('student').save(client, 42, { program_id: 3, year_level: 2, section: 'B' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO students/);
  assert.deepEqual(calls[0].values, [42, 3, 2, 'B']);
});

test('student profiles preserve the existing defaults for optional details', async () => {
  const client = { query: async (sql, values) => {
    assert.deepEqual(values, [42, null, 1, 'A']);
    assert.match(sql, /SELECT id FROM programs ORDER BY id LIMIT 1/);
  } };
  await createAccountProfile('student').save(client, 42, {});
});

test('teacher profiles persist faculty details and preserve the default position', async () => {
  const calls = [];
  const client = { query: async (sql, values) => calls.push({ sql, values }) };
  const profile = createAccountProfile('teacher');
  await profile.save(client, 42, { department_id: 2, position: 'Professor' });
  await profile.save(client, 43, {});
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO teachers/);
  assert.deepEqual(calls[0].values, [42, 2, 'Professor']);
  assert.deepEqual(calls[1].values, [43, null, 'Instructor']);
});

test('all four staff roles need no additional student or teacher record', async () => {
  const client = { query: async () => assert.fail('Staff must not create an academic profile') };
  for (const role of ['admin', 'registrar', 'clinic', 'cashier']) {
    await createAccountProfile(role).save(client, 42, {});
  }
});

test('unsupported roles are rejected before database work', () => {
  for (const role of ['unknown', '__proto__', undefined]) {
    assert.throws(() => createAccountProfile(role), error => error.status === 400);
  }
});

test('profile database failures propagate to the route transaction handler', async () => {
  const failure = new Error('Database unavailable');
  const client = { query: async () => { throw failure; } };
  await assert.rejects(createAccountProfile('student').save(client, 42, {}), error => error === failure);
});

test('database imports share the same pool instance within the process', async () => {
  const first = require('../config/db');
  const second = require('../config/db');
  assert.strictEqual(first, second);
  await first.end();
});
