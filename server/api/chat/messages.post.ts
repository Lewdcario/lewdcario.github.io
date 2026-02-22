import {
	createError,
	defineEventHandler,
	getRequestHeader,
	readBody,
	setResponseHeader
} from 'h3';
import type { H3Event } from 'h3';
import {
	chatMessageResponseSchema,
	createChatMessageInputSchema
} from '~/shared/chat';
import { ensureBlogStorage, getBlogDb } from '~/server/db/client';
import { chatBlacklistedWords, chatMessages } from '~/server/db/schema';
import { toChatMessageRecord } from '~/server/utils/chat';

type RateLimitBucket = {
	max: number;
	windowMs: number;
};

const shortBurstLimit: RateLimitBucket = { max: 3, windowMs: 10_000 };
const minuteBurstLimit: RateLimitBucket = { max: 12, windowMs: 60_000 };
const rateLimitStore = new Map<string, number[]>();

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function messageContainsBlockedWord(message: string, blockedWords: string[]) {
	const normalizedMessage = message.toLowerCase();
	for (const rawWord of blockedWords) {
		const blocked = rawWord.trim().toLowerCase();
		if (!blocked) continue;
		if (blocked.includes(' ')) {
			if (normalizedMessage.includes(blocked)) return true;
			continue;
		}

		const pattern = new RegExp(
			`(^|[^a-z0-9])${escapeRegex(blocked)}([^a-z0-9]|$)`,
			'i'
		);
		if (pattern.test(normalizedMessage)) return true;
	}

	return false;
}

function getClientIp(event: H3Event) {
	const forwardedFor = getRequestHeader(event, 'x-forwarded-for');
	if (forwardedFor) {
		const first = forwardedFor.split(',')[0]?.trim();
		if (first) return first;
	}

	const realIp = getRequestHeader(event, 'x-real-ip');
	if (realIp?.trim()) return realIp.trim();

	return event.node.req.socket.remoteAddress ?? 'unknown-ip';
}

function checkRateLimit(key: string, bucket: RateLimitBucket) {
	const now = Date.now();
	const windowStart = now - bucket.windowMs;
	const previousHits = rateLimitStore.get(key) ?? [];
	const recentHits = previousHits.filter(
		(timestamp) => timestamp > windowStart
	);
	const nextCount = recentHits.length + 1;

	if (nextCount > bucket.max) {
		const oldestHit = recentHits[0] ?? now;
		const retryAfterMs = Math.max(0, oldestHit + bucket.windowMs - now);
		return {
			allowed: false,
			retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
		} as const;
	}

	recentHits.push(now);
	rateLimitStore.set(key, recentHits);
	return { allowed: true, retryAfterSeconds: 0 } as const;
}

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	const parsed = createChatMessageInputSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage:
				parsed.error.issues[0]?.message ?? 'Invalid chat payload.'
		});
	}

	try {
		await ensureBlogStorage();
		const db = getBlogDb();
		const input = parsed.data;
		const normalizedName = input.name.trim().toLowerCase();
		const clientIp = getClientIp(event);
		const limiterKeys = [
			`ip:${clientIp}`,
			`name:${normalizedName}`,
			`pair:${clientIp}:${normalizedName}`
		];

		for (const key of limiterKeys) {
			const shortResult = checkRateLimit(`${key}:short`, shortBurstLimit);
			if (!shortResult.allowed) {
				setResponseHeader(
					event,
					'Retry-After',
					String(shortResult.retryAfterSeconds)
				);
				throw createError({
					statusCode: 429,
					statusMessage: `You're sending messages too quickly. Please wait ${shortResult.retryAfterSeconds}s.`
				});
			}

			const minuteResult = checkRateLimit(
				`${key}:minute`,
				minuteBurstLimit
			);
			if (!minuteResult.allowed) {
				setResponseHeader(
					event,
					'Retry-After',
					String(minuteResult.retryAfterSeconds)
				);
				throw createError({
					statusCode: 429,
					statusMessage: `Rate limit reached. Try sending another message in ${minuteResult.retryAfterSeconds}s.`
				});
			}
		}

		const blockedRows = await db
			.select({
				word: chatBlacklistedWords.word
			})
			.from(chatBlacklistedWords);
		const blockedWords = blockedRows
			.map((row) => row.word.trim())
			.filter(Boolean);
		if (messageContainsBlockedWord(input.message, blockedWords)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Message blocked by chat word filter.'
			});
		}

		const inserted = await db
			.insert(chatMessages)
			.values({
				name: input.name,
				message: input.message
			})
			.returning();

		const insertedRow = inserted[0];
		if (!insertedRow) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Failed sending chat message.'
			});
		}

		return chatMessageResponseSchema.parse({
			message: toChatMessageRecord(insertedRow)
		});
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			typeof (error as { statusCode?: unknown }).statusCode === 'number'
		) {
			throw error;
		}

		throw createError({
			statusCode: 500,
			statusMessage: 'Failed sending chat message.'
		});
	}
});
