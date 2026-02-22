import { createError, defineEventHandler, getQuery } from 'h3';

const maxHtmlBytes = 1_500_000;
const requestTimeoutMs = 12_000;
const headlessNetworkIdleTimeoutMs = 4_000;
const headlessExtraWaitMs = 450;
const allowedProtocols = new Set(['http:', 'https:']);
const browserShellName = 'Netscape Navigator';
const navigatorUserAgent =
	'Mozilla/5.0 (Windows NT 5.1; rv:109.0) Gecko/20100101 Firefox/117.0 Netscape Navigator';

interface StaticHtmlFetchResult {
	finalUrl: string;
	contentType: string;
	body: string;
}

interface HeadlessRenderResult {
	finalUrl: string;
	contentType: string;
	html: string;
	title: string;
}

function isDuckDuckGoHost(hostname: string) {
	const lowered = hostname.toLowerCase();
	return (
		lowered === 'duckduckgo.com' ||
		lowered === 'www.duckduckgo.com' ||
		lowered === 'html.duckduckgo.com' ||
		lowered === 'lite.duckduckgo.com'
	);
}

function duckDuckGoQuery(target: URL) {
	if (!isDuckDuckGoHost(target.hostname)) return '';
	return target.searchParams.get('q')?.trim() ?? '';
}

function isDuckDuckGoProtectionPage(target: URL, result: HeadlessRenderResult) {
	if (!isDuckDuckGoHost(target.hostname)) return false;

	let final: URL | null = null;
	try {
		final = new URL(result.finalUrl);
	} catch {
		final = null;
	}

	if (final && isDuckDuckGoHost(final.hostname)) {
		const blockedPath = final.pathname
			.toLowerCase()
			.startsWith('/static-pages/418');
		if (blockedPath) return true;
	}

	const loweredHtml = result.html.toLowerCase();
	return (
		loweredHtml.includes('error-lite+') ||
		loweredHtml.includes('anomaly-modal') ||
		loweredHtml.includes('anomaly.js?sv=')
	);
}

function startpageSearchUrl(query: string) {
	return `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function parseTargetUrl(rawUrl: unknown) {
	if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Missing "url" query parameter.'
		});
	}

	let target: URL;
	try {
		target = new URL(rawUrl);
	} catch {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid URL.'
		});
	}

	if (!allowedProtocols.has(target.protocol)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Only http and https URLs are supported.'
		});
	}

	return target;
}

async function fetchStaticHtml(target: URL): Promise<StaticHtmlFetchResult> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

	let response: Response;
	try {
		response = await fetch(target.toString(), {
			redirect: 'follow',
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
				'Accept-Language': 'en-US,en;q=0.8',
				'User-Agent': navigatorUserAgent
			}
		});
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw createError({
				statusCode: 504,
				statusMessage: 'Timed out while requesting the website.'
			});
		}

		throw createError({
			statusCode: 502,
			statusMessage: 'Could not reach the website.'
		});
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		throw createError({
			statusCode: 502,
			statusMessage: `Website returned HTTP ${response.status}.`
		});
	}

	const finalUrl = response.url || target.toString();
	const contentType =
		response.headers.get('content-type')?.toLowerCase() ?? '';
	const responseBuffer = await response.arrayBuffer();
	if (responseBuffer.byteLength > maxHtmlBytes) {
		throw createError({
			statusCode: 413,
			statusMessage: 'Page is too large to render in-window.'
		});
	}

	const body = new TextDecoder('utf-8').decode(responseBuffer);
	return { finalUrl, contentType, body };
}

async function renderWithHeadlessBrowser(
	target: URL
): Promise<HeadlessRenderResult> {
	const playwright = await import('playwright');
	const browser = await playwright.chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	try {
		const context = await browser.newContext({
			userAgent: navigatorUserAgent,
			viewport: { width: 1280, height: 900 },
			javaScriptEnabled: true,
			bypassCSP: true
		});

		try {
			const page = await context.newPage();
			const response = await page.goto(target.toString(), {
				waitUntil: 'domcontentloaded',
				timeout: requestTimeoutMs
			});
			await page
				.waitForLoadState('networkidle', {
					timeout: headlessNetworkIdleTimeoutMs
				})
				.catch(() => undefined);
			await page.waitForTimeout(headlessExtraWaitMs);

			const finalUrl = page.url() || target.toString();
			const contentType =
				response?.headers()['content-type']?.toLowerCase() ?? '';
			const html = await page.content();
			if (Buffer.byteLength(html, 'utf8') > maxHtmlBytes) {
				throw createError({
					statusCode: 413,
					statusMessage: 'Page is too large to render in-window.'
				});
			}

			const title =
				(await page.title()).trim() || new URL(finalUrl).hostname;
			return { finalUrl, contentType, html, title };
		} finally {
			await context.close();
		}
	} finally {
		await browser.close();
	}
}

function stripDangerousMarkup(html: string) {
	return html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
		.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
		.replace(/<embed\b[^>]*>/gi, '')
		.replace(
			/<meta\b[^>]*http-equiv\s*=\s*['"]?content-security-policy['"]?[^>]*>/gi,
			''
		)
		.replace(
			/<meta\b[^>]*http-equiv\s*=\s*['"]?content-security-policy-report-only['"]?[^>]*>/gi,
			''
		)
		.replace(/<base\b[^>]*>/gi, '')
		.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
		.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
		.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
		.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
		.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');
}

function injectBrowserBridge(html: string, sourceUrl: string) {
	const safeSourceUrl = escapeHtml(sourceUrl);
	const injectedHead = `<base href="${safeSourceUrl}" target="_self"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;padding:0;background:#fff;color:#111;}</style><script>(()=>{const toAbsolute=(href)=>{try{return new URL(href,document.baseURI).toString();}catch{return'';}};const navigate=(href)=>{const absolute=toAbsolute(href);if(!absolute)return;parent.postMessage({type:'browser:navigate',href:absolute},'*');};for(const anchor of document.querySelectorAll('a[target]')){anchor.setAttribute('target','_self');}window.open=(rawUrl)=>{if(rawUrl===undefined||rawUrl===null)return null;navigate(String(rawUrl));return null;};document.addEventListener('click',(event)=>{const target=event.target;if(!(target instanceof Element))return;const anchor=target.closest('a[href]');if(!anchor)return;const href=anchor.getAttribute('href')||'';const lowered=href.trim().toLowerCase();if(!href||lowered.startsWith('#')||lowered.startsWith('javascript:')||lowered.startsWith('mailto:')||lowered.startsWith('tel:'))return;event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function'){event.stopImmediatePropagation();}navigate(href);},true);document.addEventListener('submit',(event)=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;const rawAction=form.getAttribute('action')||document.location.href;const action=toAbsolute(rawAction);if(!action)return;const method=(form.getAttribute('method')||'get').toLowerCase();if(method!=='get'){return;}event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function'){event.stopImmediatePropagation();}const params=new URLSearchParams();for(const [key,value] of new FormData(form).entries()){if(typeof value==='string'){params.append(key,value);}}const nextUrl=new URL(action);for(const [key,value] of params.entries()){nextUrl.searchParams.append(key,value);}navigate(nextUrl.toString());},true);})();</script>`;

	if (/<head\b[^>]*>/i.test(html)) {
		return html.replace(
			/<head\b[^>]*>/i,
			(match) => `${match}${injectedHead}`
		);
	}

	if (/<html\b[^>]*>/i.test(html)) {
		return html.replace(
			/<html\b[^>]*>/i,
			(match) => `${match}<head>${injectedHead}</head>`
		);
	}

	return `<!doctype html><html><head>${injectedHead}</head><body>${html}</body></html>`;
}

function extractTitle(html: string) {
	const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
	if (!titleMatch) return '';
	const title = titleMatch[1] ?? '';
	return title.replace(/\s+/g, ' ').trim();
}

function buildFallbackDocument(targetUrl: string, message: string) {
	const safeTargetUrl = escapeHtml(targetUrl);
	const safeMessage = escapeHtml(message);
	return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font:12px Tahoma,Arial,sans-serif;background:#fff;color:#111}h1{margin:0 0 8px;font-size:13px}.hint{color:#555}</style></head><body><h1>${browserShellName}</h1><p>${safeMessage}</p><p class="hint">${safeTargetUrl}</p></body></html>`;
}

function toBrowserPayload(url: string, title: string, html: string) {
	const sanitized = stripDangerousMarkup(html);
	return {
		url,
		title: title || extractTitle(sanitized) || new URL(url).hostname,
		html: injectBrowserBridge(sanitized, url)
	};
}

export default defineEventHandler(async (event) => {
	const target = parseTargetUrl(getQuery(event).url);

	try {
		let headlessResult = await renderWithHeadlessBrowser(target);
		if (isDuckDuckGoProtectionPage(target, headlessResult)) {
			const query = duckDuckGoQuery(target);
			if (query) {
				const startpageTarget = new URL(startpageSearchUrl(query));
				headlessResult =
					await renderWithHeadlessBrowser(startpageTarget);
			}
		}
		if (
			headlessResult.contentType &&
			!headlessResult.contentType.includes('text/html')
		) {
			return {
				url: headlessResult.finalUrl,
				title: new URL(headlessResult.finalUrl).hostname,
				html: buildFallbackDocument(
					headlessResult.finalUrl,
					`This URL returned ${headlessResult.contentType}. Use Open External for files.`
				)
			};
		}

		return toBrowserPayload(
			headlessResult.finalUrl,
			headlessResult.title,
			headlessResult.html
		);
	} catch {
		const staticResult = await fetchStaticHtml(target);
		if (!staticResult.contentType.includes('text/html')) {
			return {
				url: staticResult.finalUrl,
				title: new URL(staticResult.finalUrl).hostname,
				html: buildFallbackDocument(
					staticResult.finalUrl,
					`This URL returned ${staticResult.contentType || 'non-HTML content'}. Use Open External for files.`
				)
			};
		}

		return {
			...toBrowserPayload(
				staticResult.finalUrl,
				new URL(staticResult.finalUrl).hostname,
				staticResult.body
			),
			title: `${new URL(staticResult.finalUrl).hostname} (compat)`
		};
	}
});
