import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from '$env/static/private';

const isWorkerTarget = process.env.DEPLOY_TARGET === 'worker';

export type QueueRedisClient = {
	lpush: (key: string, value: string) => Promise<unknown>;
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string) => Promise<'OK'>;
	del?: (key: string) => Promise<number>;
	incr?: (key: string) => Promise<number>;
	expire?: (key: string, seconds: number) => Promise<number>;
	ttl?: (key: string) => Promise<number>;
};

// For Workers, provide a no-op stub that won't cause runtime errors
class WorkerRedisStub implements QueueRedisClient {
	async lpush() { return 0; }
	async get() { return null; }
	async set() { return 'OK'; }
	async del() { return 0; }
	async incr() { return 0; }
	async expire() { return 0; }
	async ttl() { return -1; }
}

let redis: QueueRedisClient | null = null;

if (!isWorkerTarget) {
	const url = REDIS_PASSWORD
		? `redis://${REDIS_USERNAME}:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
		: `redis://${REDIS_HOST}:${REDIS_PORT}`;

	redis = new Redis(url, {
		lazyConnect: true,
		maxRetriesPerRequest: 1
	});
} else {
	// Workers runtime - use stub
	redis = new WorkerRedisStub();
}

export default redis;
