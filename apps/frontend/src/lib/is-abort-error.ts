/**
 * Returns true when an error is the result of aborting/cancelling a request
 * (TanStack Query cancellation, navigation, unmount, AbortController, ...).
 *
 * These errors are expected control flow, so callers should not surface them to
 * the user as a failure.
 */
export function isAbortError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;

	const err = error as {
		name?: unknown;
		code?: unknown;
		message?: unknown;
		cause?: unknown;
	};

	if (err.name === 'AbortError' || err.name === 'CanceledError') return true;
	if (err.code === 'ABORT_ERR' || err.code === 'ERR_CANCELED') return true;
	if (typeof err.message === 'string' && /aborted|abort error/i.test(err.message)) return true;

	// tRPC wraps the underlying abort error in a `TRPCClientError`.
	if (err.cause && err.cause !== error) return isAbortError(err.cause);

	return false;
}
