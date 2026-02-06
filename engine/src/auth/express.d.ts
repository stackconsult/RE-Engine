/**
 * Express type augmentation for authenticated requests
 * Extends Express Request to include user property set by auth middleware
 */

import { AuthToken } from './auth.service.js';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                permissions?: string[];
            };
        }
    }
}

export { };
