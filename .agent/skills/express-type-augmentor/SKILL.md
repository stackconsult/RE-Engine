---
name: express-type-augmentor
description: Augment Express Request types for authentication
---

# Express Type Augmentation Skill

This skill guides the augmentation of Express types to support `req.user` in a strictly typed environment.

## Steps

1.  **Create Declaration File**:
    -   Create `src/types/express.d.ts` (if not exists).
    -   Add module augmentation:
        ```typescript
        import { AuthToken } from '../auth/auth.service';
        declare global {
          namespace Express {
            interface Request {
              user?: AuthToken;
            }
          }
        }
        ```

2.  **Verify Configuration**:
    -   Ensure `tsconfig.json` includes `src/types` or `src/**/*`.
    -   Ensure `typeRoots` is correctly configured or relies on default node_modules/@types.

3.  **Refactor Middleware**:
    -   In `src/auth/auth.middleware.ts`, remove `@ts-nocheck`.
    -   Remove custom `AuthenticatedRequest` interface if it duplicates the global augmentation.
    -   Update usage to standard `Request`.

4.  **Refactor Consumers**:
    -   Update `mobile-api.service.ts` to remove `@ts-nocheck`.
    -   Remove local `AuthenticatedRequest` definitions.
