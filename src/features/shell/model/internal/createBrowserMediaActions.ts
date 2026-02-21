import { nextTick } from 'vue';
import { $fetch } from 'ofetch';
import {
	browserHomeUrl,
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

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function browserShellTitle() {
		return browserSkin.value === 'tor' ? 'Tor Browser' : standardBrowserName;
	}

	function browserNetSearchLabel() {
		return browserBackend.value === 'tor' ? 'Tor Search' : 'Net Search';
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

	function browserPlaceholderDocument(message: string, url: string, title = standardBrowserName) {
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
		const nextHistory = browserHistory.value.slice(0, browserHistoryIndex.value + 1);
		nextHistory.push(url);
		browserHistory.value = nextHistory;
		browserHistoryIndex.value = nextHistory.length - 1;
	}

	function snapshotEndpointForBackend(backend: BrowserBackend) {
		return backend === 'tor' ? '/api/tor/render' : '/api/browser/render';
	}

	async function loadBrowserSnapshot(
		requestSerial: number,
		url: string,
		backend: BrowserBackend,
		options: BrowserRequestOptions = {}
	) {
		try {
			const payload = await $fetch<BrowserRenderPayload>(snapshotEndpointForBackend(backend), {
				query: { url }
			});
			if (lifecycleRuntime.disposed || requestSerial !== runtime.requestSerial) return;

			browserRenderMode.value = 'snapshot';
			browserCurrentUrl.value = payload.url;
			browserAddress.value = payload.url;
			browserDocument.value = payload.html;
			browserTitle.value = payload.title?.trim() || browserWindowTitleFromUrl(payload.url);
			browserError.value = '';
			browserLoading.value = false;

			const shouldUpdateCurrentHistory = options.pushHistory ?? false;
			if (
				shouldUpdateCurrentHistory ||
				browserHistory.value[browserHistoryIndex.value] !== payload.url
			) {
				replaceCurrentBrowserHistory(payload.url);
			}
		} catch (error) {
			if (lifecycleRuntime.disposed || requestSerial !== runtime.requestSerial) return;
			const message =
				error instanceof Error ? error.message : 'Unable to load this page in the browser.';
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
		}
	}

	function openInBrowser(url: string, label?: string, options: BrowserRequestOptions = {}) {
		const normalized = normalizeBrowserUrl(url);
		const backend = options.backend ?? browserBackend.value;
		const skin = options.skin ?? (backend === 'tor' ? 'tor' : 'netscape');
		const pushHistory = options.pushHistory ?? true;
		if (pushHistory) {
			pushBrowserHistory(normalized);
		} else if (browserHistory.value[browserHistoryIndex.value] !== normalized) {
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

		if (backend === 'tor') {
			browserRenderMode.value = 'snapshot';
			browserFrameSrc.value = 'about:blank';
			void loadBrowserSnapshot(requestSerial, normalized, backend, { pushHistory: false });
			return;
		}

		runtime.fallbackTimer = window.setTimeout(() => {
			if (lifecycleRuntime.disposed || requestSerial !== runtime.requestSerial) return;
			if (browserRenderMode.value !== 'direct') return;
			void loadBrowserSnapshot(requestSerial, normalized, backend, { pushHistory: false });
		}, 2600);
	}

	function isIframeBlockedLocation(href: string) {
		const lowered = href.trim().toLowerCase();
		return (
			lowered === 'about:blank' ||
			lowered.startsWith('chrome-error://') ||
			lowered.includes('chromewebdata')
		);
	}

	function handleDirectBrowserFrameLoad() {
		if (browserRenderMode.value !== 'direct') return;
		if (!browserLoading.value) return;

		const requestSerial = runtime.requestSerial;
		let locationHref = '';
		let canInspectLocation = true;
		try {
			locationHref = browserFrameRef.value?.contentWindow?.location.href ?? '';
		} catch {
			canInspectLocation = false;
		}

		if (locationHref && isIframeBlockedLocation(locationHref)) {
			void loadBrowserSnapshot(requestSerial, browserCurrentUrl.value, browserBackend.value, {
				pushHistory: false
			});
			return;
		}

		if (!canInspectLocation) {
			return;
		}

		clearBrowserFallbackTimer();
		browserLoading.value = false;
		browserError.value = '';
	}

	function handleDirectBrowserFrameError() {
		if (browserRenderMode.value !== 'direct') return;
		const requestSerial = runtime.requestSerial;
		void loadBrowserSnapshot(requestSerial, browserCurrentUrl.value, browserBackend.value, {
			pushHistory: false
		});
	}

	function forceBrowserCompatibilityMode() {
		const requestSerial = ++runtime.requestSerial;
		clearBrowserFallbackTimer();
		browserLoading.value = true;
		browserError.value = '';
		void loadBrowserSnapshot(requestSerial, browserCurrentUrl.value, browserBackend.value, {
			pushHistory: false
		});
	}

	function stopBrowserLoading() {
		runtime.requestSerial += 1;
		clearBrowserFallbackTimer();
		browserLoading.value = false;
		browserError.value = '';
		pushStatus(`${browserShellTitle()} load stopped.`);
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
			vlcError.value = 'Enter a valid YouTube playlist URL or playlist ID.';
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
		pushStatus(vlcSourcePanelOpen.value ? 'Open media panel shown.' : 'Open media panel hidden.');
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

		const nextVolume = clamp(Number.parseInt(target.value, 10) || 0, 0, 100);
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
		const seekSeconds = Math.floor((nextPercent / 100) * vlcDurationSeconds.value);
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
		void postVlcCommand(vlcMuted.value || vlcVolume.value <= 0 ? 'mute' : 'unMute');
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
			void postVlcCommand(vlcMuted.value || vlcVolume.value <= 0 ? 'mute' : 'unMute');
			return;
		}

		if (eventType !== 'infoDelivery' || !info) return;

		const currentTime = info.currentTime;
		if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
			vlcCurrentSeconds.value = Math.max(0, currentTime);
		}

		const duration = info.duration;
		if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
			vlcDurationSeconds.value = duration;
		}
	}

	async function startNoiseGenerator(announce = true) {
		const result = await noiseEngine.start(selectedNoisePreset.value, noiseVolume.value);
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
		noiseVolume.value = clamp(Number.parseInt(input.value, 10) || 0, 0, 100);
		noiseEngine.applyPreset(selectedNoisePreset.value, noiseVolume.value);
	}

	function selectNoisePreset(nextPreset: NoisePresetId) {
		const previousPreset = selectedNoisePreset.value;
		noisePresetId.value = nextPreset;
		if (noiseIsPlaying.value) {
			const sourceChanged = previousPreset.source !== selectedNoisePreset.value.source;
			if (sourceChanged) {
				void startNoiseGenerator(false);
			} else {
				noiseEngine.applyPreset(selectedNoisePreset.value, noiseVolume.value);
			}
			pushStatus(`${selectedNoisePreset.value.label} preset selected.`);
			return;
		}
		noiseEngine.applyPreset(selectedNoisePreset.value, noiseVolume.value);
	}

	function cycleNoisePreset(direction: -1 | 1) {
		const currentIndex = noisePresets.findIndex((preset) => preset.id === noisePresetId.value);
		const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
		const nextIndex = (safeCurrent + direction + noisePresets.length) % noisePresets.length;
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
		const targetUrl = browserSearchUrl(browserSearchEngine.value, browserSearchQuery.value);
		const selectedEngine = browserSearchEngines.value.find(
			(engine: { id: BrowserSearchEngineId }) => engine.id === browserSearchEngine.value
		);

		openInBrowser(targetUrl, selectedEngine?.label ?? browserNetSearchLabel(), {
			backend,
			skin: browserSkin.value
		});
	}

	function searchWithEngine(engineId: BrowserSearchEngineId) {
		browserSearchEngine.value = engineId;
		submitBrowserSearch();
	}

	function openTorBrowser(url = torBrowserHomeUrl, label = 'Tor Browser') {
		openInBrowser(url, label, { backend: 'tor', skin: 'tor' });
	}

	function openStandardBrowser(url = browserHomeUrl, label = standardBrowserName) {
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
		startMenuOpen.value = false;
		restoreWindow('otaclock', false);
		focusWindow('otaclock');
		pushStatus('OtaClock opened.');
	}

	function goBrowserBack() {
		if (browserHistoryIndex.value <= 0) return;
		browserHistoryIndex.value -= 1;
		openInBrowser(browserHistory.value[browserHistoryIndex.value], 'Back', { pushHistory: false });
	}

	function goBrowserForward() {
		if (browserHistoryIndex.value >= browserHistory.value.length - 1) return;
		browserHistoryIndex.value += 1;
		openInBrowser(browserHistory.value[browserHistoryIndex.value], 'Forward', {
			pushHistory: false
		});
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
		const externalWindow = window.open(target, '_blank', 'noopener,noreferrer');
		if (externalWindow) {
			externalWindow.opener = null;
		}
		pushStatus('Opened in external browser tab.');
	}

	function handleBrowserWindowMessage(event: MessageEvent) {
		const browserFrameWindow = browserFrameRef.value?.contentWindow;
		if (browserFrameWindow && event.source === browserFrameWindow) {
			const data = event.data as { type?: string; href?: string } | null;
			if (!data || data.type !== 'browser:navigate' || typeof data.href !== 'string') return;

			openInBrowser(data.href, data.href);
			return;
		}

		const vlcFrameWindow = vlcFrameRef.value?.contentWindow;
		if (vlcFrameWindow && event.source === vlcFrameWindow) {
			handleVlcFrameMessage(event.data);
		}
	}

	function disposeBrowserMediaActions() {
		runtime.requestSerial += 1;
		clearBrowserFallbackTimer();
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
		handleBrowserWindowMessage,
		disposeBrowserMediaActions
	};
}
