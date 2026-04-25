import { base } from './bases/public';
import { router as v1Router } from './v1/_router';

export const router = base.router({
  v1: v1Router,
});
