import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const thisFile = fileURLToPath(import.meta.url);
const rootDir = resolve(dirname(thisFile), '..');
const constantsPath = resolve(rootDir, 'src/features/shell/constants/shell.ts');

function getHeadShortHash() {
	return execSync('git rev-parse --short=8 HEAD', {
		cwd: rootDir,
		encoding: 'utf8'
	}).trim();
}

function updateMainWindowTitle(source, hash) {
	const titleRegex =
		/(export const mainWindowTitle = '([^']*control-room))(?: \[[0-9a-f]{7,40}\])?(';)/;
	if (!titleRegex.test(source)) {
		throw new Error(
			'Could not find mainWindowTitle export with "control-room" in src/features/shell/constants/shell.ts'
		);
	}

	return source.replace(titleRegex, `$1 [${hash}]$3`);
}

function main() {
	const hash = getHeadShortHash();
	const current = readFileSync(constantsPath, 'utf8');
	const next = updateMainWindowTitle(current, hash);
	if (current === next) return;
	writeFileSync(constantsPath, next, 'utf8');
}

main();
