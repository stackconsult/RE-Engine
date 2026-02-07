
import { AuthToken } from '../auth/auth.service';
import { ServiceAuth } from '../middleware/service-auth';

declare global {
    namespace Express {
        interface Request {
            user?: AuthToken;
            service?: ServiceAuth;
            tenantId?: string;
        }
    }
}
