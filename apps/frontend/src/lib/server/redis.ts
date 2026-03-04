import {  Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from '$env/static/private';

const url = REDIS_PASSWORD
	? `redis://${REDIS_USERNAME}:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
	: `redis://${REDIS_HOST}:${REDIS_PORT}`;

const redis = new Redis(url);

// @ts-ignore
redis.onconnect = () => {
	console.log('✅ Connected to Redis (Bun)');
};

// @ts-ignore
redis.onclose = (err) => {
	if (err) console.error('❌ Redis connection closed with error:', err);
};

export default redis;
