import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import {
	browserHomeUrl,
	noisePresets,
	shellIcons,
	torBrowserHomeUrl,
	torSearchHomeUrl,
	windowsMeta,
	xpThemes,
	type XpThemeId
} from '~/src/features/shell/constants/shell';
import type { BrowserSearchEngineId, ResizeDirection } from '~/src/features/shell/model/types';

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
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

function themeLabel(themeId: XpThemeId) {
	const theme = xpThemes.find((entry) => entry.id === themeId);
	return theme?.label ?? 'Theme';
}

export function createShellComputedState(deps: any) {
	const {
		visitorCount,
		activeThemeId,
		sessionRole,
		blogPosts,
		selectedBlogPostId,
		noisePresetId,
		otaClockNow,
		otaClockUse24Hour,
		otaClockRinging,
		otaClockScale,
		powerState,
		windowState,
		browserSkin,
		browserBackend,
		browserHistoryIndex,
		browserHistory,
		vlcPlaylistId,
		vlcHideYoutubeControls,
		vlcEmbedOrigin,
		vlcCurrentSeconds,
		vlcDurationSeconds
	} = deps;

	const marqueeText = 'okami portfolio - windows shell rewrite - click around like it is 2002';
	const onlineStatus = 'online';
	const resizeDirections: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

	const visitorDisplay = computed(
		() => `visitors: ${visitorCount.value.toString().padStart(6, '0')}`
	);
	const activeThemeLabel = computed(() => themeLabel(activeThemeId.value));
	const signedInAsAdmin = computed(() => sessionRole.value === 'admin');
	const selectedBlogPost = computed(() =>
		blogPosts.value.find((post: { id: number }) => post.id === selectedBlogPostId.value) ?? null
	);
	const selectedNoisePreset = computed(
		() => noisePresets.find((preset) => preset.id === noisePresetId.value) ?? noisePresets[0]
	);
	const otaClockDisplayTime = computed(() => {
		const now = otaClockNow.value;
		const hours24 = now.getHours();
		const minutes = now.getMinutes().toString().padStart(2, '0');
		const seconds = now.getSeconds().toString().padStart(2, '0');

		if (otaClockUse24Hour.value) {
			return `${hours24.toString().padStart(2, '0')}:${minutes}:${seconds}`;
		}

		const meridiem = hours24 >= 12 ? 'PM' : 'AM';
		const hours12Raw = hours24 % 12;
		const hours12 = hours12Raw === 0 ? 12 : hours12Raw;
		return `${hours12.toString().padStart(2, '0')}:${minutes}:${seconds} ${meridiem}`;
	});
	const otaClockDisplayDate = computed(() =>
		otaClockNow.value.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		})
	);
	const otaClockSpriteSrc = computed(() =>
		otaClockRinging.value
			? '/otaclock/otacon_alarm_sprite.png'
			: '/otaclock/otacon_sprite.png'
	);
	const otaClockPanelStyle = computed(() => ({
		transform: `scale(${otaClockScale.value})`,
		transformOrigin: 'top left'
	}));
	const powerPrimaryText = computed(() =>
		powerState.value === 'loggingOff' ? 'Logging off...' : 'Windows is shutting down...'
	);
	const taskbarWindows = computed(() =>
		windowsMeta
			.filter((windowMeta) => windowState.value[windowMeta.id].isOpen)
			.map((windowMeta) => {
				if (windowMeta.id === 'browser') {
					return {
						...windowMeta,
						label: browserSkin.value === 'tor' ? 'Tor Browser' : 'Netscape Navigator',
						icon: browserSkin.value === 'tor' ? '/tor-browser-icon.svg' : shellIcons.browser,
						...windowState.value[windowMeta.id]
					};
				}

				return {
					...windowMeta,
					...windowState.value[windowMeta.id]
				};
			})
	);

	const markdownRenderer = new MarkdownIt({
		html: false,
		linkify: true,
		breaks: true
	});

	const canBrowserGoBack = computed(() => browserHistoryIndex.value > 0);
	const canBrowserGoForward = computed(
		() => browserHistoryIndex.value < browserHistory.value.length - 1
	);
	const browserShellTitle = computed(() =>
		browserSkin.value === 'tor' ? 'Tor Browser' : 'Netscape Navigator'
	);
	const browserShellIcon = computed(() =>
		browserSkin.value === 'tor'
			? '/tor-browser-icon.svg'
			: 'https://interface-experience.org/site/wp-content/uploads/2015/01/giphy.gif'
	);
	const browserDefaultHome = computed(() =>
		browserBackend.value === 'tor' ? torBrowserHomeUrl : browserHomeUrl
	);
	const browserSearchEngines = computed<Array<{ id: BrowserSearchEngineId; label: string }>>(() =>
		browserBackend.value === 'tor'
			? [{ id: 'ahmia', label: 'Ahmia (Tor)' }]
			: [
					{ id: 'duckduckgo', label: 'DuckDuckGo' },
					{ id: 'wiby', label: 'Wiby' },
					{ id: 'startpage', label: 'Startpage' }
				]
	);
	const browserNetSearchLabel = computed(() =>
		browserBackend.value === 'tor' ? 'Tor Search' : 'Net Search'
	);
	const vlcEmbedUrl = computed(() => {
		const parameters = new URLSearchParams({
			list: vlcPlaylistId.value,
			enablejsapi: '1',
			autoplay: '0',
			modestbranding: '1',
			rel: '0',
			iv_load_policy: '3',
			playsinline: '1'
		});

		parameters.set('controls', vlcHideYoutubeControls.value ? '0' : '1');
		parameters.set('fs', vlcHideYoutubeControls.value ? '0' : '1');

		if (vlcEmbedOrigin.value) {
			parameters.set('origin', vlcEmbedOrigin.value);
		}

		return `https://www.youtube.com/embed/videoseries?${parameters.toString()}`;
	});
	const vlcProgressPercent = computed(() => {
		if (vlcDurationSeconds.value <= 0) return 0;
		return clamp((vlcCurrentSeconds.value / vlcDurationSeconds.value) * 100, 0, 100);
	});
	const vlcCurrentTimeLabel = computed(() => formatVlcTime(vlcCurrentSeconds.value));
	const vlcDurationLabel = computed(() => formatVlcTime(vlcDurationSeconds.value));

	return {
		marqueeText,
		onlineStatus,
		resizeDirections,
		visitorDisplay,
		activeThemeLabel,
		signedInAsAdmin,
		selectedBlogPost,
		selectedNoisePreset,
		otaClockDisplayTime,
		otaClockDisplayDate,
		otaClockSpriteSrc,
		otaClockPanelStyle,
		powerPrimaryText,
		taskbarWindows,
		markdownRenderer,
		canBrowserGoBack,
		canBrowserGoForward,
		browserShellTitle,
		browserShellIcon,
		browserDefaultHome,
		browserSearchEngines,
		browserNetSearchLabel,
		vlcEmbedUrl,
		vlcProgressPercent,
		vlcCurrentTimeLabel,
		vlcDurationLabel
	};
}
