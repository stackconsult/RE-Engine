// @ts-nocheck - Express Request.user type conflict needs module augmentation (Phase 3)
/**
 * Authentication Middleware for Web Dashboard
 * JWT token verification and user session management
 */
import { AuthService } from './auth.service.js';
export class AuthMiddleware {
    authService;
    constructor() {
        this.authService = new AuthService();
    }
    async initialize() {
        await this.authService.initialize();
    }
    // Express middleware for authentication
    authenticate() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                if (!token) {
                    return res.status(401).json({ error: 'No token provided' });
                }
                const authToken = await this.authService.verifyToken(token);
                if (!authToken) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }
                req.user = authToken;
                next();
            }
            catch (error) {
                console.error('Authentication error:', error);
                res.status(401).json({ error: 'Authentication failed' });
            }
        };
    }
    // Role-based authorization middleware
    authorize(requiredPermission) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
                if (!req.user.permissions.includes(requiredPermission)) {
                    return res.status(403).json({
                        error: 'Insufficient permissions',
                        required: requiredPermission,
                        current: req.user.permissions
                    });
                }
                next();
            }
            catch (error) {
                console.error('Authorization error:', error);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        };
    }
    // Login endpoint
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }
            const authToken = await this.authService.authenticate(username, password);
            if (!authToken) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            res.json({
                success: true,
                token: authToken.token,
                user: authToken.user,
                permissions: authToken.permissions,
                expiresAt: authToken.expiresAt
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
    // Logout endpoint
    async logout(req, res) {
        // In a real implementation, you might want to invalidate the token
        // For now, we'll just return success
        res.json({ success: true, message: 'Logged out successfully' });
    }
    // Get current user info
    async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            res.json({
                success: true,
                user: req.user.user,
                permissions: req.user.permissions,
                expiresAt: req.user.expiresAt
            });
        }
        catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Failed to get user info' });
        }
    }
    // Change password
    async changePassword(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: 'Old and new passwords required' });
            }
            const success = await this.authService.changePassword(req.user.user.user_id, oldPassword, newPassword);
            if (!success) {
                return res.status(400).json({ error: 'Invalid old password' });
            }
            res.json({ success: true, message: 'Password changed successfully' });
        }
        catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    }
    extractToken(req) {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        // Extract token from cookie
        const token = req.cookies?.token;
        if (token) {
            return token;
        }
        return null;
    }
    // Generate API key for user
    async generateApiKey(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            const apiKey = this.authService.generateApiKey(req.user.user.user_id);
            res.json({
                success: true,
                apiKey,
                message: 'API key generated. Save it securely as it won\'t be shown again.'
            });
        }
        catch (error) {
            console.error('Generate API key error:', error);
            res.status(500).json({ error: 'Failed to generate API key' });
        }
    }
    async close() {
        await this.authService.close();
    }
}
//# sourceMappingURL=auth.middleware.js.map