import { createError, defineEventHandler, readBody } from 'h3';
import { timingSafeEqual } from 'node:crypto';
import { authLoginRequestSchema, authSessionResponseSchema } from '~/shared/auth';
import { clearAdminSession, readConfiguredAdminPassword, setAdminSession } from '~/server/utils/auth';

function secureStringEqual(left: string, right: string) {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
}

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const parsed = authLoginRequestSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: parsed.error.issues[0]?.message ?? 'Invalid login payload.'
		});
	}

	const { user, password } = parsed.data;
	if (user === 'guest') {
		clearAdminSession(event);
		return authSessionResponseSchema.parse({ role: 'guest' });
	}

	const configuredAdminPassword = readConfiguredAdminPassword();
	if (!configuredAdminPassword) {
		throw createError({
			statusCode: 500,
			statusMessage: 'ADMIN_PASSWORD is not configured on the server.'
		});
	}

	if (!secureStringEqual(configuredAdminPassword, password ?? '')) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Invalid admin password.'
		});
	}

	setAdminSession(event);
	return authSessionResponseSchema.parse({ role: 'admin' });
});
