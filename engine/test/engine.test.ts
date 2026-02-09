/**
 * Basic Engine Tests
 * Tests core functionality with Node.js built-in test runner
 */

import { test, describe } from 'node:test';
import assert from 'assert';
import { getDatabase } from '../src/database/index.js';

describe('RE Engine Core Tests', () => {
  test('database initialization', async () => {
    const db = getDatabase();
    await db.initialize();

    const health = await db.health();
    assert.strictEqual(health, true, 'Database should be healthy');

    await db.close();
  });

  test('database operations', async () => {
    const db = getDatabase();
    await db.initialize();

    // Test basic query
    const result = await db.query('SELECT * FROM approvals');
    assert.ok(Array.isArray(result), 'Should return array');

    // Test transaction
    const txResult = await db.transaction(async (tx) => {
      return await tx.query('SELECT * FROM approvals');
    });
    assert.ok(txResult, 'Transaction should work');

    await db.close();
  });

  test('approval workflow', async () => {
    const db = getDatabase();
    await db.initialize();

    // Create a test approval
    const approvalData = {
      approval_id: 'test_approval_' + Date.now(),
      status: 'pending',
      lead_id: 'test_lead',
      channel: 'email',
      draft_to: 'test@example.com',
      draft_subject: 'Test Subject',
      draft_content: 'Test Content',
      draft_from: 'system',
      approved_by: '',
      approved_at: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rejection_reason: ''
    };

    const insertResult = await db.query(
      'INSERT INTO approvals (approval_id, status, lead_id, channel, draft_to, draft_subject, draft_content, draft_from, approved_by, approved_at, created_at, updated_at, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      Object.values(approvalData)
    );

    assert.ok(insertResult, 'Should insert approval');

    // Query the approval
    const approvals = await db.query('SELECT * FROM approvals WHERE approval_id = ?', [approvalData.approval_id]);
    assert.ok(Array.isArray(approvals), 'Should return array');
    assert.ok(approvals.length > 0, 'Should find the approval');

    await db.close();
  });

  test('lead management', async () => {
    const db = getDatabase();
    await db.initialize();

    // Create a test lead
    const leadData = {
      lead_id: 'test_lead_' + Date.now(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone_e164: '+14155551234',
      city: 'San Francisco',
      province: 'CA',
      source: 'test',
      tags: 'test',
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: '{}'
    };

    const insertResult = await db.query(
      'INSERT INTO leads (lead_id, first_name, last_name, email, phone_e164, city, province, source, tags, status, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      Object.values(leadData)
    );

    assert.ok(insertResult, 'Should insert lead');

    // Query the lead
    const leads = await db.query('SELECT * FROM leads WHERE lead_id = ?', [leadData.lead_id]);
    assert.ok(Array.isArray(leads), 'Should return array');
    assert.ok(leads.length > 0, 'Should find the lead');
    assert.strictEqual(leads[0].email, 'john@example.com', 'Should have correct email');

    await db.close();
  });
});
