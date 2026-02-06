
import { ComponentManager } from '../orchestration/component-manager';
import { Logger } from '../utils/logger';

async function main() {
    const logger = new Logger('WiringTest', true);
    logger.info('🚀 Starting Wiring Test');

    const componentManager = new ComponentManager();

    try {
        // Initialize reengine-tinyfish as an MCP component
        logger.info('Initializing reengine-tinyfish component...');
        await componentManager.initializeComponent('reengine-tinyfish', {
            type: 'mcp-server', // This triggers createMCPComponent which uses MCPClient
            name: 'reengine-tinyfish'
        });

        // Verify it's initialized
        const health = await componentManager.getHealthStatus();
        console.log('Health Status:', JSON.stringify(health, null, 2));

        if (health['reengine-tinyfish']?.status !== 'healthy') {
            throw new Error('Component failed to initialize healthily');
        }

        // Execute a tool call
        logger.info('Testing tool execution: scrape_real_estate_listings (dry run)...');

        // We'll use a mocked "dry run" or simple call to verify the path works
        // Since we don't want to actually scrape Zillow in a test if we can avoid it, 
        // but the tool implementation might force it.
        // However, the goal is just to see if the REQUEST makes it to the server and back.
        // We can list tools to verify connection first.

        // Actually, ComponentManager doesn't expose listTools directly, only execute.
        // We'll rely on the fact that `execute` uses `listTools` internally to find the tool.

        // Let's call a simple tool if possible, or force an error that comes FROM the server
        // "extract_links" seems safer/faster than scrape

        const result = await componentManager.getComponent('reengine-tinyfish')!.execute('extract_links', {
            url: 'https://example.com'
        });

        console.log('Tool Execution Result:', JSON.stringify(result, null, 2));

        if (result.content && Array.isArray(result.content)) {
            logger.info('✅ Wiring Verification Successful!');
        } else {
            logger.error('❌ Wiring Verification Failed: Unexpected result format');
        }

    } catch (error) {
        logger.error('❌ Wiring Verification Failed:', error);
        process.exit(1);
    } finally {
        await componentManager.shutdown();
    }
}

main().catch(console.error);
