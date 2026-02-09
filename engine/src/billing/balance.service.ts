import { getDatabase, DatabaseManager } from '../database/index.js';
import { DatabaseConnection } from '../database/csv.js'; // Imported interface
import { Logger } from '../utils/logger.js';

export interface Balance {
    tenant_id: string;
    amount: number;
    currency: string;
}

export interface Transaction {
    id: string;
    tenant_id: string;
    amount: number;
    type: 'credit' | 'debit';
    reference_id?: string;
    description?: string;
    balance_after: number;
    metadata?: Record<string, any>;
    created_at: string;
}

export class BalanceService {
    private db: DatabaseManager;
    private logger: Logger;

    constructor(db?: DatabaseManager) {
        this.db = db || getDatabase();
        this.logger = new Logger('BalanceService');
    }

    async getBalance(tenantId: string): Promise<Balance> {
        try {
            const result = await this.db.query(
                'SELECT * FROM balances WHERE tenant_id = ?',
                [tenantId]
            );

            if (!result || result.length === 0) {
                return {
                    tenant_id: tenantId,
                    amount: 0,
                    currency: 'credits'
                };
            }

            return {
                tenant_id: result[0].tenant_id,
                amount: Number(result[0].amount),
                currency: result[0].currency
            };
        } catch (error) {
            this.logger.error('Failed to get balance', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    async addCredits(tenantId: string, amount: number, reference: string, description: string): Promise<Transaction> {
        return this.db.transaction(async (tx: DatabaseConnection) => {
            // 1. Get or Create Balance
            const balanceResult = await tx.query(
                'SELECT * FROM balances WHERE tenant_id = ?',
                [tenantId]
            );

            let currentAmount = 0;
            if (!balanceResult || (Array.isArray(balanceResult) && balanceResult.length === 0)) {
                await tx.query(
                    'INSERT INTO balances (tenant_id, amount, currency) VALUES (?, ?, ?)',
                    [tenantId, amount, 'credits']
                );
                currentAmount = amount;
            } else {
                const balance = Array.isArray(balanceResult) ? balanceResult[0] : balanceResult;
                currentAmount = Number(balance.amount) + amount;
                await tx.query(
                    'UPDATE balances SET amount = ? WHERE tenant_id = ?',
                    [currentAmount, tenantId]
                );
            }

            // 2. Create Transaction Record
            const insertResult = await tx.query(
                'INSERT INTO transactions (tenant_id, amount, type, reference_id, description, balance_after) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
                [tenantId, amount, 'credit', reference, description, currentAmount]
            );

            // Handle difference between Postgres (Row[]) and CSV (Object) return types
            let transactionRecord: any;
            if (Array.isArray(insertResult)) {
                transactionRecord = insertResult[0];
            } else {
                transactionRecord = insertResult;
            }

            // Fallback if ID missing
            if (!transactionRecord || !transactionRecord.id) {
                const verify = await tx.query('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1', [tenantId]);
                transactionRecord = Array.isArray(verify) ? verify[0] : verify;
            }

            return {
                id: transactionRecord.id,
                tenant_id: transactionRecord.tenant_id,
                amount: Number(transactionRecord.amount),
                type: transactionRecord.type,
                reference_id: transactionRecord.reference_id,
                description: transactionRecord.description,
                balance_after: Number(transactionRecord.balance_after),
                created_at: transactionRecord.created_at
            };
        });
    }

    async deductCredits(tenantId: string, amount: number, description: string): Promise<Transaction> {
        return this.db.transaction(async (tx: DatabaseConnection) => {
            // 1. Get Balance
            const balanceResult = await tx.query(
                'SELECT * FROM balances WHERE tenant_id = ?',
                [tenantId]
            );

            const balances = Array.isArray(balanceResult) ? balanceResult : [balanceResult];
            if (!balances || balances.length === 0 || !balances[0]) {
                throw new Error(`Insufficient balance. Tenant has 0 credits.`);
            }

            const currentBalance = Number(balances[0].amount);
            if (currentBalance < amount) {
                throw new Error(`Insufficient balance. Required: ${amount}, Available: ${currentBalance}`);
            }

            const newBalance = currentBalance - amount;

            // 2. Update Balance
            await tx.query(
                'UPDATE balances SET amount = ? WHERE tenant_id = ?',
                [newBalance, tenantId]
            );

            // 3. Create Transaction Record
            const insertResult = await tx.query(
                'INSERT INTO transactions (tenant_id, amount, type, description, balance_after) VALUES (?, ?, ?, ?, ?) RETURNING *',
                [tenantId, amount, 'debit', description, newBalance]
            );

            // Handle difference between Postgres (Row[]) and CSV (Object) return types
            let transactionRecord: any;
            if (Array.isArray(insertResult)) {
                transactionRecord = insertResult[0];
            } else {
                transactionRecord = insertResult;
            }

            if (!transactionRecord || !transactionRecord.id) {
                const verify = await tx.query('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1', [tenantId]);
                transactionRecord = Array.isArray(verify) ? verify[0] : verify;
            }

            return {
                id: transactionRecord.id,
                tenant_id: transactionRecord.tenant_id,
                amount: Number(transactionRecord.amount),
                type: transactionRecord.type,
                reference_id: transactionRecord.reference_id,
                description: transactionRecord.description,
                balance_after: Number(transactionRecord.balance_after),
                created_at: transactionRecord.created_at
            };
        });
    }

    async getTransactions(tenantId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
        const result = await this.db.query(
            'SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [tenantId, limit, offset]
        );

        const rows = Array.isArray(result) ? result : [result];

        return rows.filter(r => r).map(r => ({
            id: r.id,
            tenant_id: r.tenant_id,
            amount: Number(r.amount),
            type: r.type,
            reference_id: r.reference_id,
            description: r.description,
            balance_after: Number(r.balance_after),
            created_at: r.created_at
        }));
    }

    async checkBalance(tenantId: string, requiredAmount: number): Promise<boolean> {
        const balance = await this.getBalance(tenantId);
        return balance.amount >= requiredAmount;
    }
}
