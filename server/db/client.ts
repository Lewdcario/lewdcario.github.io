import { createError } from 'h3';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

interface DbRuntimeState {
	url: string;
	pool: Pool;
	db: ReturnType<typeof drizzle>;
	schemaReady: Promise<void> | null;
}

type GlobalDbState = typeof globalThis & {
	__okamiBlogDb?: DbRuntimeState;
};

function resolveDatabaseUrl() {
	const runtimeConfig = useRuntimeConfig();
	const fromConfig =
		typeof runtimeConfig.databaseUrl === 'string'
			? runtimeConfig.databaseUrl.trim()
			: '';
	const fromEnv = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : '';
	const databaseUrl = fromConfig || fromEnv;

	if (!databaseUrl) {
		throw createError({
			statusCode: 500,
			statusMessage:
				'DATABASE_URL is not configured. Add DATABASE_URL (or runtimeConfig.databaseUrl) to use the blog.'
		});
	}

	return databaseUrl;
}

function shouldUseSsl(databaseUrl: string) {
	try {
		const parsed = new URL(databaseUrl);
		const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
		return !localHosts.has(parsed.hostname);
	} catch {
		return false;
	}
}

function createDbRuntimeState(databaseUrl: string): DbRuntimeState {
	const pool = new Pool({
		connectionString: databaseUrl,
		max: 6,
		ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined
	});

	const db = drizzle(pool, { schema });
	return {
		url: databaseUrl,
		pool,
		db,
		schemaReady: null
	};
}

function getDbRuntimeState() {
	const databaseUrl = resolveDatabaseUrl();
	const globalState = globalThis as GlobalDbState;

	if (!globalState.__okamiBlogDb || globalState.__okamiBlogDb.url !== databaseUrl) {
		globalState.__okamiBlogDb = createDbRuntimeState(databaseUrl);
	}

	return globalState.__okamiBlogDb;
}

async function seedBlogPosts(pool: Pool) {
	const countResult = await pool.query<{ count: string }>('SELECT COUNT(*)::int AS count FROM blog_posts');
	const existingCount = Number(countResult.rows[0]?.count ?? 0);
	if (existingCount > 0) return;

	await pool.query(
		`INSERT INTO blog_posts (slug, title, excerpt, content, author, published)
		 VALUES
			($1, $2, $3, $4, $5, true),
			($6, $7, $8, $9, $10, true)`,
		[
			'welcome-to-the-blog',
			'Welcome To The Blog',
			'First post from the new database-backed blog.',
			'This page is now backed by PostgreSQL + Drizzle. More updates soon.',
			'Okami',
			'build-notes',
			'Build Notes',
			'Admin-authenticated posting is now wired into this shell.',
			'Guest can read. Admin can publish from the Blog tab in the main window.',
			'Okami'
		]
	);
}

export async function ensureBlogStorage() {
	const runtime = getDbRuntimeState();
	if (runtime.schemaReady) {
		await runtime.schemaReady;
		return;
	}

	runtime.schemaReady = (async () => {
		await runtime.pool.query(`
			CREATE TABLE IF NOT EXISTS blog_posts (
				id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				slug varchar(190) NOT NULL UNIQUE,
				title varchar(160) NOT NULL,
				excerpt varchar(400) NOT NULL DEFAULT '',
				content text NOT NULL,
				author varchar(120) NOT NULL DEFAULT 'Okami',
				published boolean NOT NULL DEFAULT true,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now()
			);

			CREATE INDEX IF NOT EXISTS blog_posts_published_created_idx
			ON blog_posts (published, created_at DESC);

			CREATE TABLE IF NOT EXISTS chat_messages (
				id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				name varchar(48) NOT NULL,
				message text NOT NULL,
				created_at timestamptz NOT NULL DEFAULT now()
			);

			CREATE INDEX IF NOT EXISTS chat_messages_created_idx
			ON chat_messages (created_at);
		`);

		await seedBlogPosts(runtime.pool);
	})().catch((error) => {
		runtime.schemaReady = null;
		throw error;
	});

	await runtime.schemaReady;
}

export function getBlogDb() {
	return getDbRuntimeState().db;
}
