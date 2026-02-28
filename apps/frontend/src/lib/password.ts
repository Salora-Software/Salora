import * as crypto from 'crypto';
const salt = process.env.AUTH_SECRET || crypto.randomBytes(16).toString('hex');
const iterations = parseInt(process.env.AUTH_ITERATIONS || '5000');

export function hashPassword(password: string) {
	let keylen = 64;
	let digest = 'sha512';
	let hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');

	return {
		salt: salt,
		hash: hash,
		iterations: iterations
	};
}

export function verifyPassword(password: string, hash: string) {
	let keylen = 64;
	let digest = 'sha512';
	let newHash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');

	return newHash === hash;
}
