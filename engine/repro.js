
import { CSVConnection } from './dist/src/database/csv.js';

async function test() {
    console.log('Starting repro...');
    const db = new CSVConnection({ dataDir: './data' });
    await db.connect();
    console.log('Connected');

    try {
        // Clean up
        console.log('Cleaning up...');
        try {
            await db.query('DELETE FROM repro_test WHERE id = ?', ['1']);
        } catch (e) {
            console.log('Cleanup error (expected if empty or file missing):', e.message);
        }

        console.log('Inserting...');
        await db.query('INSERT INTO repro_test (id, name) VALUES (?, ?)', ['1', 'test_name']);
        console.log('Insert done');

        console.log('Selecting...');
        const res = await db.query('SELECT * FROM repro_test WHERE id = ?', ['1']);
        console.log('Select result:', JSON.stringify(res, null, 2));

        if (res.length > 0 && res[0].id === '1') {
            console.log('SUCCESS: Found record');
        } else {
            console.log('FAILURE: Record not found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.disconnect();
    }
}

test();
