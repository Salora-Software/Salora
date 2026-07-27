import { getSession } from '$lib/auth-client';
import { createContext } from 'svelte';

type SessionContext = ReturnType<typeof getSession> | null;

export const [getSessionContext, setSessionContext] = createContext<SessionContext | null>();
