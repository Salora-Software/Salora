import { base } from '../bases/public';
import { aliveHandler } from './alive.handler';
import { protectedHandler } from './protected.handler';

export const router = base.tag('v1').router({
  alive: aliveHandler,
  protected: protectedHandler,
});
