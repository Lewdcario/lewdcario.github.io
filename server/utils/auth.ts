import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthSessionRole } from '~/shared/auth';

const adminCookieName = 'okami_admin_session';
const adminSessionMaxAgeSeconds = 60 * 60 * 8;

interface AdminSessionPayload {
	role: 'admin';
	exp: number;
}

function resolveAdminPassword() {
	const runtimeConfig = useRuntimeConfig();
	const fromConfig =
		typeof runtimeConfig.adminPassword === 'string' ? runtimeConfig.adminPassword.trim() : '';
	const fromEnv = typeof process.env.ADMIN_PASSWORD === 'string' ? process.env.ADMIN_PASSWORD.trim() : '';
	return fromConfig || fromEnv;
}

function resolveSessionSecret() {
	const runtimeConfig = useRuntimeConfig();
	const fromConfig =
		typeof runtimeConfig.authSessionSecret === 'string'
			? runtimeConfig.authSessionSecret.trim()
			: '';
	if (fromConfig) return fromConfig;

	const adminPassword = resolveAdminPassword();
	if (adminPassword) return `fallback:${adminPassword}`;

	return 'okami-dev-session-secret';
}

function signSessionPayload(encodedPayload: string) {
	return createHmac('sha256', resolveSessionSecret())
		.update(encodedPayload)
		.digest('base64url');
}

function secureStringEqual(left: string, right: string) {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeAdminToken(token: string): AdminSessionPayload | null {
	const dotIndex = token.indexOf('.');
	if (dotIndex <= 0) return null;

	const encodedPayload = token.slice(0, dotIndex);
	const receivedSignature = token.slice(dotIndex + 1);
	if (!encodedPayload || !receivedSignature) return null;

	const expectedSignature = signSessionPayload(encodedPayload);
	if (!secureStringEqual(expectedSignature, receivedSignature)) {
		return null;
	}

	try {
		const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
		if (!parsed || typeof parsed !== 'object') return null;
		if ((parsed as { role?: string }).role !== 'admin') return null;
		const expiresAt = Number((parsed as { exp?: unknown }).exp);
		if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

		return {
			role: 'admin',
			exp: expiresAt
		};
	} catch {
		return null;
	}
}

export function readConfiguredAdminPassword() {
	return resolveAdminPassword();
}

export function setAdminSession(event: H3Event) {
	const payload: AdminSessionPayload = {
		role: 'admin',
		exp: Date.now() + adminSessionMaxAgeSeconds * 1000
	};
	const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
	const signature = signSessionPayload(encodedPayload);
	const token = `${encodedPayload}.${signature}`;

	setCookie(event, adminCookieName, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: adminSessionMaxAgeSeconds
	});
}

export function clearAdminSession(event: H3Event) {
	deleteCookie(event, adminCookieName, {
		path: '/'
	});
}

export function getAuthSessionRole(event: H3Event): AuthSessionRole {
	const token = getCookie(event, adminCookieName);
	if (!token) return 'guest';

	const payload = decodeAdminToken(token);
	if (!payload) return 'guest';
	return payload.role;
}

export function assertAdminSession(event: H3Event) {
	if (getAuthSessionRole(event) !== 'admin') {
		throw createError({
			statusCode: 401,
			statusMessage: 'Admin session required.'
		});
	}
}
