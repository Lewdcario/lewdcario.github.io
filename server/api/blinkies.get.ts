import { createError, defineEventHandler, getQuery } from 'h3';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const allowedThemePattern = /^[a-z0-9-]+$/i;
const supportedExtensions = new Set([
	'.webp',
	'.png',
	'.gif',
	'.jpg',
	'.jpeg',
	'.avif',
	'.svg'
]);

function resolvePublicDir() {
	const candidates = [join(process.cwd(), 'public'), join(process.cwd(), '.output', 'public')];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw createError({
		statusCode: 500,
		statusMessage: 'Public assets directory is unavailable.'
	});
}

async function listBlinkieFiles(
	publicDir: string,
	type: 'badges' | 'stamps',
	themeFolder: string
) {
	const directory = join(publicDir, 'img', type, themeFolder);

	try {
		const entries = await readdir(directory, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
			.map((fileName) => `/img/${type}/${themeFolder}/${encodeURIComponent(fileName)}`);
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === 'ENOENT'
		) {
			return [];
		}

		throw createError({
			statusCode: 500,
			statusMessage: `Failed loading ${type} folder "${themeFolder}".`
		});
	}
}

export default defineEventHandler(async (event) => {
	const rawTheme = String(getQuery(event).theme ?? '').trim();
	if (!rawTheme) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Missing "theme" query parameter.'
		});
	}

	if (!allowedThemePattern.test(rawTheme)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Theme folder must only contain letters, numbers, and hyphens.'
		});
	}

	const publicDir = resolvePublicDir();
	const [badges, stamps] = await Promise.all([
		listBlinkieFiles(publicDir, 'badges', rawTheme),
		listBlinkieFiles(publicDir, 'stamps', rawTheme)
	]);

	return {
		theme: rawTheme,
		badges,
		stamps
	};
});
