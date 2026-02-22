import { createError, defineEventHandler, getQuery } from 'h3';
import net from 'node:net';

const maxHtmlBytes = 1_500_000;
const requestTimeoutMs = 16_000;
const headlessNetworkIdleTimeoutMs = 5_000;
const headlessExtraWaitMs = 550;
const allowedProtocols = new Set(['http:', 'https:']);
const defaultTorProxyCandidates = [
	'socks5://127.0.0.1:9050',
	'socks5://127.0.0.1:9150'
];
const torUserAgent =
	'Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0 TorBrowser/13.5';

interface HeadlessRenderResult {
	finalUrl: string;
	contentType: string;
	html: string;
	title: string;
}

function isAhmiaHost(hostname: string) {
	const lowered = hostname.toLowerCase();
	return lowered === 'ahmia.fi' || lowered.endsWith('.ahmia.fi');
}

function shouldRetryAhmiaSearch(target: URL, finalUrl: string) {
	if (!isAhmiaHost(target.hostname)) return false;
	if (!target.pathname.toLowerCase().startsWith('/search')) return false;
	const requestedQuery = target.searchParams.get('q')?.trim();
	if (!requestedQuery) return false;
	if (target.searchParams.has('c9166e')) return false;

	try {
		const final = new URL(finalUrl);
		if (!isAhmiaHost(final.hostname)) return false;
		const finalQuery = final.searchParams.get('q')?.trim() ?? '';
		const landedOnHome = final.pathname === '/' || final.pathname === '';
		return landedOnHome || !finalQuery;
	} catch {
		return true;
	}
}

async function retryAhmiaSearch(
	page: import('playwright').Page,
	query: string
) {
	const input = page
		.locator(
			'form#searchForm input[name="q"], form[action*="/search"] input[name="q"]'
		)
		.first();
	const count = await input.count();
	if (count === 0) {
		return false;
	}

	await input.fill(query);
	await Promise.all([
		page
			.waitForNavigation({
				waitUntil: 'domcontentloaded',
				timeout: requestTimeoutMs
			})
			.catch(() => undefined),
		input.press('Enter').catch(async () => {
			const submit = page
				.locator(
					'form#searchForm input[type="submit"], form[action*="/search"] input[type="submit"]'
				)
				.first();
			if ((await submit.count()) === 0) {
				return;
			}
			await submit.click({ timeout: 1500 }).catch(() => undefined);
		})
	]);

	await page
		.waitForLoadState('networkidle', {
			timeout: headlessNetworkIdleTimeoutMs
		})
		.catch(() => undefined);
	await page.waitForTimeout(headlessExtraWaitMs);
	return true;
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

function proxyCandidates() {
	const configured = [process.env.TOR_PROXY, process.env.NUXT_TOR_PROXY]
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value));

	return [...new Set([...configured, ...defaultTorProxyCandidates])];
}

async function canConnectToProxy(proxyUrl: string) {
	let parsed: URL;
	try {
		parsed = new URL(proxyUrl);
	} catch {
		return false;
	}

	if (!parsed.hostname || !parsed.port) {
		return false;
	}

	const port = Number(parsed.port);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		return false;
	}

	return new Promise<boolean>((resolve) => {
		let settled = false;
		const socket = net.createConnection({ host: parsed.hostname, port });

		const finish = (ok: boolean) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(ok);
		};

		socket.setTimeout(450);
		socket.once('connect', () => finish(true));
		socket.once('timeout', () => finish(false));
		socket.once('error', () => finish(false));
	});
}

async function resolveTorProxy() {
	for (const candidate of proxyCandidates()) {
		if (await canConnectToProxy(candidate)) {
			return candidate;
		}
	}

	throw createError({
		statusCode: 503,
		statusMessage:
			'Tor proxy not available. Start Tor Browser (or tor daemon) and ensure SOCKS is open on 127.0.0.1:9050 or 127.0.0.1:9150.'
	});
}

async function renderWithTorBrowser(
	target: URL,
	proxyServer: string
): Promise<HeadlessRenderResult> {
	const playwright = await import('playwright');
	const browser = await playwright.chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		proxy: { server: proxyServer }
	});

	try {
		const context = await browser.newContext({
			userAgent: torUserAgent,
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

			let finalUrl = page.url() || target.toString();
			if (shouldRetryAhmiaSearch(target, finalUrl)) {
				const searchText = target.searchParams.get('q')?.trim() ?? '';
				if (searchText) {
					await retryAhmiaSearch(page, searchText);
					finalUrl = page.url() || target.toString();
				}
			}
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
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'name' in error &&
			(error as { name?: string }).name === 'TimeoutError'
		) {
			throw createError({
				statusCode: 504,
				statusMessage:
					'Timed out while requesting the website through Tor.'
			});
		}

		if (
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			typeof (error as { statusCode?: unknown }).statusCode === 'number'
		) {
			throw error;
		}

		throw createError({
			statusCode: 502,
			statusMessage: 'Tor relay could not render this URL.'
		});
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

function buildFallbackDocument(targetUrl: string, message: string) {
	const safeTargetUrl = escapeHtml(targetUrl);
	const safeMessage = escapeHtml(message);
	return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font:12px Tahoma,Arial,sans-serif;background:#fff;color:#111}h1{margin:0 0 8px;font-size:13px}.hint{color:#555}</style></head><body><h1>Tor Browser</h1><p>${safeMessage}</p><p class="hint">${safeTargetUrl}</p></body></html>`;
}

function toBrowserPayload(url: string, title: string, html: string) {
	const sanitized = stripDangerousMarkup(html);
	return {
		url,
		title: title || new URL(url).hostname,
		html: injectBrowserBridge(sanitized, url)
	};
}

export default defineEventHandler(async (event) => {
	const target = parseTargetUrl(getQuery(event).url);
	const proxyServer = await resolveTorProxy();
	const result = await renderWithTorBrowser(target, proxyServer);

	if (result.contentType && !result.contentType.includes('text/html')) {
		return {
			url: result.finalUrl,
			title: new URL(result.finalUrl).hostname,
			html: buildFallbackDocument(
				result.finalUrl,
				`This URL returned ${result.contentType}. Use Open External for files.`
			)
		};
	}

	return toBrowserPayload(
		result.finalUrl,
		result.title || 'Tor Browser',
		result.html
	);
});
