import { Request, Response, NextFunction } from 'express';
import { BalanceService } from '../billing/balance.service.js';

// Assuming global augmentation handled elsewhere, but defining interface for clarity here
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        tenant_id: string;
        email?: string;
        role?: string;
        [key: string]: any;
    };
}

const balanceService = new BalanceService();

/**
 * Middleware to ensure tenant has sufficient balance before proceeding.
 * Returns 402 Payment Required if insufficient.
 */
export const checkBalance = (minimumAmount: number = 0) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authReq = req as AuthenticatedRequest;

            // Skip check if no tenant context (auth middleware should handle 401)
            // Or maybe this route is public? But public routes usually don't cost money.
            if (!authReq.user || !authReq.user.tenant_id) {
                return next();
            }

            const hasFunds = await balanceService.checkBalance(authReq.user.tenant_id, minimumAmount);

            if (!hasFunds) {
                res.status(402).json({
                    error: 'Insufficient funds',
                    message: `This operation requires at least ${minimumAmount} credits. Please top up your balance.`
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Balance check failed', error);
            res.status(500).json({ error: 'Failed to verify balance' });
        }
    };
};

/**
 * Middleware to deduct credits AFTER successful operation.
 * @param amount Cost in credits
 * @param description Description for transaction log
 */
export const deductCost = (amount: number, description: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const tenantId = authReq.user?.tenant_id;

        if (!tenantId) return next();

        // Hook into response finish event to deduct credits only on success (2xx)
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    await balanceService.deductCredits(tenantId!, amount, description);
                } catch (error) {
                    console.error(`CRITICAL: Failed to deduct ${amount} credits for tenant ${tenantId}`, error);
                    // TODO: Report to Sentry/Alerting system
                }
            }
        });

        next();
    };
};
