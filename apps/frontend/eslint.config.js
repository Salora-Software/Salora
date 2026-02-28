import { config } from '@salora/eslint-config';
import { fileURLToPath } from 'node:url';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));
const dirname = fileURLToPath(new URL('.', import.meta.url));

export default config({
	gitignorePath,
	tsconfigRootDir: dirname
});
