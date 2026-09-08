import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapDatabase } from './bootstrap-database.mjs';

const sql = 'CREATE TABLE "main"."user" (id text);';
function mock(rows, fail = false) {
  const calls = [];
  return { calls, async query(query) {
    calls.push(query);
    if (query === sql && fail) throw new Error('DDL failed');
    return { rows };
  } };
}
test('initializes an empty schema in a transaction', async () => {
  const client = mock([]);
  await bootstrapDatabase(client, sql);
  assert.ok(client.calls.includes(sql));
  assert.equal(client.calls.at(-1), 'COMMIT');
});
test('does not modify an existing schema', async () => {
  const client = mock([{ tablename: 'user' }]);
  await bootstrapDatabase(client, sql);
  assert.ok(!client.calls.includes(sql));
});
test('refuses a partially initialized schema', async () => {
  const client = mock([{ tablename: 'existing_data' }]);
  await assert.rejects(bootstrapDatabase(client, sql), /reviewed migration/);
  assert.ok(!client.calls.includes(sql));
  assert.equal(client.calls.at(-1), 'ROLLBACK');
});
test('rolls back failed initialization', async () => {
  const client = mock([], true);
  await assert.rejects(bootstrapDatabase(client, sql), /DDL failed/);
  assert.equal(client.calls.at(-1), 'ROLLBACK');
});
