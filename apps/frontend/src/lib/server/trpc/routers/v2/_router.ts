import { router as createRouter } from '../../context';
import { router as authenticatedRouter } from './authenticated/_router';

export const router = createRouter({
	authenticated: authenticatedRouter
});
