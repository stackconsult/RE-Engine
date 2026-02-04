/**
 * Database Integration Tests
 * Tests CSV database connection and operations
 */
import assert from 'assert';
import { getDatabase } from '../src/database/index.js';
describe('Database Integration', () => {
    let db;
    before(async () => {
        db = getDatabase();
        await db.initialize();
    });
    after(async () => {
        await db.close();
    });
    it('should initialize successfully', async () => {
        const health = await db.health();
        assert.strictEqual(health, true, 'Database should be healthy');
    });
    it('should create and query approvals', async () => {
        // Create approval
        const createResult = await db.query('INSERT INTO approvals (approval_id, status, lead_id, channel, draft_to, draft_subject, draft_content) VALUES (?, ?, ?, ?, ?, ?, ?)', ['test_approval_1', 'pending', 'lead_1', 'email', 'test@example.com', 'Test Subject', 'Test content']);
        assert.ok(createResult, 'Should create approval successfully');
        // Query approvals
        const approvals = await db.query('SELECT * FROM approvals WHERE status = ?', ['pending']);
        assert.ok(Array.isArray(approvals), 'Should return array of approvals');
        assert.ok(approvals.length > 0, 'Should have at least one approval');
    });
    it('should create and query leads', async () => {
        // Create lead
        const createResult = await db.query('INSERT INTO leads (lead_id, first_name, last_name, email, phone_e164, city, province, source, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['test_lead_1', 'John', 'Doe', 'john@example.com', '+14155551234', 'San Francisco', 'CA', 'web', 'test,lead', 'new']);
        assert.ok(createResult, 'Should create lead successfully');
        // Query leads
        const leads = await db.query('SELECT * FROM leads WHERE status = ?', ['new']);
        assert.ok(Array.isArray(leads), 'Should return array of leads');
        assert.ok(leads.length > 0, 'Should have at least one lead');
    });
    it('should handle transactions', async () => {
        const result = await db.transaction(async (tx) => {
            await tx.query('INSERT INTO approvals (approval_id, status, lead_id, channel, draft_to, draft_subject, draft_content) VALUES (?, ?, ?, ?, ?, ?, ?)', ['test_approval_2', 'pending', 'lead_2', 'email', 'test2@example.com', 'Test Subject 2', 'Test content 2']);
            const approvals = await tx.query('SELECT * FROM approvals WHERE approval_id = ?', ['test_approval_2']);
            return approvals;
        });
        assert.ok(Array.isArray(result), 'Transaction should return array');
        assert.ok(result.length > 0, 'Transaction should create approval');
    });
});
//# sourceMappingURL=database.test.js.map