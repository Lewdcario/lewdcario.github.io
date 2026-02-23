import { nextTick } from 'vue';
import { $fetch } from 'ofetch';
import {
	browserHomeUrl,
	isWindowEnabled,
	noisePresets,
	noiseWindowHeightForPresetList,
	standardBrowserName,
	torBrowserHomeUrl,
	torSearchHomeUrl
} from '~/src/features/shell/constants/shell';
import type {
	BrowserBackend,
	BrowserRenderPayload,
	BrowserRequestOptions,
	BrowserSearchEngineId,
	NoisePresetId
} from '~/src/features/shell/model/types';

export function createBrowserMediaActions(deps: any) {
	const {
		browserAddress,
		browserCurrentUrl,
		browserDocument,
		browserFrameSrc,
		browserRenderMode,
		browserBackend,
		browserSkin,
		browserFrameRef,
		browserAddressInputRef,
		browserSearchInputRef,
		browserLoading,
		browserError,
		browserTitle,
		browserHistory,
		browserHistoryIndex,
		browserSearchMenuOpen,
		browserSearchQuery,
		browserSearchEngine,
		browserLogViewerOpen,
		browserLogs,
		browserSearchEngines,
		browserDefaultHome,
		startMenuOpen,
		windowSizes,
		vlcFrameRef,
		vlcPlaylistInput,
		vlcPlaylistId,
		vlcError,
		vlcVolume,
		vlcMuted,
		vlcHideYoutubeControls,
		vlcSourcePanelOpen,
		vlcCurrentSeconds,
		vlcDurationSeconds,
		noisePresetId,
		noiseVolume,
		noiseIsPlaying,
		noiseError,
		selectedNoisePreset,
		noiseEngine,
		pushStatus,
		restoreWindow,
		focusWindow,
		lifecycleRuntime
	} = deps;

	const runtime = deps.browserRuntime as {
		requestSerial: number;
		fallbackTimer: number | null;
	};
	const directModeFallbackDelayMs = 7000;
	const forcedSnapshotHosts = ['neocities.org'];
	const interactiveDirectHosts = [
		'tracker.okami.codes',
		'localhost',
		'127.0.0.1'
	];
	const recursivePortfolioHosts = [
		'okami.codes',
		'www.okami.codes',
		'test.okami.codes'
	];
	let trackerDirectLoadCount = 0;
	let trackerAuthWarningShown = false;
	let trackerLocalhostWarningShown = false;
	let trackerAuthPopup: Window | null = null;
	let trackerAuthPopupPollTimer: number | null = null;
	let trackerAuthPending = false;
	let trackerAuthPendingUntil = 0;
	let trackerAuthResyncAttempts = 0;
	let trackerAuthLastResyncAt = 0;
	let trackerAuthResyncTimer: number | null = null;
	let trackerAuthListenersBound = false;
	const trackerAuthPendingWindowMs = 4 * 60 * 1000;
	const trackerAuthMaxResyncAttempts = 6;
	const trackerAuthResyncIntervalMs = 5000;

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function browserShellTitle() {
		return browserSkin.value === 'tor'
			? 'Tor Browser'
			: standardBrowserName;
	}

	function browserNetSearchLabel() {
		return browserBackend.value === 'tor' ? 'Tor Search' : 'Net Search';
	}

	function formatBrowserLogTime(timestamp: number) {
		const date = new Date(timestamp);
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		const ms = date.getMilliseconds().toString().padStart(3, '0');
		return `${hours}:${minutes}:${seconds}.${ms}`;
	}

	function pushBrowserLog(message: string) {
		const timestamp = Date.now();
		const nextEntry = {
			id: timestamp + Math.floor(Math.random() * 1000),
			timestamp,
			time: formatBrowserLogTime(timestamp),
			message
		};
		const nextLogs = [...browserLogs.value, nextEntry];
		browserLogs.value = nextLogs.slice(-140);
	}

	function clearBrowserLogs() {
		browserLogs.value = [];
		pushBrowserLog('Log viewer cleared.');
	}

	function toggleBrowserLogViewer() {
		browserLogViewerOpen.value = !browserLogViewerOpen.value;
		pushBrowserLog(
			browserLogViewerOpen.value
				? 'Log viewer opened.'
				: 'Log viewer hidden.'
		);
	}

	function normalizeBrowserUrl(rawUrl: string) {
		const trimmed = rawUrl.trim();
		if (!trimmed) return browserHomeUrl;
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
		return `https://${trimmed}`;
	}

	function escapeHtml(value: string) {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function browserPlaceholderDocument(
		message: string,
		url: string,
		title = standardBrowserName
	) {
		const safeMessage = escapeHtml(message);
		const safeUrl = escapeHtml(url);
		const safeTitle = escapeHtml(title);
		return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font:12px Tahoma,Arial,sans-serif;background:#fff;color:#111}h1{margin:0 0 8px;font-size:13px}.hint{color:#555}</style></head><body><h1>${safeTitle}</h1><p>${safeMessage}</p><p class="hint">${safeUrl}</p></body></html>`;
	}

	function replaceCurrentBrowserHistory(url: string) {
		const nextHistory = [...browserHistory.value];
		nextHistory[browserHistoryIndex.value] = url;
		browserHistory.value = nextHistory;
	}

	function clearBrowserFallbackTimer() {
		if (runtime.fallbackTimer !== null) {
			window.clearTimeout(runtime.fallbackTimer);
			runtime.fallbackTimer = null;
		}
	}

	function browserWindowTitleFromUrl(url: string) {
		try {
			const hostname = new URL(url).hostname;
			return hostname || browserShellTitle();
		} catch {
			return browserShellTitle();
		}
	}

	function pushBrowserHistory(url: string) {
		const current = browserHistory.value[browserHistoryIndex.value];
		if (current === url) return;
		const nextHistory = browserHistory.value.slice(
			0,
			browserHistoryIndex.value + 1
		);
		nextHistory.push(url);
		browserHistory.value = nextHistory;
		browserHistoryIndex.value = nextHistory.length - 1;
	}

	function snapshotEndpointForBackend(backend: BrowserBackend) {
		return backend === 'tor' ? '/api/tor/render' : '/api/browser/render';
	}

	function shouldForceSnapshotForUrl(url: string) {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return forcedSnapshotHosts.some(
				(host) => hostname === host || hostname.endsWith(`.${host}`)
			);
		} catch {
			return false;
		}
	}

	function shouldKeepDirectModeForUrl(url: string) {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return interactiveDirectHosts.some(
				(host) => hostname === host || hostname.endsWith(`.${host}`)
			);
		} catch {
			return false;
		}
	}

	function isTrackerHostUrl(url: string) {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return (
				hostname === 'tracker.okami.codes' ||
				hostname.endsWith('.tracker.okami.codes')
			);
		} catch {
			return false;
		}
	}

	function isDiscordHostUrl(url: string) {
		try {
			const hostname = new URL(url).hostname.toLowerCase();
			return (
				hostname === 'discord.com' ||
				hostname.endsWith('.discord.com') ||
				hostname === 'discordapp.com' ||
				hostname.endsWith('.discordapp.com')
			);
		} catch {
			return false;
		}
	}

	function isRecursivePortfolioUrl(url: string) {
		try {
			const parsed = new URL(url);
			const hostname = parsed.hostname.toLowerCase();
			const currentHostname = window.location.hostname.toLowerCase();
			return (
				hostname === currentHostname ||
				recursivePortfolioHosts.includes(hostname)
			);
		} catch {
			return false;
		}
	}

	function openUrlExternally(targetUrl: string) {
		const externalWindow = window.open(
			targetUrl,
			'_blank',
			'noopener,noreferrer'
		);
		if (externalWindow) {
			externalWindow.opener = null;
		}
		return Boolean(externalWindow);
	}

	function clearTrackerAuthPopupPoll() {
		if (trackerAuthPopupPollTimer !== null) {
			window.clearInterval(trackerAuthPopupPollTimer);
			trackerAuthPopupPollTimer = null;
		}
	}

	function clearTrackerAuthResyncTimer() {
		if (trackerAuthResyncTimer !== null) {
			window.clearInterval(trackerAuthResyncTimer);
			trackerAuthResyncTimer = null;
		}
	}

	function bindTrackerAuthSyncListeners() {
		if (trackerAuthListenersBound) return;
		window.addEventListener('focus', handleTrackerAuthWindowFocus);
		document.addEventListener(
			'visibilitychange',
			handleTrackerAuthVisibilityChange
		);
		trackerAuthListenersBound = true;
	}

	function unbindTrackerAuthSyncListeners() {
		if (!trackerAuthListenersBound) return;
		window.removeEventListener('focus', handleTrackerAuthWindowFocus);
		document.removeEventListener(
			'visibilitychange',
			handleTrackerAuthVisibilityChange
		);
		trackerAuthListenersBound = false;
	}

	function shouldWarnTrackerAuthLocalhost() {
		const host = window.location.hostname.toLowerCase();
		return host === 'localhost' || host === '127.0.0.1';
	}

	function trackerCurrentUrl() {
		const current = browserCurrentUrl.value;
		if (isTrackerHostUrl(current)) return current;
		if (isTrackerHostUrl(browserAddress.value)) return browserAddress.value;
		return 'https://tracker.okami.codes/';
	}

	function trackerRefreshUrl() {
		try {
			const next = new URL(trackerCurrentUrl());
			next.searchParams.set('_navcat_sync', String(Date.now()));
			return next.toString();
		} catch {
			return `https://tracker.okami.codes/?_navcat_sync=${Date.now()}`;
		}
	}

	function markTrackerAuthPending(reason: string) {
		trackerAuthPending = true;
		trackerAuthPendingUntil = Date.now() + trackerAuthPendingWindowMs;
		trackerAuthResyncAttempts = 0;
		bindTrackerAuthSyncListeners();
		pushBrowserLog(`Tracker auth pending (${reason}).`);
		if (shouldWarnTrackerAuthLocalhost() && !trackerLocalhostWarningShown) {
			trackerLocalhostWarningShown = true;
			pushStatus(
				'Tracker auth may not sync from localhost embeds. Use https://test.okami.codes for same-site cookies.'
			);
			pushBrowserLog(
				'Localhost host detected. Tracker session cookies can be blocked in cross-site iframes.'
			);
		}

		if (trackerAuthResyncTimer !== null) return;
		trackerAuthResyncTimer = window.setInterval(() => {
			if (!trackerAuthPending) {
				clearTrackerAuthResyncTimer();
				return;
			}
			if (Date.now() > trackerAuthPendingUntil) {
				clearTrackerAuthPending();
				pushBrowserLog('Tracker auth sync window expired.');
				return;
			}
			if (trackerAuthPopup && !trackerAuthPopup.closed) {
				return;
			}
			if (document.visibilityState !== 'visible') return;
			if (!document.hasFocus()) return;
			reloadTrackerAfterExternalAuth('poll');
		}, trackerAuthResyncIntervalMs);
	}

	function clearTrackerAuthPending() {
		trackerAuthPending = false;
		trackerAuthPendingUntil = 0;
		trackerAuthResyncAttempts = 0;
		trackerAuthLastResyncAt = 0;
		clearTrackerAuthResyncTimer();
		unbindTrackerAuthSyncListeners();
	}

	function reloadTrackerAfterExternalAuth(source: string) {
		if (!trackerAuthPending) return;
		if (
			!isTrackerHostUrl(browserCurrentUrl.value) &&
			!isTrackerHostUrl(browserAddress.value)
		) {
			return;
		}
		const now = Date.now();
		if (now - trackerAuthLastResyncAt < 1200) return;

		if (now > trackerAuthPendingUntil) {
			clearTrackerAuthPending();
			pushBrowserLog('Tracker auth sync timed out before refresh.');
			return;
		}

		if (trackerAuthResyncAttempts >= trackerAuthMaxResyncAttempts) {
			clearTrackerAuthPending();
			pushBrowserLog('Tracker auth sync attempt limit reached.');
			pushStatus(
				'Tracker sign-in not detected in embedded mode yet. If you are on localhost, switch to test.okami.codes.'
			);
			return;
		}

		trackerAuthResyncAttempts += 1;
		trackerAuthLastResyncAt = now;
		pushBrowserLog(
			`Tracker auth sync refresh (${source}) [${trackerAuthResyncAttempts}/${trackerAuthMaxResyncAttempts}].`
		);
		openInBrowser(trackerRefreshUrl(), 'Dissociation Tracker', {
			backend: 'standard',
			skin: 'netscape',
			pushHistory: false
		});
	}

	function handleTrackerAuthWindowFocus() {
		reloadTrackerAfterExternalAuth('focus');
	}

	function handleTrackerAuthVisibilityChange() {
		if (document.visibilityState !== 'visible') return;
		reloadTrackerAfterExternalAuth('visible');
	}

	function openTrackerDiscordSignIn() {
		clearTrackerAuthPopupPoll();
		markTrackerAuthPending('tracker sign-in button');
		const callbackUrl = encodeURIComponent('https://tracker.okami.codes/');
		const signInUrl = `https://tracker.okami.codes/api/auth/signin?callbackUrl=${callbackUrl}`;
		const popup = window.open(
			signInUrl,
			'tracker-discord-auth',
			'popup=yes,width=520,height=760'
		);
		if (!popup) {
			const opened = openUrlExternally(signInUrl);
			pushStatus(
				opened
					? 'Discord sign-in opened in external browser tab. Return here after login.'
					: 'Browser blocked popup. Allow popups to continue Discord sign-in.'
			);
			pushBrowserLog(
				'Tracker Discord sign-in popup blocked; attempted external tab fallback.'
			);
			return;
		}

		trackerAuthPopup = popup;
		pushBrowserLog('Tracker Discord sign-in popup opened.');
		pushStatus(
			'Complete Discord sign-in in popup. Tracker will refresh when it closes.'
		);

		trackerAuthPopupPollTimer = window.setInterval(() => {
			if (!trackerAuthPopup || !trackerAuthPopup.closed) return;
			clearTrackerAuthPopupPoll();
			trackerAuthPopup = null;
			pushBrowserLog('Tracker auth popup closed.');
			reloadTrackerAfterExternalAuth('popup closed');
		}, 450);
	}

	async function loadBrowserSnapshot(
		requestSerial: number,
		url: string,
		backend: BrowserBackend,
		options: BrowserRequestOptions = {}
	) {
		pushBrowserLog(
			`Compatibility render requested for ${url} via ${backend === 'tor' ? 'tor' : 'standard'} backend.`
		);
		try {
			const payload = await $fetch<BrowserRenderPayload>(
				snapshotEndpointForBackend(backend),
				{
					query: { url }
				}
			);
			if (
				lifecycleRuntime.disposed ||
				requestSerial !== runtime.requestSerial
			)
				return;

			browserRenderMode.value = 'snapshot';
			browserCurrentUrl.value = payload.url;
			browserAddress.value = payload.url;
			browserDocument.value = payload.html;
			browserTitle.value =
				payload.title?.trim() || browserWindowTitleFromUrl(payload.url);
			browserError.value = '';
			browserLoading.value = false;

			const shouldUpdateCurrentHistory = options.pushHistory ?? false;
			if (
				shouldUpdateCurrentHistory ||
				browserHistory.value[browserHistoryIndex.value] !== payload.url
			) {
				replaceCurrentBrowserHistory(payload.url);
			}
			pushBrowserLog(`Compatibility render loaded: ${payload.url}`);
		} catch (error) {
			if (
				lifecycleRuntime.disposed ||
				requestSerial !== runtime.requestSerial
			)
				return;
			const message =
				error instanceof Error
					? error.message
					: 'Unable to load this page in the browser.';
			browserError.value = message;
			browserRenderMode.value = 'snapshot';
			browserDocument.value = browserPlaceholderDocument(
				backend === 'tor'
					? 'Tor Browser could not render this page.'
					: 'Browser could not render this page.',
				url,
				backend === 'tor' ? 'Tor Browser' : standardBrowserName
			);
			browserLoading.value = false;
			pushStatus(
				backend === 'tor'
					? 'Tor Browser failed to load the requested page.'
					: 'Browser failed to load the requested page.'
			);
			pushBrowserLog(`Compatibility render failed: ${message}`);
		}
	}

	function openInBrowser(
		url: string,
		label?: string,
		options: BrowserRequestOptions = {}
	) {
		const normalized = normalizeBrowserUrl(url);
		const backend = options.backend ?? browserBackend.value;
		const skin = options.skin ?? (backend === 'tor' ? 'tor' : 'netscape');
		const pushHistory = options.pushHistory ?? true;
		const external = options.external ?? false;

		if (!external && isRecursivePortfolioUrl(normalized)) {
			const opened = openUrlExternally(normalized);
			pushBrowserLog(
				`Blocked recursive self-embed; opened externally: ${normalized}`
			);
			pushStatus(
				opened
					? 'Portfolio pages open externally to prevent recursive browser embedding.'
					: 'Browser blocked popup. Allow popups and try again.'
			);
			return;
		}

		if (external) {
			if (isTrackerHostUrl(normalized) || isDiscordHostUrl(normalized)) {
				markTrackerAuthPending('external browser open');
			}
			const opened = openUrlExternally(normalized);
			pushBrowserLog(`URL opened externally: ${normalized}`);
			pushStatus(
				opened
					? `${label ?? normalized} opened in external browser tab.`
					: 'Browser blocked popup. Allow popups and try again.'
			);
			return;
		}

		if (isDiscordHostUrl(normalized)) {
			markTrackerAuthPending('discord external redirect');
			const opened = openUrlExternally(normalized);
			pushBrowserLog(`Discord URL opened externally: ${normalized}`);
			pushStatus(
				opened
					? 'Discord opened in external browser tab.'
					: 'Browser blocked popup. Allow popups to continue Discord sign-in.'
			);
			return;
		}

		if (pushHistory) {
			pushBrowserHistory(normalized);
		} else if (
			browserHistory.value[browserHistoryIndex.value] !== normalized
		) {
			replaceCurrentBrowserHistory(normalized);
		}

		browserBackend.value = backend;
		browserSkin.value = skin;
		syncBrowserSearchEngine(backend);

		const requestSerial = ++runtime.requestSerial;
		clearBrowserFallbackTimer();

		browserLoading.value = true;
		browserError.value = '';
		browserCurrentUrl.value = normalized;
		browserAddress.value = normalized;
		browserTitle.value = browserWindowTitleFromUrl(normalized);
		browserRenderMode.value = 'direct';
		browserFrameSrc.value = normalized;
		browserDocument.value = browserPlaceholderDocument(
			'Loading...',
			normalized,
			backend === 'tor' ? 'Tor Browser' : standardBrowserName
		);

		restoreWindow('browser', false);
		startMenuOpen.value = false;
		focusWindow('browser');
		pushStatus(`${label ?? normalized} opened in ${browserShellTitle()}.`);
		pushBrowserLog(
			`Navigate to ${normalized} (${backend === 'tor' ? 'tor' : 'standard'} mode).`
		);
		trackerDirectLoadCount = 0;
		trackerAuthWarningShown = false;

		if (backend === 'tor') {
			browserRenderMode.value = 'snapshot';
			browserFrameSrc.value = 'about:blank';
			pushBrowserLog(
				'Direct mode disabled for Tor; switching to compatibility render.'
			);
			void loadBrowserSnapshot(requestSerial, normalized, backend, {
				pushHistory: false
			});
			return;
		}

		if (shouldForceSnapshotForUrl(normalized)) {
			browserRenderMode.value = 'snapshot';
			browserFrameSrc.value = 'about:blank';
			pushBrowserLog(
				'Direct mode bypassed for forced compatibility host.'
			);
			void loadBrowserSnapshot(requestSerial, normalized, backend, {
				pushHistory: false
			});
			return;
		}

		if (shouldKeepDirectModeForUrl(normalized)) {
			pushBrowserLog(
				'Keeping page in direct mode (interactive host allowlist).'
			);
			if (isTrackerHostUrl(normalized)) {
				pushStatus(
					'Tracker loaded. Use "Tracker Sign-in" in Netscape for Discord auth.'
				);
				pushBrowserLog(
					'Note: OAuth providers like Discord block iframe embedding. Use external login if Discord auth appears stuck.'
				);
			}
			return;
		}

		runtime.fallbackTimer = window.setTimeout(() => {
			if (
				lifecycleRuntime.disposed ||
				requestSerial !== runtime.requestSerial
			)
				return;
			if (browserRenderMode.value !== 'direct') return;
			pushBrowserLog(
				'Direct-mode timeout reached; switching to compatibility render.'
			);
			void loadBrowserSnapshot(requestSerial, normalized, backend, {
				pushHistory: false
			});
		}, directModeFallbackDelayMs);
	}

	function isIframeBlockedLocation(href: string) {
		const lowered = href.trim().toLowerCase();
		return (
			lowered === 'about:blank' ||
			lowered.startsWith('chrome-error://') ||
			lowered.includes('chromewebdata')
		);
	}

	const blockedIframePhrases = [
		'refused to connect',
		'blocked by response',
		'err_blocked_by_response',
		'x-frame-options',
		'frame-ancestors',
		'cannot be displayed in a frame',
		'site can’t be reached',
		"site can't be reached"
	];

	function detectBlockedIframeDocument() {
		try {
			const frame = browserFrameRef.value;
			const doc =
				frame?.contentDocument ??
				frame?.contentWindow?.document ??
				null;
			if (!doc) return { inspectable: false, blocked: false };

			const title = (doc.title ?? '').toLowerCase();
			const bodyText = (
				doc.body?.innerText ??
				doc.documentElement?.innerText ??
				''
			).toLowerCase();
			const combined = `${title}\n${bodyText}`;
			const blocked = blockedIframePhrases.some((phrase) =>
				combined.includes(phrase)
			);
			return { inspectable: true, blocked };
		} catch {
			return { inspectable: false, blocked: false };
		}
	}

	function handleDirectBrowserFrameLoad() {
		if (browserRenderMode.value !== 'direct') return;
		const isInitialDirectLoad = browserLoading.value;

		const requestSerial = runtime.requestSerial;
		const keepDirectMode = shouldKeepDirectModeForUrl(
			browserCurrentUrl.value
		);
		if (!isInitialDirectLoad && !keepDirectMode) return;
		let locationHref = '';
		try {
			locationHref =
				browserFrameRef.value?.contentWindow?.location.href ?? '';
		} catch {}

		if (
			!keepDirectMode &&
			locationHref &&
			isIframeBlockedLocation(locationHref)
		) {
			pushBrowserLog(
				`Direct frame reported blocked location (${locationHref}); switching to compatibility render.`
			);
			void loadBrowserSnapshot(
				requestSerial,
				browserCurrentUrl.value,
				browserBackend.value,
				{
					pushHistory: false
				}
			);
			return;
		}

		const blockedDocument = detectBlockedIframeDocument();
		if (
			!keepDirectMode &&
			blockedDocument.inspectable &&
			blockedDocument.blocked
		) {
			pushBrowserLog(
				'Direct frame content appears blocked; switching to compatibility render.'
			);
			void loadBrowserSnapshot(
				requestSerial,
				browserCurrentUrl.value,
				browserBackend.value,
				{
					pushHistory: false
				}
			);
			return;
		}

		clearBrowserFallbackTimer();
		browserLoading.value = false;
		browserError.value = '';
		if (isInitialDirectLoad) {
			pushBrowserLog('Direct frame loaded successfully.');
		} else {
			pushBrowserLog('Direct frame internal navigation detected.');
		}

		if (keepDirectMode && isTrackerHostUrl(browserCurrentUrl.value)) {
			if (trackerAuthPending && trackerAuthResyncAttempts > 0) {
				pushBrowserLog('Tracker auth sync page loaded.');
				clearTrackerAuthPending();
			}
			trackerDirectLoadCount += 1;
			if (trackerDirectLoadCount >= 3 && !trackerAuthWarningShown) {
				trackerAuthWarningShown = true;
				pushBrowserLog(
					'Detected likely Discord auth redirect loop in iframe; external login is required.'
				);
				pushStatus(
					'Discord sign-in is blocked in embedded mode. Use Open Externally to complete login.'
				);
			}
		}
	}

	function handleDirectBrowserFrameError() {
		if (browserRenderMode.value !== 'direct') return;
		if (shouldKeepDirectModeForUrl(browserCurrentUrl.value)) {
			clearBrowserFallbackTimer();
			browserLoading.value = false;
			pushBrowserLog(
				'Direct frame load error ignored for interactive allowlist host.'
			);
			return;
		}
		const requestSerial = runtime.requestSerial;
		pushBrowserLog(
			'Direct frame load error; switching to compatibility render.'
		);
		void loadBrowserSnapshot(
			requestSerial,
			browserCurrentUrl.value,
			browserBackend.value,
			{
				pushHistory: false
			}
		);
	}

	function forceBrowserCompatibilityMode() {
		const requestSerial = ++runtime.requestSerial;
		clearBrowserFallbackTimer();
		browserLoading.value = true;
		browserError.value = '';
		pushBrowserLog('Manual compatibility mode requested.');
		void loadBrowserSnapshot(
			requestSerial,
			browserCurrentUrl.value,
			browserBackend.value,
			{
				pushHistory: false
			}
		);
	}

	function stopBrowserLoading() {
		runtime.requestSerial += 1;
		clearBrowserFallbackTimer();
		browserLoading.value = false;
		browserError.value = '';
		pushStatus(`${browserShellTitle()} load stopped.`);
		pushBrowserLog('Browser loading stopped by user.');
	}

	function focusBrowserAddress() {
		const input = browserAddressInputRef.value;
		if (!input) return;
		input.focus();
		input.select();
		pushStatus(`${browserShellTitle()} location bar focused.`);
	}

	function navigateBrowserAddress() {
		openInBrowser(browserAddress.value, browserShellTitle(), {
			backend: browserBackend.value,
			skin: browserSkin.value
		});
	}

	function browserSearchUrl(engineId: BrowserSearchEngineId, query: string) {
		const normalizedQuery = query.trim();
		if (!normalizedQuery) {
			return engineId === 'ahmia' ? torSearchHomeUrl : browserHomeUrl;
		}

		const encoded = encodeURIComponent(normalizedQuery);
		switch (engineId) {
			case 'ahmia':
				return `https://ahmia.fi/search/?q=${encoded}`;
			case 'duckduckgo':
				return `https://duckduckgo.com/?q=${encoded}&t=h_&ia=web`;
			case 'wiby':
				return `https://wiby.me/?q=${encoded}`;
			case 'startpage':
				return `https://www.startpage.com/sp/search?query=${encoded}`;
			default:
				return `https://duckduckgo.com/?q=${encoded}`;
		}
	}

	function extractYouTubePlaylistId(rawValue: string) {
		const trimmed = rawValue.trim();
		if (!trimmed) return null;

		if (/^[A-Za-z0-9_-]{12,}$/.test(trimmed)) {
			return trimmed;
		}

		const listMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]{12,})/i);
		if (listMatch?.[1]) {
			return listMatch[1];
		}

		const normalizedUrl =
			/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || trimmed.startsWith('//')
				? trimmed
				: `https://${trimmed}`;

		try {
			const parsedUrl = new URL(normalizedUrl);
			const playlistId = parsedUrl.searchParams.get('list');
			if (playlistId && /^[A-Za-z0-9_-]{12,}$/.test(playlistId)) {
				return playlistId;
			}
		} catch {
			// Ignore parse errors and report validation message below.
		}

		return null;
	}

	function loadVlcPlaylist() {
		const playlistId = extractYouTubePlaylistId(vlcPlaylistInput.value);
		if (!playlistId) {
			vlcError.value =
				'Enter a valid YouTube playlist URL or playlist ID.';
			pushStatus('VLC playlist URL is invalid.');
			return;
		}

		vlcPlaylistId.value = playlistId;
		vlcError.value = '';
		vlcCurrentSeconds.value = 0;
		vlcDurationSeconds.value = 0;
		vlcSourcePanelOpen.value = false;
		pushStatus('Playlist loaded in VLC.');
	}

	function postVlcCommand(func: string, args: unknown[] = []) {
		const frameWindow = vlcFrameRef.value?.contentWindow;
		if (!frameWindow) return false;

		frameWindow.postMessage(
			JSON.stringify({
				event: 'command',
				func,
				args
			}),
			'*'
		);
		return true;
	}

	function formatVlcTime(totalSeconds: number) {
		const safeSeconds = Number.isFinite(totalSeconds)
			? Math.max(0, Math.floor(totalSeconds))
			: 0;
		const hours = Math.floor(safeSeconds / 3600);
		const minutes = Math.floor((safeSeconds % 3600) / 60);
		const seconds = safeSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
				.toString()
				.padStart(2, '0')}`;
		}

		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function toggleVlcSourcePanel() {
		vlcSourcePanelOpen.value = !vlcSourcePanelOpen.value;
		pushStatus(
			vlcSourcePanelOpen.value
				? 'Open media panel shown.'
				: 'Open media panel hidden.'
		);
	}

	function openVlcMenuItem(item: string) {
		if (item === 'Media') {
			toggleVlcSourcePanel();
			return;
		}

		pushStatus(`${item} menu is not available in this build.`);
	}

	function playVlc() {
		if (!postVlcCommand('playVideo')) {
			pushStatus('VLC player is still loading.');
			return;
		}
		pushStatus('VLC play.');
	}

	function pauseVlc() {
		if (!postVlcCommand('pauseVideo')) {
			pushStatus('VLC player is still loading.');
			return;
		}
		pushStatus('VLC paused.');
	}

	function stopVlc() {
		if (!postVlcCommand('stopVideo')) {
			pushStatus('VLC player is still loading.');
			return;
		}
		pushStatus('VLC stopped.');
	}

	function previousVlcTrack() {
		if (!postVlcCommand('previousVideo')) {
			pushStatus('VLC player is still loading.');
			return;
		}
		pushStatus('VLC previous track.');
	}

	function nextVlcTrack() {
		if (!postVlcCommand('nextVideo')) {
			pushStatus('VLC player is still loading.');
			return;
		}
		pushStatus('VLC next track.');
	}

	function toggleVlcMute() {
		const targetMuted = !vlcMuted.value;
		vlcMuted.value = targetMuted;

		if (!postVlcCommand(targetMuted ? 'mute' : 'unMute')) {
			pushStatus('VLC player is still loading.');
			return;
		}

		pushStatus(targetMuted ? 'VLC muted.' : 'VLC unmuted.');
	}

	function setVlcVolume(event: Event) {
		const target = event.target as HTMLInputElement | null;
		if (!target) return;

		const nextVolume = clamp(
			Number.parseInt(target.value, 10) || 0,
			0,
			100
		);
		vlcVolume.value = nextVolume;

		if (nextVolume <= 0) {
			vlcMuted.value = true;
			void postVlcCommand('mute');
		} else if (vlcMuted.value) {
			vlcMuted.value = false;
			void postVlcCommand('unMute');
		}

		void postVlcCommand('setVolume', [nextVolume]);
	}

	function seekVlcTimeline(event: Event) {
		const target = event.target as HTMLInputElement | null;
		if (!target || vlcDurationSeconds.value <= 0) return;

		const nextPercent = clamp(Number.parseFloat(target.value) || 0, 0, 100);
		const seekSeconds = Math.floor(
			(nextPercent / 100) * vlcDurationSeconds.value
		);
		vlcCurrentSeconds.value = seekSeconds;
		void postVlcCommand('seekTo', [seekSeconds, true]);
	}

	function handleVlcFrameLoad() {
		const frameWindow = vlcFrameRef.value?.contentWindow;
		if (frameWindow) {
			frameWindow.postMessage(
				JSON.stringify({
					event: 'listening',
					id: 'okami-vlc'
				}),
				'*'
			);
		}

		void postVlcCommand('setVolume', [vlcVolume.value]);
		void postVlcCommand(
			vlcMuted.value || vlcVolume.value <= 0 ? 'mute' : 'unMute'
		);
	}

	function handleVlcUiToggle() {
		pushStatus(
			vlcHideYoutubeControls.value
				? 'VLC using minimal YouTube UI.'
				: 'VLC showing YouTube controls.'
		);
	}

	function handleVlcFrameMessage(rawData: unknown) {
		let data: unknown = rawData;
		if (typeof data === 'string') {
			try {
				data = JSON.parse(data);
			} catch {
				return;
			}
		}

		if (!data || typeof data !== 'object') return;
		const eventPayload = data as { event?: unknown; info?: unknown };
		const eventType = eventPayload.event;
		const info =
			eventPayload.info && typeof eventPayload.info === 'object'
				? (eventPayload.info as Record<string, unknown>)
				: null;

		if (eventType === 'onReady') {
			void postVlcCommand('setVolume', [vlcVolume.value]);
			void postVlcCommand(
				vlcMuted.value || vlcVolume.value <= 0 ? 'mute' : 'unMute'
			);
			return;
		}

		if (eventType !== 'infoDelivery' || !info) return;

		const currentTime = info.currentTime;
		if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
			vlcCurrentSeconds.value = Math.max(0, currentTime);
		}

		const duration = info.duration;
		if (
			typeof duration === 'number' &&
			Number.isFinite(duration) &&
			duration > 0
		) {
			vlcDurationSeconds.value = duration;
		}
	}

	async function startNoiseGenerator(announce = true) {
		const result = await noiseEngine.start(
			selectedNoisePreset.value,
			noiseVolume.value
		);
		if (!result.ok) {
			noiseIsPlaying.value = false;
			noiseError.value = result.error ?? 'Unable to start audio output.';
			return;
		}

		noiseIsPlaying.value = true;
		noiseError.value = '';
		if (announce) {
			pushStatus(`${selectedNoisePreset.value.label} noise started.`);
		}
	}

	function stopNoiseGenerator(announce = true) {
		noiseEngine.stop();
		noiseIsPlaying.value = false;

		if (announce) {
			pushStatus('White noise stopped.');
		}
	}

	function toggleNoiseGenerator() {
		if (noiseIsPlaying.value) {
			stopNoiseGenerator();
			return;
		}
		void startNoiseGenerator();
	}

	function setNoiseVolume(event: Event) {
		const input = event.target as HTMLInputElement | null;
		if (!input) return;
		noiseVolume.value = clamp(
			Number.parseInt(input.value, 10) || 0,
			0,
			100
		);
		noiseEngine.applyPreset(selectedNoisePreset.value, noiseVolume.value);
	}

	function selectNoisePreset(nextPreset: NoisePresetId) {
		const previousPreset = selectedNoisePreset.value;
		noisePresetId.value = nextPreset;
		if (noiseIsPlaying.value) {
			const sourceChanged =
				previousPreset.source !== selectedNoisePreset.value.source;
			if (sourceChanged) {
				void startNoiseGenerator(false);
			} else {
				noiseEngine.applyPreset(
					selectedNoisePreset.value,
					noiseVolume.value
				);
			}
			pushStatus(`${selectedNoisePreset.value.label} preset selected.`);
			return;
		}
		noiseEngine.applyPreset(selectedNoisePreset.value, noiseVolume.value);
	}

	function cycleNoisePreset(direction: -1 | 1) {
		const currentIndex = noisePresets.findIndex(
			(preset) => preset.id === noisePresetId.value
		);
		const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
		const nextIndex =
			(safeCurrent + direction + noisePresets.length) %
			noisePresets.length;
		selectNoisePreset(noisePresets[nextIndex]!.id);
	}

	function syncBrowserSearchEngine(backend: BrowserBackend) {
		if (backend === 'tor') {
			browserSearchEngine.value = 'ahmia';
			return;
		}

		if (browserSearchEngine.value === 'ahmia') {
			browserSearchEngine.value = 'duckduckgo';
		}
	}

	function toggleBrowserSearchMenu() {
		browserSearchMenuOpen.value = !browserSearchMenuOpen.value;
		if (!browserSearchMenuOpen.value) {
			return;
		}

		syncBrowserSearchEngine(browserBackend.value);
		void nextTick(() => {
			const input = browserSearchInputRef.value;
			if (!input) return;
			input.focus();
			input.select();
		});
	}

	function submitBrowserSearch() {
		const backend = browserBackend.value;
		syncBrowserSearchEngine(backend);
		const targetUrl = browserSearchUrl(
			browserSearchEngine.value,
			browserSearchQuery.value
		);
		const selectedEngine = browserSearchEngines.value.find(
			(engine: { id: BrowserSearchEngineId }) =>
				engine.id === browserSearchEngine.value
		);

		openInBrowser(
			targetUrl,
			selectedEngine?.label ?? browserNetSearchLabel(),
			{
				backend,
				skin: browserSkin.value
			}
		);
	}

	function searchWithEngine(engineId: BrowserSearchEngineId) {
		browserSearchEngine.value = engineId;
		submitBrowserSearch();
	}

	function openTorBrowser(url = torBrowserHomeUrl, label = 'Tor Browser') {
		openInBrowser(url, label, { backend: 'tor', skin: 'tor' });
	}

	function openStandardBrowser(
		url = browserHomeUrl,
		label = standardBrowserName
	) {
		openInBrowser(url, label, { backend: 'standard', skin: 'netscape' });
	}

	function openVlcWindow() {
		startMenuOpen.value = false;
		restoreWindow('vlc', false);
		focusWindow('vlc');
		vlcSourcePanelOpen.value = false;
		pushStatus('VLC media player opened.');
	}

	function openNoiseWindow() {
		startMenuOpen.value = false;
		windowSizes.value.noise.height = noiseWindowHeightForPresetList();
		restoreWindow('noise', false);
		focusWindow('noise');
		pushStatus('White noise generator opened.');
	}

	function openOtaClockWindow() {
		if (!isWindowEnabled('otaclock')) {
			pushStatus('OtaClock is currently disabled.');
			startMenuOpen.value = false;
			return;
		}
		startMenuOpen.value = false;
		restoreWindow('otaclock', false);
		focusWindow('otaclock');
		pushStatus('OtaClock opened.');
	}

	function goBrowserBack() {
		if (browserHistoryIndex.value <= 0) return;
		browserHistoryIndex.value -= 1;
		openInBrowser(browserHistory.value[browserHistoryIndex.value], 'Back', {
			pushHistory: false
		});
	}

	function goBrowserForward() {
		if (browserHistoryIndex.value >= browserHistory.value.length - 1)
			return;
		browserHistoryIndex.value += 1;
		openInBrowser(
			browserHistory.value[browserHistoryIndex.value],
			'Forward',
			{
				pushHistory: false
			}
		);
	}

	function reloadBrowserPage() {
		openInBrowser(browserCurrentUrl.value, 'Reload', {
			pushHistory: false,
			backend: browserBackend.value,
			skin: browserSkin.value
		});
	}

	function goBrowserHome() {
		openInBrowser(browserDefaultHome.value, 'Home', {
			backend: browserBackend.value,
			skin: browserSkin.value
		});
	}

	function openBrowserExternally() {
		const target = browserCurrentUrl.value || browserAddress.value;
		if (isTrackerHostUrl(target) || isDiscordHostUrl(target)) {
			markTrackerAuthPending('manual open externally');
		}
		const opened = openUrlExternally(target);
		pushStatus(
			opened
				? 'Opened in external browser tab.'
				: 'Browser blocked popup. Allow popups and try again.'
		);
	}

	function handleBrowserWindowMessage(event: MessageEvent) {
		const browserFrameWindow = browserFrameRef.value?.contentWindow;
		if (browserFrameWindow && event.source === browserFrameWindow) {
			const data = event.data as { type?: string; href?: string } | null;
			if (
				!data ||
				data.type !== 'browser:navigate' ||
				typeof data.href !== 'string'
			)
				return;

			pushBrowserLog(`Bridge navigation requested: ${data.href}`);
			openInBrowser(data.href, data.href);
			return;
		}

		const vlcFrameWindow = vlcFrameRef.value?.contentWindow;
		if (vlcFrameWindow && event.source === vlcFrameWindow) {
			handleVlcFrameMessage(event.data);
			return;
		}

		const isYouTubeMessageOrigin =
			event.origin === 'https://www.youtube.com' ||
			event.origin === 'https://youtube.com' ||
			event.origin === 'https://www.youtube-nocookie.com';
		if (isYouTubeMessageOrigin) {
			handleVlcFrameMessage(event.data);
		}
	}

	function disposeBrowserMediaActions() {
		runtime.requestSerial += 1;
		clearBrowserFallbackTimer();
		clearTrackerAuthPopupPoll();
		clearTrackerAuthPending();
		unbindTrackerAuthSyncListeners();
	}

	return {
		normalizeBrowserUrl,
		escapeHtml,
		browserPlaceholderDocument,
		replaceCurrentBrowserHistory,
		clearBrowserFallbackTimer,
		browserWindowTitleFromUrl,
		pushBrowserHistory,
		snapshotEndpointForBackend,
		loadBrowserSnapshot,
		openInBrowser,
		isIframeBlockedLocation,
		handleDirectBrowserFrameLoad,
		handleDirectBrowserFrameError,
		forceBrowserCompatibilityMode,
		stopBrowserLoading,
		focusBrowserAddress,
		navigateBrowserAddress,
		browserSearchUrl,
		extractYouTubePlaylistId,
		loadVlcPlaylist,
		postVlcCommand,
		formatVlcTime,
		toggleVlcSourcePanel,
		openVlcMenuItem,
		playVlc,
		pauseVlc,
		stopVlc,
		previousVlcTrack,
		nextVlcTrack,
		toggleVlcMute,
		setVlcVolume,
		seekVlcTimeline,
		handleVlcFrameLoad,
		handleVlcUiToggle,
		handleVlcFrameMessage,
		startNoiseGenerator,
		stopNoiseGenerator,
		toggleNoiseGenerator,
		setNoiseVolume,
		selectNoisePreset,
		cycleNoisePreset,
		syncBrowserSearchEngine,
		toggleBrowserSearchMenu,
		toggleBrowserLogViewer,
		clearBrowserLogs,
		submitBrowserSearch,
		searchWithEngine,
		openTorBrowser,
		openStandardBrowser,
		openVlcWindow,
		openNoiseWindow,
		openOtaClockWindow,
		goBrowserBack,
		goBrowserForward,
		reloadBrowserPage,
		goBrowserHome,
		openBrowserExternally,
		openTrackerDiscordSignIn,
		handleBrowserWindowMessage,
		disposeBrowserMediaActions
	};
}
