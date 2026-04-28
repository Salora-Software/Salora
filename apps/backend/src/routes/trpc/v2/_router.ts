import { router as createRouter } from '@/middleware/trpc';
import { router as authenticatedRouter } from './authenticated/_router';

export const router = createRouter({
	authenticated: authenticatedRouter
});
