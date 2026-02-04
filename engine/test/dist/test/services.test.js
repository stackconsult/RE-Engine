/**
 * Services Integration Tests
 * Tests core service functionality
 */
import assert from 'assert';
import { getDatabase } from '../src/database/index.js';
import { ApprovalService } from '../src/approvals/approvalService.js';
describe('Services Integration', () => {
    let db;
    let approvalService;
    before(async () => {
        db = getDatabase();
        await db.initialize();
        approvalService = new ApprovalService(db);
    });
    after(async () => {
        await db.close();
    });
    it('should create and manage approvals', async () => {
        // Create approval
        const approvalData = {
            lead_id: 'test_lead_1',
            channel: 'email',
            draft_to: 'test@example.com',
            draft_subject: 'Test Subject',
            draft_content: 'Test content'
        };
        const createResult = await approvalService.create(approvalData);
        assert.ok(createResult.success, 'Should create approval successfully');
        assert.ok(createResult.data, 'Should return approval data');
        assert.strictEqual(createResult.data.status, 'pending', 'Approval should be pending');
        // Get approval
        const getResult = await approvalService.getById(createResult.data.approval_id);
        assert.ok(getResult.success, 'Should get approval successfully');
        assert.strictEqual(getResult.data.approval_id, createResult.data.approval_id, 'Should return correct approval');
        // Update approval
        const updateResult = await approvalService.update(createResult.data.approval_id, {
            status: 'approved',
            approved_by: 'test_user'
        });
        assert.ok(updateResult.success, 'Should update approval successfully');
        assert.strictEqual(updateResult.data.status, 'approved', 'Approval should be approved');
    });
    it('should handle approval workflow', async () => {
        // Create multiple approvals
        const approvals = [];
        for (let i = 0; i < 3; i++) {
            const result = await approvalService.create({
                lead_id: `test_lead_${i}`,
                channel: 'email',
                draft_to: `test${i}@example.com`,
                draft_subject: `Test Subject ${i}`,
                draft_content: `Test content ${i}`
            });
            approvals.push(result.data);
        }
        // Query pending approvals
        const pendingResult = await approvalService.query({ status: 'pending' });
        assert.ok(pendingResult.success, 'Should query pending approvals');
        assert.ok(pendingResult.data.length >= 3, 'Should have at least 3 pending approvals');
        // Approve one approval
        const approveResult = await approvalService.update(approvals[0].approval_id, {
            status: 'approved',
            approved_by: 'test_user'
        });
        assert.ok(approveResult.success, 'Should approve approval');
        // Query approved approvals
        const approvedResult = await approvalService.query({ status: 'approved' });
        assert.ok(approvedResult.success, 'Should query approved approvals');
        assert.ok(approvedResult.data.length >= 1, 'Should have at least 1 approved approval');
    });
});
//# sourceMappingURL=services.test.js.map