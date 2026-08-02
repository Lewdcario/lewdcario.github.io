import { defineEventHandler, getHeader, getRequestURL, sendRedirect } from 'h3';

const portfolioHost = 'portfolio.okami.codes';
const portfolioUrl = 'https://okami.codes/portfolio';

const normalizeHost = (host: string | undefined) =>
	host?.split(',')[0]?.trim().split(':')[0]?.toLowerCase() ?? '';

export default defineEventHandler((event) => {
	const forwardedHost = normalizeHost(getHeader(event, 'x-forwarded-host'));
	const host = normalizeHost(getHeader(event, 'host'));

	if (forwardedHost !== portfolioHost && host !== portfolioHost) {
		return;
	}

	const requestUrl = getRequestURL(event);
	return sendRedirect(event, `${portfolioUrl}${requestUrl.search}`, 301);
});
