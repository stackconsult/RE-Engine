import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { BalanceService } from '../../src/billing/balance.service.js';
import { DatabaseManager } from '../../src/database/index.js';

describe('BalanceService', () => {
    let balanceService: BalanceService;
    let mockDb: any;

    beforeEach(() => {
        // Mock DatabaseManager interface
        mockDb = {
            query: mock.fn(),
            transaction: mock.fn(async (callback) => {
                // Pass the same mockDb as the transaction connection
                return callback(mockDb);
            })
        };

        balanceService = new BalanceService(mockDb as unknown as DatabaseManager);
    });

    test('getBalance should return 0 for new tenant', async () => {
        // Mock empty result
        mockDb.query.mock.mockImplementation(async () => []);

        const balance = await balanceService.getBalance('tenant-new');
        assert.deepStrictEqual(balance, {
            tenant_id: 'tenant-new',
            amount: 0,
            currency: 'credits'
        });
    });

    test('addCredits should initialize balance and return transaction', async () => {
        // Mock sequence of queries
        mockDb.query.mock.mockImplementation(async (sql: string, params: any[]) => {
            if (sql.includes('SELECT * FROM balances')) {
                return []; // No existing balance
            }
            if (sql.includes('INSERT INTO balances')) {
                return { rowCount: 1 };
            }
            if (sql.includes('INSERT INTO transactions')) {
                // Return created transaction object (CSV style or Postgres RETURNING style)
                return {
                    id: 'tx-1',
                    tenant_id: params[0],
                    amount: params[1],
                    type: 'credit',
                    balance_after: params[5],
                    created_at: new Date().toISOString()
                };
            }
            return [];
        });

        const tx = await balanceService.addCredits('tenant-1', 100, 'ref-1', 'Test credit');

        assert.strictEqual(tx.amount, 100);
        assert.strictEqual(tx.balance_after, 100);
        assert.strictEqual(tx.type, 'credit');
    });

    test('deductCredits should fail insufficient balance', async () => {
        // Mock existing balance
        mockDb.query.mock.mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM balances')) {
                return [{ tenant_id: 'tenant-1', amount: 50, currency: 'credits' }];
            }
            return [];
        });

        await assert.rejects(async () => {
            await balanceService.deductCredits('tenant-1', 100, 'Too expensive');
        }, /Insufficient balance/);
    });

    test('deductCredits should succeed with sufficient balance', async () => {
        mockDb.query.mock.mockImplementation(async (sql: string, params: any[]) => {
            if (sql.includes('SELECT * FROM balances')) {
                return [{ tenant_id: 'tenant-1', amount: 200, currency: 'credits' }];
            }
            if (sql.includes('UPDATE balances')) {
                return { rowCount: 1 };
            }
            if (sql.includes('INSERT INTO transactions')) {
                return {
                    id: 'tx-2',
                    tenant_id: params[0],
                    amount: params[1],
                    type: 'debit',
                    balance_after: params[4],
                    created_at: new Date().toISOString()
                };
            }
            return [];
        });

        const tx = await balanceService.deductCredits('tenant-1', 50, 'Fair charge');
        assert.strictEqual(tx.amount, 50);
        assert.strictEqual(tx.balance_after, 150); // 200 - 50
    });
});
