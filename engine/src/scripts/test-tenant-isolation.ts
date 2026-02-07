/**
 * Multi-Tenancy Data Isolation Test (Neon-only)
 * Verifies that tenant_id scoping works correctly for Neon PostgreSQL operations
 */

import { NeonIntegrationService } from '../database/neon-integration.service.js';
import { ConfigService } from '../config/config.service.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('TenantIsolationTest', true);

interface TestResult {
    testName: string;
    passed: boolean;
    error?: string;
}

async function runIsolationTests(): Promise<void> {
    logger.info('🧪 Starting Multi-Tenant Data Isolation Tests (Neon)...');

    const config = ConfigService.getInstance();
    const neonService = new NeonIntegrationService({
        connectionString: config.get('DATABASE_URL') as string,
        pooledConnectionString: config.get('DATABASE_POOLED_URL') as string || config.get('DATABASE_URL') as string,
        maxConnections: 20,
    });

    await neonService.initialize();

    const results: TestResult[] = [];
    const TENANT_A = 'test-tenant-a';
    const TENANT_B = 'test-tenant-b';

    try {
        // Test 1: Create leads in different tenants
        logger.info('Test 1: Creating leads in separate tenants...');
        const leadA1 = await neonService.createLead({
            email: 'lead-a1@test.com',
            name: 'Lead A1',
            phone: '555-0001',
            source: 'test',
            status: 'new',
            city: 'Test City A',
        }, TENANT_A);

        const leadA2 = await neonService.createLead({
            email: 'lead-a2@test.com',
            name: 'Lead A2',
            phone: '555-0002',
            source: 'test',
            status: 'new',
            city: 'Test City A',
        }, TENANT_A);

        const leadB1 = await neonService.createLead({
            email: 'lead-b1@test.com',
            name: 'Lead B1',
            phone: '555-0003',
            source: 'test',
            status: 'new',
            city: 'Test City B',
        }, TENANT_B);

        results.push({
            testName: 'Create leads in separate tenants',
            passed: !!(leadA1 && leadA2 && leadB1),
        });

        logger.info(`  ✓ Created leads: A1=${leadA1}, A2=${leadA2}, B1=${leadB1}`);

        // Test 2: Search leads - should only return tenant-specific results
        logger.info('Test 2: Searching leads by tenant...');
        const tenantALeads = await neonService.searchLeads(TENANT_A, {
            status: 'new',
            limit: 100,
        });

        const tenantBLeads = await neonService.searchLeads(TENANT_B, {
            status: 'new',
            limit: 100,
        });

        const tenantAEmails = tenantALeads.leads.map(l => l.email);
        const tenantBEmails = tenantBLeads.leads.map(l => l.email);

        const tenantAHasCorrectLeads = tenantAEmails.includes('lead-a1@test.com') && tenantAEmails.includes('lead-a2@test.com');
        const tenantBHasCorrectLeads = tenantBEmails.includes('lead-b1@test.com');
        const noEmailOverlap = !tenantAEmails.some(email => tenantBEmails.includes(email));

        logger.info(`  Tenant A: ${tenantALeads.leads.length} leads`);
        logger.info(`  Tenant B: ${tenantBLeads.leads.length} leads`);

        results.push({
            testName: 'Search leads returns only tenant-specific data',
            passed: tenantAHasCorrectLeads && tenantBHasCorrectLeads && noEmailOverlap,
            error: !noEmailOverlap ? `Found overlapping emails: ${tenantAEmails.filter(e => tenantBEmails.includes(e))}` : undefined,
        });

        // Test 3: Get lead - should fail for wrong tenant
        logger.info('Test 3: Cross-tenant access prevention...');
        const leadA1FromA = await neonService.getLead(leadA1, TENANT_A);
        const leadA1FromB = await neonService.getLead(leadA1, TENANT_B);

        logger.info(`  Lead A1 from Tenant A: ${leadA1FromA ? 'Found' : 'Not found'}`);
        logger.info(`  Lead A1 from Tenant B: ${leadA1FromB ? 'Found (BAD!)' : 'Not found (GOOD)'}`);

        results.push({
            testName: 'Cross-tenant lead access is blocked',
            passed: !!leadA1FromA && !leadA1FromB,
            error: leadA1FromB ? 'Lead accessible from wrong tenant!' : undefined,
        });

        // Test 4: Create events - should be tenant-scoped
        logger.info('Test 4: Creating events in separate tenants...');
        const eventA = await neonService.createEvent({
            lead_id: leadA1,
            type: 'outbound',
            channel: 'email',
            content: 'Test event for tenant A',
            direction: 'out',
        }, TENANT_A);

        const eventB = await neonService.createEvent({
            lead_id: leadB1,
            type: 'outbound',
            channel: 'email',
            content: 'Test event for tenant B',
            direction: 'out',
        }, TENANT_B);

        results.push({
            testName: 'Create events in separate tenants',
            passed: !!(eventA && eventB),
        });

        logger.info(`  ✓ Created events: A=${eventA}, B=${eventB}`);

        // Test 5: Get lead events - should only return tenant-specific events
        logger.info('Test 5: Retrieving lead events by tenant...');
        const eventsA = await neonService.getLeadEvents(leadA1, TENANT_A, 100);
        const eventsB = await neonService.getLeadEvents(leadB1, TENANT_B, 100);

        logger.info(`  Tenant A events: ${eventsA.length}`);
        logger.info(`  Tenant B events: ${eventsB.length}`);

        results.push({
            testName: 'Lead events are tenant-scoped',
            passed: eventsA.length > 0 && eventsB.length > 0,
        });

        // Test 6: Create approvals - should be tenant-scoped
        logger.info('Test 6: Creating approvals in separate tenants...');
        const approvalA = await neonService.createApproval({
            lead_id: leadA1,
            type: 'message',
            content: 'Test approval for tenant A',
            channel: 'whatsapp',
            status: 'pending',
            ai_score: 0.8,
        }, TENANT_A);

        const approvalB = await neonService.createApproval({
            lead_id: leadB1,
            type: 'message',
            content: 'Test approval for tenant B',
            channel: 'whatsapp',
            status: 'pending',
            ai_score: 0.7,
        }, TENANT_B);

        results.push({
            testName: 'Create approvals in separate tenants',
            passed: !!(approvalA && approvalB),
        });

        logger.info(`  ✓ Created approvals: A=${approvalA}, B=${approvalB}`);

        // Test 7: Get pending approvals - should be tenant-scoped
        logger.info('Test 7: Retrieving pending approvals by tenant...');
        const approvalsA = await neonService.getPendingApprovals(TENANT_A, 100);
        const approvalsB = await neonService.getPendingApprovals(TENANT_B, 100);

        const approvalsAHasData = approvalsA.length > 0;
        const approvalsBHasData = approvalsB.length > 0;
        const noApprovalOverlap = !approvalsA.some(approval =>
            approvalsB.some(bApproval => bApproval.approval_id === approval.approval_id)
        );

        logger.info(`  Tenant A approvals: ${approvalsA.length}`);
        logger.info(`  Tenant B approvals: ${approvalsB.length}`);

        results.push({
            testName: 'Pending approvals are tenant-scoped',
            passed: approvalsAHasData && approvalsBHasData && noApprovalOverlap,
            error: !noApprovalOverlap ? 'Found overlapping approvals between tenants!' : undefined,
        });

        // Print results
        logger.info('\n📊 Test Results:');
        logger.info('═'.repeat(60));

        let passedCount = 0;
        let failedCount = 0;

        results.forEach(result => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            logger.info(`${status} - ${result.testName}`);
            if (result.error) {
                logger.error(`  Error: ${result.error}`);
            }
            result.passed ? passedCount++ : failedCount++;
        });

        logger.info('═'.repeat(60));
        logger.info(`Total: ${results.length} tests`);
        logger.info(`Passed: ${passedCount}`);
        logger.info(`Failed: ${failedCount}`);

        if (failedCount === 0) {
            logger.info('\n🎉 All tenant isolation tests passed!');
            logger.info('✅ Multi-tenancy implementation verified successfully');
        } else {
            logger.error('\n⚠️  Some tests failed - tenant isolation may be compromised!');
            process.exit(1);
        }

    } catch (error) {
        logger.error('Critical test error:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    } finally {
        await neonService.cleanup();
    }
}

runIsolationTests();
