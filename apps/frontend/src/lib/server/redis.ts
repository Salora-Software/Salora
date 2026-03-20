import Redis from 'ioredis';
import { env } from '$lib/server/env';

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
	const url = env.REDIS_PASSWORD
		? `redis://${env.REDIS_USERNAME}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
		: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;

	redis = new Redis(url, {
		lazyConnect: true,
		maxRetriesPerRequest: 1
	});
} else {
	// Workers runtime - use stub
	redis = new WorkerRedisStub();
}

export default redis;
