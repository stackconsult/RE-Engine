/**
 * MCP Server Integration Tests
 * Tests the MCP server functionality
 */
import { test, describe } from 'node:test';
import assert from 'assert';
import { LocalMCPIntegration } from '../mcp/reengine-core/src/local-integration.js';
describe('MCP Server Integration', () => {
    let engine;
    test.before(async () => {
        engine = new LocalMCPIntegration();
        await engine.initialize();
    });
    test.after(async () => {
        await engine.close();
    });
    test('should initialize successfully', async () => {
        const health = await engine.health();
        assert.ok(health.database, 'Database should be healthy');
        assert.ok(health.engine, 'Engine should be healthy');
    });
    test('should manage approvals', async () => {
        // Create approval via direct CSV manipulation
        const testApproval = await engine.createLead({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone_e164: '+14155551234',
            city: 'San Francisco',
            province: 'CA',
            source: 'test',
            tags: 'test',
            status: 'new'
        });
        assert.ok(testApproval, 'Should create lead successfully');
        assert.ok(testApproval.lead_id, 'Should have lead ID');
        // Test approval operations
        const approvals = await engine.listApprovals();
        assert.ok(Array.isArray(approvals), 'Should return array of approvals');
        const health = await engine.health();
        assert.ok(health.database, 'Database should still be healthy');
    });
    test('should manage leads', async () => {
        const leads = await engine.listLeads();
        assert.ok(Array.isArray(leads), 'Should return array of leads');
        const newLead = await engine.createLead({
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            phone_e164: '+14155551235',
            city: 'New York',
            province: 'NY',
            source: 'test',
            tags: 'test',
            status: 'new'
        });
        assert.ok(newLead, 'Should create lead successfully');
        assert.ok(newLead.lead_id, 'Should have lead ID');
        const retrievedLead = await engine.getLead(newLead.lead_id);
        assert.ok(retrievedLead, 'Should retrieve lead successfully');
        assert.strictEqual(retrievedLead.email, 'jane@example.com', 'Should have correct email');
    });
});
//# sourceMappingURL=mcp-integration.test.js.map