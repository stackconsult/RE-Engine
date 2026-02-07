
import { ComponentManager } from '../orchestration/component-manager.js';
import { Logger } from '../utils/logger.js';

async function main() {
    const logger = new Logger('StressTest', true);
    const numRequests = 50;
    logger.info(`🚀 Starting Stress Test: ${numRequests} Concurrent Requests`);

    const componentManager = new ComponentManager();

    try {
        await componentManager.initializeComponent('reengine-tinyfish', {
            type: 'mcp-server',
            name: 'reengine-tinyfish'
        });

        const requests = Array.from({ length: numRequests }).map(async (_, i) => {
            const start = Date.now();
            try {
                // reengine-tinyfish has an extract_links tool
                const result = await componentManager.getComponent('reengine-tinyfish')!.execute('extract_links', {
                    url: `https://example.com/page-${i}`, // Unique simulated urls
                    filter: 'example'
                });
                return { success: true, latency: Date.now() - start, id: i };
            } catch (e) {
                return { success: false, latency: Date.now() - start, error: e.message, id: i };
            }
        });

        logger.info(`💥 Unleashing ${numRequests} requests...`);
        const results = await Promise.all(requests);

        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);
        const avgLatency = successes.reduce((acc, r) => acc + r.latency, 0) / (successes.length || 1);

        logger.info('📊 Stress Test Results:');
        logger.info(`Total Requests: ${results.length}`);
        logger.info(`Successful: ${successes.length}`);
        logger.info(`Failed: ${failures.length}`);
        logger.info(`Average Latency: ${avgLatency.toFixed(2)}ms`);

        if (failures.length > 0) {
            logger.warn('Sample Errors:', failures.slice(0, 3).map(f => f.error));
            if (failures.length > numRequests * 0.1) { // Error if more than 10% fail
                throw new Error(`Stress test failed with ${failures.length} errors`);
            }
        }

        logger.info('✅ System passed stress test under load.');

    } catch (error) {
        logger.error('❌ Stress Test Failed:', error);
        process.exit(1);
    } finally {
        await componentManager.shutdown();
    }
}

main().catch(console.error);
