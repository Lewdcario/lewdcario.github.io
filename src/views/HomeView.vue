<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import projects, { type PortfolioProject } from '../data/projects';
import { createBlogPostInputSchema, type BlogPost } from '~/shared/blog';
import type { AuthSessionRole } from '~/shared/auth';

type TabId = 'about' | 'projects' | 'blog' | 'contact';
type WindowId = 'links' | 'clock' | 'main' | 'browser' | 'recycle' | 'vlc' | 'noise' | 'otaclock';

interface ShellShortcut {
	id: string;
	label: string;
	icon: string;
	href?: string;
	tab?: TabId;
	tor?: boolean;
	recycle?: boolean;
	windowId?: WindowId;
}

interface DesktopIcon extends ShellShortcut {
	x: number;
	y: number;
}

type SplashMode = 'startup' | 'login';
type PowerState = 'idle' | 'loggingOff' | 'shuttingDown';
type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface WindowPosition {
	x: number;
	y: number;
	z: number;
}

interface DragState {
	kind: 'icon' | 'window' | 'resize';
	id: string;
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startX: number;
	startY: number;
	startWidth?: number;
	startHeight?: number;
	direction?: ResizeDirection;
	moved: boolean;
}

interface LinkGroup {
	title: string;
	links: Array<{ label: string; href: string }>;
}

interface WindowMeta {
	id: WindowId;
	label: string;
	icon: string;
}

type ContextTargetType = 'desktop' | 'icon' | 'window' | 'taskbar' | 'start';

interface ContextTarget {
	type: ContextTargetType;
	id?: string;
}

interface ContextMenuItem {
	id: string;
	label: string;
	disabled?: boolean;
	separator?: boolean;
	action: () => void;
}

interface BrowserRenderPayload {
	url: string;
	html: string;
	title?: string;
}

interface BrowserRequestOptions {
	pushHistory?: boolean;
	backend?: BrowserBackend;
	skin?: BrowserSkin;
}

interface BlinkiePayload {
	theme: string;
	badges: string[];
	stamps: string[];
}

type BrowserRenderMode = 'direct' | 'snapshot';
type BrowserBackend = 'standard' | 'tor';
type BrowserSkin = 'netscape' | 'tor';
type BrowserSearchEngineId = 'ahmia' | 'duckduckgo' | 'wiby' | 'startpage';
type NoisePresetId =
	| 'brown-drift'
	| 'white-static'
	| 'pink-cloud'
	| 'tape-hiss'
	| 'purring-white';

type NoiseSourceType = 'noise' | 'purr';

const browserHomeUrl = 'https://library.okami.codes/';
const torBrowserHomeUrl = 'https://check.torproject.org/';
const torSearchHomeUrl = 'https://ahmia.fi/';
const vlcDefaultPlaylistUrl =
	'https://www.youtube.com/watch?v=_laE9-4N3bA&list=PLvVEXejrE-HT5SPUUMaZ1QcTxa2S3PvPw';
const vlcDefaultPlaylistId = 'PLvVEXejrE-HT5SPUUMaZ1QcTxa2S3PvPw';
const guestLoginPasswordSeed = 'cobalt_2002';
const shellIcons = {
	computer: '/xp-icons/pack/computer.png',
	browser: '/xp-icons/pack/browser.png',
	vlc: '/xp-icons/pack/media.png',
	noise: '/xp-icons/pack/media.png',
	otaclock: '/otaclock/icons/group_113_frame0_48x48.png',
	folder: '/xp-icons/pack/folder-closed.png',
	folderOpen: '/xp-icons/pack/folder-open.png',
	contact: '/xp-icons/pack/mail.png',
	recycle: '/xp-icons/pack/recycle-empty.png',
	globe: '/xp-icons/pack/media.png',
	start: '/xp-icons/pack/start.png',
	about: '/xp-icons/pack/documents.png',
	power: '/xp-icons/pack/power.png',
	shell: '/xp-icons/pack/computer.png'
} as const;

const tabs: Array<{ id: TabId; label: string }> = [
	{ id: 'about', label: 'About' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'blog', label: 'Blog' },
	{ id: 'contact', label: 'Contact' }
];

const xpThemes = [
	{ id: 'luna-blue', label: 'Luna Blue' },
	{ id: 'luna-olive', label: 'Luna Olive' },
	{ id: 'luna-silver', label: 'Luna Silver' },
	{ id: 'classic', label: 'Classic Gray' },
	{ id: 'royale-noir', label: 'Royale Noir' },
	{ id: 'zune', label: 'Zune' },
	{ id: 'embedded', label: 'Embedded' },
	{ id: 'high-contrast-black', label: 'High Contrast Black' },
	{ id: 'high-contrast-white', label: 'High Contrast White' },
	{ id: 'candy', label: 'Candy' }
] as const;

const noisePresets: Array<{
	id: NoisePresetId;
	label: string;
	description: string;
	source: NoiseSourceType;
	highpass: number;
	lowpass: number;
	gain: number;
	modRateHz?: number;
	modRateDriftHz?: number;
	modRateDriftAmountHz?: number;
	modDepth?: number;
	modWave?: OscillatorType;
	modDepthDriftHz?: number;
	modDepthDriftMix?: number;
	carrierHz?: number;
	harmonicHz?: number;
	harmonicMix?: number;
	carrierWave?: OscillatorType;
	harmonicWave?: OscillatorType;
	formantAHz?: number;
	formantBHz?: number;
	formantQ?: number;
	formantMixA?: number;
	formantMixB?: number;
	jitterRateHz?: number;
	jitterDepthHz?: number;
}> = [
	{
		id: 'brown-drift',
		label: 'Brown Drift',
		description: 'Deep low rumble for a cocooned room feel.',
		source: 'noise',
		highpass: 14,
		lowpass: 540,
		gain: 0.94
	},
	{
		id: 'white-static',
		label: 'White Static',
		description: 'Full-spectrum hiss like old TV snow.',
		source: 'noise',
		highpass: 24,
		lowpass: 19800,
		gain: 0.58
	},
	{
		id: 'pink-cloud',
		label: 'Pink Cloud',
		description: 'Softer blanket with less high-frequency bite.',
		source: 'noise',
		highpass: 34,
		lowpass: 4200,
		gain: 0.82
	},
	{
		id: 'tape-hiss',
		label: 'Tape Hiss',
		description: 'High-air analog hiss with light body.',
		source: 'noise',
		highpass: 2600,
		lowpass: 14500,
		gain: 0.46
	},
	{
		id: 'purring-white',
		label: 'Purring',
		description: 'Pure purr tone with no static hiss.',
		source: 'purr',
		highpass: 18,
		lowpass: 420,
		gain: 0.92,
		modRateHz: 1.6,
		modRateDriftHz: 0.13,
		modRateDriftAmountHz: 0.42,
		modDepth: 0.76,
		modWave: 'sine',
		modDepthDriftHz: 0.18,
		modDepthDriftMix: 0.2,
		carrierHz: 26,
		harmonicHz: 52,
		harmonicMix: 0.36,
		carrierWave: 'sawtooth',
		harmonicWave: 'triangle',
		formantAHz: 118,
		formantBHz: 238,
		formantQ: 1.45,
		formantMixA: 0.68,
		formantMixB: 0.47,
		jitterRateHz: 0.58,
		jitterDepthHz: 1.25
	}
];

type XpThemeId = (typeof xpThemes)[number]['id'];
const defaultThemeId: XpThemeId = 'luna-blue';
const defaultBlinkieThemeId: XpThemeId = 'candy';
const themeStorageKey = 'okami_portfolio_theme';

const linkGroups: LinkGroup[] = [
	{
		title: '-- projects --',
		links: [
			{ label: 'Progressive Victory', href: 'https://progress.win' },
			{ label: 'Smashcords', href: 'https://smashcords.com' },
			{ label: 'discord.js', href: 'https://discord.js.org' }
		]
	},
	{
		title: '-- socials --',
		links: [
			{ label: 'GitHub', href: 'https://github.com/Lewdcario' },
			{ label: 'Twitter', href: 'https://twitter.com/okamicario' }
		]
	}
];

const recycleBinShortcuts: ShellShortcut[] = [
	{
		id: 'oldnet',
		label: 'TheOldNet',
		icon: shellIcons.browser,
		href: 'https://theoldnet.com/'
	},
	{
		id: 'oldweb-today',
		label: 'Oldweb.Today',
		icon: shellIcons.browser,
		href: 'https://oldweb.today/'
	},
	{
		id: 'neocities',
		label: 'Neocities',
		icon: shellIcons.browser,
		href: 'https://neocities.org/browse'
	},
	{
		id: 'spacehey',
		label: 'SpaceHey',
		icon: shellIcons.browser,
		href: 'https://spacehey.com/'
	},
	{
		id: 'wiby',
		label: 'Wiby',
		icon: shellIcons.browser,
		href: 'https://wiby.me/'
	},
	{
		id: 'camerons-world',
		label: 'Camerons World',
		icon: shellIcons.browser,
		href: 'https://www.cameronsworld.net/'
	}
];

const desktopIcons: DesktopIcon[] = [
	{
		id: 'github',
		label: 'GitHub',
		icon: shellIcons.computer,
		href: 'https://github.com/Lewdcario',
		x: 34,
		y: 130
	},
	{
		id: 'about-me',
		label: 'About Me',
		icon: shellIcons.browser,
		href: 'https://library.okami.codes',
		x: 126,
		y: 130
	},
	{
		id: 'tor-browser',
		label: 'Tor Browser',
		icon: '/tor-browser-icon.svg',
		href: torBrowserHomeUrl,
		tor: true,
		x: 126,
		y: 370
	},
	{
		id: 'vlc-player',
		label: 'VLC Player',
		icon: shellIcons.vlc,
		windowId: 'vlc',
		x: 222,
		y: 370
	},
	{
		id: 'noise-generator',
		label: 'Noise Player',
		icon: shellIcons.noise,
		windowId: 'noise',
		x: 318,
		y: 370
	},
	{
		id: 'otaclock',
		label: 'OtaClock',
		icon: shellIcons.otaclock,
		windowId: 'otaclock',
		x: 222,
		y: 250
	},
	{
		id: 'library',
		label: 'Library',
		icon: shellIcons.folder,
		href: 'https://library.okami.codes/library',
		x: 126,
		y: 250
	},
	{
		id: 'projects',
		label: 'Projects',
		icon: shellIcons.folder,
		tab: 'projects',
		x: 34,
		y: 250
	},
	{
		id: 'contact',
		label: 'Contact',
		icon: shellIcons.contact,
		tab: 'contact',
		x: 34,
		y: 370
	},
	{
		id: 'recycle-bin',
		label: 'Recycle Bin',
		icon: shellIcons.recycle,
		recycle: true,
		x: 0,
		y: 0
	}
];

const windowsMeta: WindowMeta[] = [
	{
		id: 'links',
		label: 'Links',
		icon: shellIcons.folderOpen
	},
	{
		id: 'clock',
		label: 'timedatectl.d',
		icon: shellIcons.globe
	},
	{
		id: 'main',
		label: 'okami@desktop:~/portfolio',
		icon: shellIcons.shell
	},
	{
		id: 'browser',
		label: 'Netscape Navigator',
		icon: shellIcons.browser
	},
	{
		id: 'recycle',
		label: 'Recycle Bin',
		icon: shellIcons.recycle
	},
	{
		id: 'vlc',
		label: 'VLC media player',
		icon: shellIcons.vlc
	},
	{
		id: 'noise',
		label: 'White Noise Generator',
		icon: shellIcons.noise
	},
	{
		id: 'otaclock',
		label: 'OtaClock',
		icon: shellIcons.otaclock
	}
];

function createDefaultWindowPositions(): Record<WindowId, WindowPosition> {
	return {
		links: { x: 150, y: 66, z: 6 },
		clock: { x: 150, y: 330, z: 7 },
		main: { x: 380, y: 58, z: 8 },
		browser: { x: 300, y: 96, z: 9 },
		recycle: { x: 540, y: 132, z: 10 },
		vlc: { x: 460, y: 120, z: 11 },
		noise: { x: 690, y: 190, z: 12 },
		otaclock: { x: 880, y: 120, z: 13 }
	};
}

function createDefaultWindowState() {
	return {
		links: { isOpen: true, isMinimized: false, isMaximized: false },
		clock: { isOpen: true, isMinimized: false, isMaximized: false },
		main: { isOpen: true, isMinimized: false, isMaximized: false },
		browser: { isOpen: false, isMinimized: false, isMaximized: false },
		recycle: { isOpen: false, isMinimized: false, isMaximized: false },
		vlc: { isOpen: false, isMinimized: false, isMaximized: false },
		noise: { isOpen: false, isMinimized: false, isMaximized: false },
		otaclock: { isOpen: false, isMinimized: false, isMaximized: false }
	};
}

function noiseWindowHeightForPresetList() {
	const shellControlsHeight = 212;
	const presetItemHeight = 43;
	const presetItemGap = 5;
	const presetCount = Math.max(1, noisePresets.length);
	return shellControlsHeight + presetCount * presetItemHeight + (presetCount - 1) * presetItemGap;
}

function createDefaultWindowSizes() {
	return {
		links: { width: 220, height: 230 },
		clock: { width: 220, height: 150 },
		main: { width: 860, height: 620 },
		browser: { width: 640, height: 600 },
		recycle: { width: 360, height: 280 },
		vlc: { width: 640, height: 430 },
		noise: { width: 430, height: noiseWindowHeightForPresetList() },
		otaclock: { width: 440, height: 520 }
	};
}

const splashVisible = ref(true);
const splashMode = ref<SplashMode>('startup');
const powerState = ref<PowerState>('idle');
const selectedLoginUser = ref<AuthSessionRole>('guest');
const sessionRole = ref<AuthSessionRole>('guest');
const adminLoginPassword = ref('');
const loginSubmitting = ref(false);
const loginError = ref('');
const activeThemeId = ref<XpThemeId>(defaultThemeId);
const activeTab = ref<TabId>('about');
const startMenuOpen = ref(false);
const liveClock = ref('--:--:--');
const taskbarClock = ref('--:-- PM');
const otaClockNow = ref(new Date());
const visitorCount = ref(0);
const statusMessage = ref('desktop ready.');
const isCompactLayout = ref(false);
const iconPositions = ref<Record<string, { x: number; y: number }>>({});
const windowPositions = ref<Record<WindowId, WindowPosition>>(createDefaultWindowPositions());
const windowState = ref<
	Record<
		WindowId,
			{
				isOpen: boolean;
				isMinimized: boolean;
				isMaximized: boolean;
			}
		>
	>(createDefaultWindowState());
const windowSizes = ref<Record<WindowId, { width: number; height: number }>>(
	createDefaultWindowSizes()
);
const linksWindowRef = ref<HTMLElement | null>(null);
const clockWindowRef = ref<HTMLElement | null>(null);
const mainWindowRef = ref<HTMLElement | null>(null);
const browserWindowRef = ref<HTMLElement | null>(null);
const recycleWindowRef = ref<HTMLElement | null>(null);
const vlcWindowRef = ref<HTMLElement | null>(null);
const noiseWindowRef = ref<HTMLElement | null>(null);
const otaClockWindowRef = ref<HTMLElement | null>(null);
const activeDrag = ref<DragState | null>(null);
const browserAddress = ref(browserHomeUrl);
const browserCurrentUrl = ref(browserHomeUrl);
const browserDocument = ref(navigatorPlaceholderDocument('Type a URL and press Go.', browserHomeUrl));
const browserFrameSrc = ref(browserHomeUrl);
const browserRenderMode = ref<BrowserRenderMode>('snapshot');
const browserBackend = ref<BrowserBackend>('standard');
const browserSkin = ref<BrowserSkin>('netscape');
const browserFrameRef = ref<HTMLIFrameElement | null>(null);
const browserAddressInputRef = ref<HTMLInputElement | null>(null);
const browserSearchInputRef = ref<HTMLInputElement | null>(null);
const browserLoading = ref(false);
const browserError = ref('');
const browserTitle = ref('Netscape Navigator');
const browserHistory = ref<string[]>([browserHomeUrl]);
const browserHistoryIndex = ref(0);
const browserSearchMenuOpen = ref(false);
const browserSearchQuery = ref('');
const browserSearchEngine = ref<BrowserSearchEngineId>('duckduckgo');
const vlcFrameRef = ref<HTMLIFrameElement | null>(null);
const vlcPlaylistInput = ref(vlcDefaultPlaylistUrl);
const vlcPlaylistId = ref(vlcDefaultPlaylistId);
const vlcError = ref('');
const vlcVolume = ref(72);
const vlcMuted = ref(false);
const vlcHideYoutubeControls = ref(true);
const vlcEmbedOrigin = ref('');
const vlcSourcePanelOpen = ref(false);
const vlcCurrentSeconds = ref(0);
const vlcDurationSeconds = ref(0);
const noisePresetId = ref<NoisePresetId>('brown-drift');
const noiseVolume = ref(42);
const noiseIsPlaying = ref(false);
const noiseError = ref('');
const otaClockAudioLaughRef = ref<HTMLAudioElement | null>(null);
const otaClockAudioOkRef = ref<HTMLAudioElement | null>(null);
const otaClockUse24Hour = ref(true);
const otaClockAlarmEnabled = ref(false);
const otaClockAlarmSound = ref<'LAUGH' | 'OK'>('LAUGH');
const otaClockAlarmDuration = ref(10);
const otaClockAlarmTimesInput = ref('12:00:00\n18:00:00');
const otaClockAlwaysOnTop = ref(false);
const otaClockLockPosition = ref(false);
const otaClockScale = ref(1);
const otaClockRinging = ref(false);
const otaClockConfigOpen = ref(false);
const blogPosts = ref<BlogPost[]>([]);
const selectedBlogPostId = ref<number | null>(null);
const blogLoading = ref(false);
const blogError = ref('');
const blogComposerTitle = ref('');
const blogComposerExcerpt = ref('');
const blogComposerContent = ref('');
const blogComposerPublished = ref(true);
const blogComposerSaving = ref(false);
const blogComposerError = ref('');
const blogEditingPostId = ref<number | null>(null);
const blogDeletingPostId = ref<number | null>(null);
const blinkieBadges = ref<string[]>([]);
const blinkieStamps = ref<string[]>([]);
const blinkieLoading = ref(false);
const blinkieError = ref('');
const contextMenuRef = ref<HTMLElement | null>(null);
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextTarget = ref<ContextTarget>({ type: 'desktop' });

let noiseAudioContext: AudioContext | null = null;
let noiseSourceNode: AudioBufferSourceNode | null = null;
let noiseCarrierNode: OscillatorNode | null = null;
let noiseHarmonicNode: OscillatorNode | null = null;
let noiseHarmonicGainNode: GainNode | null = null;
let noisePurrPreMixNode: GainNode | null = null;
let noisePurrFormantANode: BiquadFilterNode | null = null;
let noisePurrFormantBNode: BiquadFilterNode | null = null;
let noisePurrFormantAGainNode: GainNode | null = null;
let noisePurrFormantBGainNode: GainNode | null = null;
let noiseJitterOscNode: OscillatorNode | null = null;
let noiseJitterCarrierGainNode: GainNode | null = null;
let noiseJitterHarmonicGainNode: GainNode | null = null;
let noiseGainNode: GainNode | null = null;
let noiseHighpassNode: BiquadFilterNode | null = null;
let noiseLowpassNode: BiquadFilterNode | null = null;
let noiseModOscNode: OscillatorNode | null = null;
let noiseModGainNode: GainNode | null = null;
let noiseModRateLfoNode: OscillatorNode | null = null;
let noiseModRateLfoGainNode: GainNode | null = null;
let noiseModDepthLfoNode: OscillatorNode | null = null;
let noiseModDepthLfoGainNode: GainNode | null = null;

const marqueeText =
	'okami portfolio - windows shell rewrite - click around like it is 2002';
const onlineStatus = 'online';

const visitorDisplay = computed(
	() => `visitors: ${visitorCount.value.toString().padStart(6, '0')}`
);
const activeThemeLabel = computed(() => themeLabel(activeThemeId.value));
const signedInAsAdmin = computed(() => sessionRole.value === 'admin');
const selectedBlogPost = computed(() =>
	blogPosts.value.find((post) => post.id === selectedBlogPostId.value) ?? null
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
	powerState.value === 'loggingOff'
		? 'Logging off...'
		: 'Windows is shutting down...'
);
const resizeDirections: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const taskbarWindows = computed(() =>
	windowsMeta
		.filter((windowMeta) => windowState.value[windowMeta.id].isOpen)
		.map((windowMeta) => {
			if (windowMeta.id === 'browser') {
				return {
					...windowMeta,
						label: browserSkin.value === 'tor' ? 'Tor Browser' : 'Netscape Navigator',
						icon:
							browserSkin.value === 'tor'
								? '/tor-browser-icon.svg'
								: shellIcons.browser,
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
const contextMenuTitle = computed(() => {
	if (contextTarget.value.type === 'icon') {
		const icon = desktopIcons.find((entry) => entry.id === contextTarget.value.id);
		return icon?.label ?? 'Desktop Item';
	}

	if (contextTarget.value.type === 'window' || contextTarget.value.type === 'taskbar') {
		if (contextTarget.value.id === 'browser') {
			return browserShellTitle.value;
		}
		const windowMeta = windowsMeta.find((entry) => entry.id === contextTarget.value.id);
		return windowMeta?.label ?? 'Window';
	}

	if (contextTarget.value.type === 'start') {
		return 'Start Menu';
	}

	return 'Desktop';
});
const contextMenuItems = computed<ContextMenuItem[]>(() => {
	if (contextTarget.value.type === 'icon') {
		const icon = desktopIcons.find((entry) => entry.id === contextTarget.value.id);
		if (!icon) return [];

		return [
			{
				id: 'open',
				label: 'Open',
				action: () => handleDesktopIconContextAction(icon)
			},
			{
				id: 'open-navigator',
				label: 'Open In Navigator',
				disabled: !icon.href,
				action: () => {
					if (!icon.href) return;
					if (icon.tor) {
						openTorBrowser(icon.href, icon.label);
						return;
					}
					openInBrowser(icon.href, icon.label, { backend: 'standard', skin: 'netscape' });
				}
			},
			{ id: 'sep-1', label: '', separator: true, action: () => undefined },
			{
				id: 'properties',
				label: 'Properties',
				action: () => pushStatus(`${icon.label} properties are unavailable in this build.`)
			}
		];
	}

	if (contextTarget.value.type === 'window' || contextTarget.value.type === 'taskbar') {
		const windowId = contextTarget.value.id as WindowId | undefined;
		if (!windowId) return [];

		const state = windowState.value[windowId];
		if (!state) return [];

		return [
			{
				id: 'restore',
				label: state.isMaximized ? 'Restore' : 'Maximize',
				disabled: isCompactLayout.value,
				action: () => toggleMaximizeWindow(windowId)
			},
			{
				id: 'minimize',
				label: 'Minimize',
				action: () => minimizeWindow(windowId)
			},
			{ id: 'sep-1', label: '', separator: true, action: () => undefined },
			{
				id: 'close',
				label: 'Close',
				action: () => closeWindow(windowId)
			}
		];
	}

	if (contextTarget.value.type === 'start') {
		return [
			{
				id: 'open-browser',
				label: 'Open Navigator',
				action: () =>
					openNetscapeBrowser(browserCurrentUrl.value || browserHomeUrl, 'Open Navigator')
			},
			{
				id: 'open-tor-browser',
				label: 'Open Tor Browser',
				action: () => openTorBrowser(browserCurrentUrl.value || torBrowserHomeUrl, 'Tor Browser')
			},
			{
				id: 'open-vlc',
				label: 'Open VLC',
				action: () => openVlcWindow()
			},
			{
				id: 'open-noise',
				label: 'Open Noise Generator',
				action: () => openNoiseWindow()
			},
			{
				id: 'open-otaclock',
				label: 'Open OtaClock',
				action: () => openOtaClockWindow()
			},
			{
				id: 'logoff',
				label: 'Log Off...',
				action: () => {
					void performLogoff();
				}
			}
		];
	}

	return [
		{
			id: 'refresh',
			label: 'Refresh',
			action: () => pushStatus('Desktop refreshed.')
		},
		{
			id: 'open-navigator',
			label: 'Open Navigator',
			action: () => openNetscapeBrowser(browserCurrentUrl.value || browserHomeUrl, 'Open Navigator')
		},
		{
			id: 'show-desktop',
			label: 'Show Desktop',
			action: () => minimizeAllWindows()
		},
		{ id: 'sep-1', label: '', separator: true, action: () => undefined },
		{
			id: 'arrange-icons',
			label: 'Arrange Icons',
			action: () => resetDesktopIcons()
		}
	];
});

let statusTimer: number | null = null;
let clockTimer: number | null = null;
let browserRequestSerial = 0;
let blinkieRequestSerial = 0;
let browserFallbackTimer: number | null = null;
let otaClockAlarmStopTimer: number | null = null;
let disposed = false;
let zCounter = 13;
const draggedIconIds = new Set<string>();

function randomBetween(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pause(milliseconds: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, milliseconds);
	});
}

function updateClocks() {
	const now = new Date();
	otaClockNow.value = now;
	const hour24 = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');
	liveClock.value = `${hour24}:${minutes}:${seconds}`;

	const hour12raw = now.getHours() % 12;
	const hour12 = hour12raw === 0 ? 12 : hour12raw;
	const meridiem = now.getHours() >= 12 ? 'PM' : 'AM';
	taskbarClock.value = `${hour12}:${minutes} ${meridiem}`;
	checkOtaClockAlarm(now);
}

function parseOtaClockAlarmTimes(rawValue: string) {
	const parsed = new Set<string>();
	for (const line of rawValue.split(/\r?\n/g)) {
		const token = line.trim();
		if (!token) continue;
		if (/^\d{2}:\d{2}:\d{2}$/.test(token)) {
			parsed.add(token);
		}
	}
	return parsed;
}

function stopOtaClockAlarm(announce = true) {
	if (otaClockAlarmStopTimer !== null) {
		window.clearTimeout(otaClockAlarmStopTimer);
		otaClockAlarmStopTimer = null;
	}

	otaClockRinging.value = false;
	const audioElements = [otaClockAudioLaughRef.value, otaClockAudioOkRef.value];
	for (const audio of audioElements) {
		if (!audio) continue;
		audio.pause();
		audio.currentTime = 0;
	}

	if (announce) {
		pushStatus('OtaClock alarm stopped.');
	}
}

function startOtaClockAlarm() {
	stopOtaClockAlarm(false);
	otaClockRinging.value = true;
	restoreWindow('otaclock', false);
	focusWindow('otaclock');

	const targetAudio =
		otaClockAlarmSound.value === 'LAUGH'
			? otaClockAudioLaughRef.value
			: otaClockAudioOkRef.value;

	if (targetAudio) {
		targetAudio.loop = true;
		void targetAudio.play().catch(() => {
			pushStatus('OtaClock alarm triggered. Click Stop Alarm to silence it.');
		});
	}

	otaClockAlarmStopTimer = window.setTimeout(() => {
		stopOtaClockAlarm(false);
		pushStatus('OtaClock alarm finished.');
	}, otaClockAlarmDuration.value * 1000);
}

function checkOtaClockAlarm(now: Date) {
	if (!otaClockAlarmEnabled.value) return;
	if (otaClockRinging.value) return;

	const activeAlarms = parseOtaClockAlarmTimes(otaClockAlarmTimesInput.value);
	if (activeAlarms.size === 0) return;

	const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
		.getMinutes()
		.toString()
		.padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

	if (!activeAlarms.has(currentTime)) {
		return;
	}

	startOtaClockAlarm();
}

function incrementVisitorCount() {
	const key = 'okami_portfolio_visitors';
	const rawValue = Number.parseInt(localStorage.getItem(key) ?? '', 10);
	const seed =
		Number.isFinite(rawValue) && rawValue > 0
			? rawValue
			: 13600 + randomBetween(0, 900);
	const next = seed + 1;
	localStorage.setItem(key, String(next));
	visitorCount.value = next;
}

function pushStatus(message: string) {
	statusMessage.value = message;

	if (statusTimer !== null) {
		window.clearTimeout(statusTimer);
	}

	statusTimer = window.setTimeout(() => {
		statusMessage.value = 'desktop ready.';
		statusTimer = null;
	}, 2200);
}

function isThemeId(value: string): value is XpThemeId {
	return xpThemes.some((theme) => theme.id === value);
}

function themeLabel(themeId: XpThemeId) {
	const theme = xpThemes.find((entry) => entry.id === themeId);
	return theme?.label ?? 'Theme';
}

function applyTheme(themeId: XpThemeId, announce = true) {
	activeThemeId.value = themeId;

	try {
		localStorage.setItem(themeStorageKey, themeId);
	} catch {
		// Ignore storage failures in restricted environments.
	}

	if (announce) {
		pushStatus(`${themeLabel(themeId)} theme applied.`);
	}
}

function setTheme(themeId: XpThemeId) {
	applyTheme(themeId);
	startMenuOpen.value = false;
}

function blinkieFolderForTheme(themeId: XpThemeId): string {
	const themeFolderMap: Partial<Record<XpThemeId, string>> = {
		'luna-blue': 'blue',
		'royale-noir': 'dark',
		zune: 'dark',
		'high-contrast-black': 'dark'
	};
	return themeFolderMap[themeId] ?? themeId;
}

async function loadThemeBlinkies(themeId: XpThemeId) {
	const requestSerial = ++blinkieRequestSerial;
	const folder = blinkieFolderForTheme(themeId);
	const fallbackFolder = blinkieFolderForTheme(defaultBlinkieThemeId);
	blinkieLoading.value = true;
	blinkieError.value = '';
	blinkieBadges.value = [];
	blinkieStamps.value = [];

	try {
		let payload = await $fetch<BlinkiePayload>('/api/blinkies', {
			query: { theme: folder }
		});
		const hasBlinkies = payload.badges.length > 0 || payload.stamps.length > 0;
		if (!hasBlinkies && folder !== fallbackFolder) {
			payload = await $fetch<BlinkiePayload>('/api/blinkies', {
				query: { theme: fallbackFolder }
			});
		}

		if (disposed || requestSerial !== blinkieRequestSerial) return;

		blinkieBadges.value = payload.badges;
		blinkieStamps.value = payload.stamps;
	} catch (error) {
		if (disposed || requestSerial !== blinkieRequestSerial) return;
		blinkieBadges.value = [];
		blinkieStamps.value = [];
		blinkieError.value =
			error instanceof Error ? error.message : 'Unable to load blinkies for this theme.';
	} finally {
		if (!disposed && requestSerial === blinkieRequestSerial) {
			blinkieLoading.value = false;
		}
	}
}

function readApiErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === 'object') {
		const maybe = error as { data?: { statusMessage?: unknown }; message?: unknown };
		if (typeof maybe.data?.statusMessage === 'string' && maybe.data.statusMessage.trim()) {
			return maybe.data.statusMessage;
		}
		if (typeof maybe.message === 'string' && maybe.message.trim()) {
			return maybe.message;
		}
	}

	return fallback;
}

async function refreshAuthSession() {
	try {
		const payload = await $fetch<{ role: AuthSessionRole }>('/api/auth/session');
		sessionRole.value = payload.role;
	} catch {
		sessionRole.value = 'guest';
	}
}

async function loadBlogPosts() {
	blogLoading.value = true;
	blogError.value = '';

	try {
		const payload = await $fetch<{ role: AuthSessionRole; posts: BlogPost[] }>('/api/blog/posts');
		sessionRole.value = payload.role;
		blogPosts.value = payload.posts;
		if (payload.posts.length === 0) {
			selectedBlogPostId.value = null;
		} else if (!payload.posts.some((post) => post.id === selectedBlogPostId.value)) {
			selectedBlogPostId.value = payload.posts[0]?.id ?? null;
		}
		if (
			blogEditingPostId.value !== null &&
			!payload.posts.some((post) => post.id === blogEditingPostId.value)
		) {
			resetBlogComposer();
		}
	} catch (error) {
		blogPosts.value = [];
		selectedBlogPostId.value = null;
		blogError.value = readApiErrorMessage(error, 'Unable to load blog posts.');
	} finally {
		blogLoading.value = false;
	}
}

function resetBlogComposer() {
	blogComposerTitle.value = '';
	blogComposerExcerpt.value = '';
	blogComposerContent.value = '';
	blogComposerPublished.value = true;
	blogComposerError.value = '';
	blogEditingPostId.value = null;
}

function beginEditingBlogPost(post: BlogPost | null) {
	if (!signedInAsAdmin.value || !post || blogComposerSaving.value || blogDeletingPostId.value !== null) {
		return;
	}

	blogEditingPostId.value = post.id;
	blogComposerTitle.value = post.title;
	blogComposerExcerpt.value = post.excerpt;
	blogComposerContent.value = post.content;
	blogComposerPublished.value = post.published;
	blogComposerError.value = '';
}

function cancelEditingBlogPost() {
	if (blogComposerSaving.value) return;
	resetBlogComposer();
}

async function submitBlogPost() {
	if (!signedInAsAdmin.value || blogComposerSaving.value) return;

	blogComposerError.value = '';
	const parseResult = createBlogPostInputSchema.safeParse({
		title: blogComposerTitle.value,
		excerpt: blogComposerExcerpt.value,
		content: blogComposerContent.value,
		published: blogComposerPublished.value
	});

	if (!parseResult.success) {
		blogComposerError.value = parseResult.error.issues[0]?.message ?? 'Invalid post data.';
		return;
	}

	blogComposerSaving.value = true;
	const editingPostId = blogEditingPostId.value;
	try {
		if (editingPostId === null) {
			const payload = await $fetch<{ post: BlogPost }>('/api/blog/posts', {
				method: 'POST',
				body: parseResult.data
			});
			blogPosts.value = [payload.post, ...blogPosts.value];
			selectedBlogPostId.value = payload.post.id;
			resetBlogComposer();
			pushStatus(`Published "${payload.post.title}".`);
		} else {
			const payload = await $fetch<{ post: BlogPost }>(`/api/blog/posts/${editingPostId}`, {
				method: 'PATCH',
				body: parseResult.data
			});
			const existingPostIndex = blogPosts.value.findIndex((post) => post.id === editingPostId);
			if (existingPostIndex >= 0) {
				const nextPosts = [...blogPosts.value];
				nextPosts.splice(existingPostIndex, 1, payload.post);
				blogPosts.value = nextPosts;
			} else {
				blogPosts.value = [payload.post, ...blogPosts.value];
			}
			selectedBlogPostId.value = payload.post.id;
			resetBlogComposer();
			pushStatus(`Updated "${payload.post.title}".`);
		}
	} catch (error) {
		blogComposerError.value = readApiErrorMessage(
			error,
			editingPostId === null ? 'Failed publishing blog post.' : 'Failed updating blog post.'
		);
	} finally {
		blogComposerSaving.value = false;
	}
}

async function deleteSelectedBlogPost() {
	if (
		!signedInAsAdmin.value ||
		blogComposerSaving.value ||
		blogDeletingPostId.value !== null ||
		!selectedBlogPost.value
	) {
		return;
	}

	const post = selectedBlogPost.value;
	const shouldDelete = window.confirm(`Delete "${post.title}"? This cannot be undone.`);
	if (!shouldDelete) return;

	blogComposerError.value = '';
	blogDeletingPostId.value = post.id;
	try {
		const payload = await $fetch<{ deletedId: number }>(`/api/blog/posts/${post.id}`, {
			method: 'DELETE'
		});
		blogPosts.value = blogPosts.value.filter((entry) => entry.id !== payload.deletedId);
		if (selectedBlogPostId.value === payload.deletedId) {
			selectedBlogPostId.value = blogPosts.value[0]?.id ?? null;
		}
		if (blogEditingPostId.value === payload.deletedId) {
			resetBlogComposer();
		}
		pushStatus(`Deleted "${post.title}".`);
	} catch (error) {
		blogComposerError.value = readApiErrorMessage(error, 'Failed deleting blog post.');
	} finally {
		blogDeletingPostId.value = null;
	}
}

function formatBlogTimestamp(value: string) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleString();
}

function selectBlogPost(postId: number) {
	selectedBlogPostId.value = postId;
}

function renderBlogMarkdown(content: string) {
	return markdownRenderer.render(content);
}

function setTab(tab: TabId) {
	if (!isWindowVisible('main')) {
		restoreWindow('main', false);
	}
	activeTab.value = tab;
	if (tab === 'blog' && !blogLoading.value) {
		void loadBlogPosts();
	}
	startMenuOpen.value = false;
	pushStatus(`${tab} opened.`);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function iconBounds() {
	const maxX = Math.max(12, window.innerWidth - 88);
	const maxY = Math.max(12, window.innerHeight - 130);
	return { minX: 12, maxX, minY: 40, maxY };
}

function windowMinSize(windowId: WindowId) {
	if (windowId === 'main') return { width: 520, height: 360 };
	if (windowId === 'browser') return { width: 460, height: 320 };
	if (windowId === 'vlc') return { width: 420, height: 280 };
	if (windowId === 'noise') return { width: 340, height: 280 };
	if (windowId === 'recycle') return { width: 260, height: 180 };
	if (windowId === 'otaclock') return { width: 390, height: 360 };
	return { width: 180, height: 120 };
}

function getWindowSize(windowId: WindowId) {
	return windowSizes.value[windowId];
}

function windowBounds(windowId: WindowId) {
	const state = windowState.value[windowId];
	const size = getWindowSize(windowId);
	const width = state.isMaximized ? window.innerWidth - 8 : size.width;
	const height = state.isMaximized ? window.innerHeight - 42 : size.height;
	const maxX = Math.max(12, window.innerWidth - width - 12);
	const maxY = Math.max(12, window.innerHeight - height - 40);

	return { minX: 12, maxX, minY: 12, maxY };
}

function normalizeDesktopLayout() {
	isCompactLayout.value = window.innerWidth <= 1180;

	const nextIcons: Record<string, { x: number; y: number }> = { ...iconPositions.value };
	for (const icon of desktopIcons) {
		if (!nextIcons[icon.id]) {
			nextIcons[icon.id] = { x: icon.x, y: icon.y };
		}
	}

	if (!nextIcons['recycle-bin']) {
		nextIcons['recycle-bin'] = { x: 0, y: 0 };
	}

	if (nextIcons['recycle-bin'].x === 0 && nextIcons['recycle-bin'].y === 0) {
		nextIcons['recycle-bin'] = {
			x: Math.max(12, window.innerWidth - 108),
			y: Math.max(42, window.innerHeight - 160)
		};
	}

	const iconLimits = iconBounds();
	for (const icon of desktopIcons) {
		const current = nextIcons[icon.id];
		nextIcons[icon.id] = {
			x: clamp(current.x, iconLimits.minX, iconLimits.maxX),
			y: clamp(current.y, iconLimits.minY, iconLimits.maxY)
		};
	}
	iconPositions.value = nextIcons;

	for (const windowId of Object.keys(windowPositions.value) as WindowId[]) {
		const minSize = windowMinSize(windowId);
		const maxWidth = Math.max(minSize.width, window.innerWidth - 24);
		const maxHeight = Math.max(minSize.height, window.innerHeight - 54);
		windowSizes.value[windowId].width = clamp(
			windowSizes.value[windowId].width,
			minSize.width,
			maxWidth
		);
		windowSizes.value[windowId].height = clamp(
			windowSizes.value[windowId].height,
			minSize.height,
			maxHeight
		);

		const current = windowPositions.value[windowId];
		const limits = windowBounds(windowId);
		current.x = clamp(current.x, limits.minX, limits.maxX);
		current.y = clamp(current.y, limits.minY, limits.maxY);
	}
}

function focusWindow(windowId: WindowId) {
	if (isCompactLayout.value) return;
	if (!windowState.value[windowId].isOpen || windowState.value[windowId].isMinimized) return;
	zCounter += 1;
	windowPositions.value[windowId].z = zCounter;

	if (
		otaClockAlwaysOnTop.value &&
		windowId !== 'otaclock' &&
		isWindowVisible('otaclock')
	) {
		zCounter += 1;
		windowPositions.value.otaclock.z = zCounter;
	}
}

function startWindowDrag(windowId: WindowId, event: PointerEvent) {
	if (isCompactLayout.value || event.button !== 0) return;
	if ((event.target as HTMLElement | null)?.closest('.title-bar-controls')) return;
	if (windowId === 'otaclock' && otaClockLockPosition.value) return;
	if (windowState.value[windowId].isMaximized) return;
	if (!isWindowVisible(windowId)) return;

	focusWindow(windowId);

	const windowPosition = windowPositions.value[windowId];
	activeDrag.value = {
		kind: 'window',
		id: windowId,
		pointerId: event.pointerId,
		startClientX: event.clientX,
		startClientY: event.clientY,
		startX: windowPosition.x,
		startY: windowPosition.y,
		moved: false
	};

	(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function startWindowResize(windowId: WindowId, direction: ResizeDirection, event: PointerEvent) {
	if (isCompactLayout.value || event.button !== 0) return;
	if (!isWindowVisible(windowId)) return;
	if (windowState.value[windowId].isMaximized) return;

	event.preventDefault();
	event.stopPropagation();
	focusWindow(windowId);

	const position = windowPositions.value[windowId];
	const size = getWindowSize(windowId);
	activeDrag.value = {
		kind: 'resize',
		id: windowId,
		pointerId: event.pointerId,
		startClientX: event.clientX,
		startClientY: event.clientY,
		startX: position.x,
		startY: position.y,
		startWidth: size.width,
		startHeight: size.height,
		direction,
		moved: false
	};

	(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function startIconDrag(icon: DesktopIcon, event: PointerEvent) {
	if (event.button !== 0) return;
	event.preventDefault();
	event.stopPropagation();

	const position = iconPositions.value[icon.id] ?? { x: icon.x, y: icon.y };
	activeDrag.value = {
		kind: 'icon',
		id: icon.id,
		pointerId: event.pointerId,
		startClientX: event.clientX,
		startClientY: event.clientY,
		startX: position.x,
		startY: position.y,
		moved: false
	};

	(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
	const drag = activeDrag.value;
	if (!drag || drag.pointerId !== event.pointerId) return;

	const deltaX = event.clientX - drag.startClientX;
	const deltaY = event.clientY - drag.startClientY;
	if (deltaX * deltaX + deltaY * deltaY > 36) {
		drag.moved = true;
	}

	if (drag.kind === 'icon') {
		const limits = iconBounds();
		const nextX = clamp(drag.startX + deltaX, limits.minX, limits.maxX);
		const nextY = clamp(drag.startY + deltaY, limits.minY, limits.maxY);
		iconPositions.value[drag.id] = { x: nextX, y: nextY };
		return;
	}

	if (drag.kind === 'resize') {
		const windowId = drag.id as WindowId;
		const direction = drag.direction;
		const startWidth = drag.startWidth ?? windowSizes.value[windowId].width;
		const startHeight = drag.startHeight ?? windowSizes.value[windowId].height;
		const minSize = windowMinSize(windowId);
		const viewportLeft = 12;
		const viewportTop = 12;
		const viewportRight = window.innerWidth - 12;
		const viewportBottom = window.innerHeight - 40;
		const startLeft = drag.startX;
		const startTop = drag.startY;
		const startRight = startLeft + startWidth;
		const startBottom = startTop + startHeight;
		let nextLeft = startLeft;
		let nextTop = startTop;
		let nextRight = startRight;
		let nextBottom = startBottom;

		// Keep the opposite edge anchored for west/north resize handles.
		if (direction?.includes('w')) {
			nextLeft = clamp(startLeft + deltaX, viewportLeft, startRight - minSize.width);
		}

		if (direction?.includes('e')) {
			nextRight = clamp(startRight + deltaX, startLeft + minSize.width, viewportRight);
		}

		if (direction?.includes('n')) {
			nextTop = clamp(startTop + deltaY, viewportTop, startBottom - minSize.height);
		}

		if (direction?.includes('s')) {
			nextBottom = clamp(startBottom + deltaY, startTop + minSize.height, viewportBottom);
		}

		const nextWidth = clamp(nextRight - nextLeft, minSize.width, viewportRight - nextLeft);
		const nextHeight = clamp(nextBottom - nextTop, minSize.height, viewportBottom - nextTop);

		windowPositions.value[windowId].x = nextLeft;
		windowPositions.value[windowId].y = nextTop;
		windowSizes.value[windowId].width = nextWidth;
		windowSizes.value[windowId].height = nextHeight;
		return;
	}

	const windowId = drag.id as WindowId;
	const limits = windowBounds(windowId);
	const nextX = clamp(drag.startX + deltaX, limits.minX, limits.maxX);
	const nextY = clamp(drag.startY + deltaY, limits.minY, limits.maxY);
	windowPositions.value[windowId].x = nextX;
	windowPositions.value[windowId].y = nextY;
}

function releaseActiveDrag(event: PointerEvent) {
	const drag = activeDrag.value;
	if (!drag || drag.pointerId !== event.pointerId) return;

	if (drag.kind === 'icon' && drag.moved) {
		draggedIconIds.add(drag.id);
		window.setTimeout(() => {
			draggedIconIds.delete(drag.id);
		}, 0);
	}

	activeDrag.value = null;
}

function iconStyle(icon: DesktopIcon) {
	const position = iconPositions.value[icon.id] ?? { x: icon.x, y: icon.y };

	return {
		left: `${position.x}px`,
		top: `${position.y}px`
	};
}

function isWindowVisible(windowId: WindowId) {
	const state = windowState.value[windowId];
	return state.isOpen && !state.isMinimized;
}

function windowStyle(windowId: WindowId) {
	if (isCompactLayout.value) {
		return {};
	}

	const position = windowPositions.value[windowId];
	const state = windowState.value[windowId];
	if (state.isMaximized) {
		return {
			zIndex: position.z
		};
	}

	const size = getWindowSize(windowId);
	return {
		left: `${position.x}px`,
		top: `${position.y}px`,
		width: `${size.width}px`,
		height: `${size.height}px`,
		zIndex: position.z
	};
}

function isWindowMaximized(windowId: WindowId) {
	return windowState.value[windowId].isMaximized;
}

function canResizeWindow(windowId: WindowId) {
	if (isCompactLayout.value) return false;
	const state = windowState.value[windowId];
	return state.isOpen && !state.isMinimized && !state.isMaximized;
}

function windowLabel(windowId: WindowId) {
	if (windowId === 'browser') {
		return browserShellTitle.value;
	}

	const windowMeta = windowsMeta.find((entry) => entry.id === windowId);
	return windowMeta?.label ?? windowId;
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

function navigatorPlaceholderDocument(message: string, url: string, title = 'Netscape Navigator') {
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
	if (browserFallbackTimer !== null) {
		window.clearTimeout(browserFallbackTimer);
		browserFallbackTimer = null;
	}
}

function browserWindowTitleFromUrl(url: string) {
	try {
		const hostname = new URL(url).hostname;
		return hostname || browserShellTitle.value;
	} catch {
		return browserShellTitle.value;
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
		if (disposed || requestSerial !== browserRequestSerial) return;

		browserRenderMode.value = 'snapshot';
		browserCurrentUrl.value = payload.url;
		browserAddress.value = payload.url;
		browserDocument.value = payload.html;
		browserTitle.value = payload.title?.trim() || browserWindowTitleFromUrl(payload.url);
		browserError.value = '';
		browserLoading.value = false;

		const pushHistory = options.pushHistory ?? false;
		if (pushHistory) {
			replaceCurrentBrowserHistory(payload.url);
		} else if (browserHistory.value[browserHistoryIndex.value] !== payload.url) {
			replaceCurrentBrowserHistory(payload.url);
		}
	} catch (error) {
		if (disposed || requestSerial !== browserRequestSerial) return;
		const message =
			error instanceof Error ? error.message : 'Unable to load this page in navigator.';
		browserError.value = message;
		browserRenderMode.value = 'snapshot';
		browserDocument.value = navigatorPlaceholderDocument(
			backend === 'tor'
				? 'Tor Browser could not render this page.'
				: 'Navigator could not render this page.',
			url,
			backend === 'tor' ? 'Tor Browser' : 'Netscape Navigator'
		);
		browserLoading.value = false;
		pushStatus(
			backend === 'tor'
				? 'Tor Browser failed to load the requested page.'
				: 'Navigator failed to load the requested page.'
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

	const requestSerial = ++browserRequestSerial;
	clearBrowserFallbackTimer();

	browserLoading.value = true;
	browserError.value = '';
	browserCurrentUrl.value = normalized;
	browserAddress.value = normalized;
	browserTitle.value = browserWindowTitleFromUrl(normalized);
	browserRenderMode.value = 'direct';
	browserFrameSrc.value = normalized;
	browserDocument.value = navigatorPlaceholderDocument(
		'Rendering in compatibility mode...',
		normalized,
		backend === 'tor' ? 'Tor Browser' : 'Netscape Navigator'
	);

	restoreWindow('browser', false);
	startMenuOpen.value = false;
	focusWindow('browser');
	pushStatus(`${label ?? normalized} opened in ${browserShellTitle.value}.`);

	if (backend === 'tor') {
		browserRenderMode.value = 'snapshot';
		browserFrameSrc.value = 'about:blank';
		void loadBrowserSnapshot(requestSerial, normalized, backend, { pushHistory: false });
		return;
	}

	browserFallbackTimer = window.setTimeout(() => {
		if (disposed || requestSerial !== browserRequestSerial) return;
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

	const requestSerial = browserRequestSerial;
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
	const requestSerial = browserRequestSerial;
	void loadBrowserSnapshot(requestSerial, browserCurrentUrl.value, browserBackend.value, {
		pushHistory: false
	});
}

function forceBrowserCompatibilityMode() {
	const requestSerial = ++browserRequestSerial;
	clearBrowserFallbackTimer();
	browserLoading.value = true;
	browserError.value = '';
	void loadBrowserSnapshot(requestSerial, browserCurrentUrl.value, browserBackend.value, {
		pushHistory: false
	});
}

function stopBrowserLoading() {
	browserRequestSerial += 1;
	clearBrowserFallbackTimer();
	browserLoading.value = false;
	browserError.value = '';
	pushStatus(`${browserShellTitle.value} load stopped.`);
}

function focusBrowserAddress() {
	const input = browserAddressInputRef.value;
	if (!input) return;
	input.focus();
	input.select();
	pushStatus(`${browserShellTitle.value} location bar focused.`);
}

function navigateBrowserAddress() {
	openInBrowser(browserAddress.value, browserShellTitle.value, {
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

function resolveNoiseAudioContext() {
	const constructor =
		window.AudioContext ||
		(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!constructor) return null;

	if (!noiseAudioContext || noiseAudioContext.state === 'closed') {
		noiseAudioContext = new constructor();
	}

	return noiseAudioContext;
}

function buildNoiseBuffer(context: AudioContext, durationSeconds = 3) {
	const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
	const buffer = context.createBuffer(1, frameCount, context.sampleRate);
	const channel = buffer.getChannelData(0);
	for (let index = 0; index < channel.length; index += 1) {
		channel[index] = Math.random() * 2 - 1;
	}
	return buffer;
}

function applyNoisePresetToNodes() {
	if (!noiseAudioContext || !noiseHighpassNode || !noiseLowpassNode || !noiseGainNode) return;
	const preset = selectedNoisePreset.value;
	const now = noiseAudioContext.currentTime;
	const toneSmoothing = preset.source === 'purr' ? 0.012 : 0.03;
	const gainSmoothing = preset.source === 'purr' ? 0.015 : 0.04;
	const modSmoothing = preset.source === 'purr' ? 0.004 : 0.04;
	noiseHighpassNode.frequency.setTargetAtTime(preset.highpass, now, toneSmoothing);
	noiseLowpassNode.frequency.setTargetAtTime(preset.lowpass, now, toneSmoothing);

	const targetGain = Math.max(0.0001, Math.pow(noiseVolume.value / 100, 1.55) * preset.gain);
	noiseGainNode.gain.cancelScheduledValues(now);
	noiseGainNode.gain.setTargetAtTime(targetGain, now, gainSmoothing);

	if (noiseCarrierNode) {
		noiseCarrierNode.type = preset.carrierWave ?? 'sine';
		noiseCarrierNode.frequency.cancelScheduledValues(now);
		noiseCarrierNode.frequency.setTargetAtTime(preset.carrierHz ?? 50, now, toneSmoothing);
	}
	if (noiseHarmonicNode) {
		noiseHarmonicNode.type = preset.harmonicWave ?? 'sine';
		noiseHarmonicNode.frequency.cancelScheduledValues(now);
		noiseHarmonicNode.frequency.setTargetAtTime(preset.harmonicHz ?? 100, now, toneSmoothing);
	}
	if (noiseHarmonicGainNode) {
		noiseHarmonicGainNode.gain.cancelScheduledValues(now);
		noiseHarmonicGainNode.gain.setTargetAtTime(preset.harmonicMix ?? 0.35, now, toneSmoothing);
	}
	if (noisePurrFormantANode) {
		noisePurrFormantANode.frequency.cancelScheduledValues(now);
		noisePurrFormantANode.frequency.setTargetAtTime(preset.formantAHz ?? 118, now, toneSmoothing);
		noisePurrFormantANode.Q.cancelScheduledValues(now);
		noisePurrFormantANode.Q.setTargetAtTime(preset.formantQ ?? 1.45, now, toneSmoothing);
	}
	if (noisePurrFormantBNode) {
		noisePurrFormantBNode.frequency.cancelScheduledValues(now);
		noisePurrFormantBNode.frequency.setTargetAtTime(preset.formantBHz ?? 238, now, toneSmoothing);
		noisePurrFormantBNode.Q.cancelScheduledValues(now);
		noisePurrFormantBNode.Q.setTargetAtTime(preset.formantQ ?? 1.45, now, toneSmoothing);
	}
	if (noisePurrFormantAGainNode) {
		noisePurrFormantAGainNode.gain.cancelScheduledValues(now);
		noisePurrFormantAGainNode.gain.setTargetAtTime(preset.formantMixA ?? 0.68, now, toneSmoothing);
	}
	if (noisePurrFormantBGainNode) {
		noisePurrFormantBGainNode.gain.cancelScheduledValues(now);
		noisePurrFormantBGainNode.gain.setTargetAtTime(preset.formantMixB ?? 0.47, now, toneSmoothing);
	}
	if (noiseJitterOscNode) {
		noiseJitterOscNode.frequency.cancelScheduledValues(now);
		noiseJitterOscNode.frequency.setTargetAtTime(preset.jitterRateHz ?? 0.82, now, toneSmoothing);
	}
	if (noiseJitterCarrierGainNode) {
		noiseJitterCarrierGainNode.gain.cancelScheduledValues(now);
		noiseJitterCarrierGainNode.gain.setTargetAtTime(preset.jitterDepthHz ?? 1.6, now, toneSmoothing);
	}
	if (noiseJitterHarmonicGainNode) {
		noiseJitterHarmonicGainNode.gain.cancelScheduledValues(now);
		noiseJitterHarmonicGainNode.gain.setTargetAtTime(
			(preset.jitterDepthHz ?? 1.6) * 1.8,
			now,
			toneSmoothing
		);
	}

	if (noiseModOscNode && noiseModGainNode) {
		const baseModRate = Math.max(0.08, preset.modRateHz ?? 0.1);
		noiseModOscNode.type = preset.modWave ?? 'sine';
		noiseModOscNode.frequency.cancelScheduledValues(now);
		noiseModOscNode.frequency.setTargetAtTime(baseModRate, now, modSmoothing);

		if (noiseModRateLfoNode && noiseModRateLfoGainNode) {
			noiseModRateLfoNode.frequency.cancelScheduledValues(now);
			noiseModRateLfoNode.frequency.setTargetAtTime(
				preset.modRateDriftHz ?? 0.12,
				now,
				modSmoothing
			);
			const modRateDriftAmount = Math.max(
				0,
				Math.min(baseModRate * 0.85, preset.modRateDriftAmountHz ?? 0)
			);
			noiseModRateLfoGainNode.gain.cancelScheduledValues(now);
			noiseModRateLfoGainNode.gain.setTargetAtTime(
				modRateDriftAmount,
				now,
				modSmoothing
			);
		}

		const modulationDepth = Math.max(
			0,
			Math.min(targetGain * 0.92, targetGain * (preset.modDepth ?? 0))
		);
		noiseModGainNode.gain.cancelScheduledValues(now);
		noiseModGainNode.gain.setTargetAtTime(modulationDepth, now, modSmoothing);

		if (noiseModDepthLfoNode && noiseModDepthLfoGainNode) {
			noiseModDepthLfoNode.frequency.cancelScheduledValues(now);
			noiseModDepthLfoNode.frequency.setTargetAtTime(
				preset.modDepthDriftHz ?? 0.48,
				now,
				modSmoothing
			);
			const driftMix = Math.max(0, Math.min(0.49, preset.modDepthDriftMix ?? 0));
			noiseModDepthLfoGainNode.gain.cancelScheduledValues(now);
			noiseModDepthLfoGainNode.gain.setTargetAtTime(
				modulationDepth * driftMix,
				now,
				modSmoothing
			);
		}
	}
}

function destroyNoiseSource() {
	if (noiseSourceNode) {
		noiseSourceNode.onended = null;
		try {
			noiseSourceNode.stop();
		} catch {
			// Ignore stop errors if node already ended.
		}
		noiseSourceNode.disconnect();
		noiseSourceNode = null;
	}
	if (noiseCarrierNode) {
		try {
			noiseCarrierNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseCarrierNode.disconnect();
		noiseCarrierNode = null;
	}
	if (noiseHarmonicNode) {
		try {
			noiseHarmonicNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseHarmonicNode.disconnect();
		noiseHarmonicNode = null;
	}
	if (noiseHarmonicGainNode) {
		noiseHarmonicGainNode.disconnect();
		noiseHarmonicGainNode = null;
	}
	if (noiseJitterOscNode) {
		try {
			noiseJitterOscNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseJitterOscNode.disconnect();
		noiseJitterOscNode = null;
	}
	if (noiseJitterCarrierGainNode) {
		noiseJitterCarrierGainNode.disconnect();
		noiseJitterCarrierGainNode = null;
	}
	if (noiseJitterHarmonicGainNode) {
		noiseJitterHarmonicGainNode.disconnect();
		noiseJitterHarmonicGainNode = null;
	}
	if (noisePurrPreMixNode) {
		noisePurrPreMixNode.disconnect();
		noisePurrPreMixNode = null;
	}
	if (noisePurrFormantANode) {
		noisePurrFormantANode.disconnect();
		noisePurrFormantANode = null;
	}
	if (noisePurrFormantBNode) {
		noisePurrFormantBNode.disconnect();
		noisePurrFormantBNode = null;
	}
	if (noisePurrFormantAGainNode) {
		noisePurrFormantAGainNode.disconnect();
		noisePurrFormantAGainNode = null;
	}
	if (noisePurrFormantBGainNode) {
		noisePurrFormantBGainNode.disconnect();
		noisePurrFormantBGainNode = null;
	}

	if (noiseModOscNode) {
		try {
			noiseModOscNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseModOscNode.disconnect();
		noiseModOscNode = null;
	}
	if (noiseModRateLfoNode) {
		try {
			noiseModRateLfoNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseModRateLfoNode.disconnect();
		noiseModRateLfoNode = null;
	}
	if (noiseModRateLfoGainNode) {
		noiseModRateLfoGainNode.disconnect();
		noiseModRateLfoGainNode = null;
	}
	if (noiseModDepthLfoNode) {
		try {
			noiseModDepthLfoNode.stop();
		} catch {
			// Ignore stop errors if oscillator already ended.
		}
		noiseModDepthLfoNode.disconnect();
		noiseModDepthLfoNode = null;
	}
	if (noiseModDepthLfoGainNode) {
		noiseModDepthLfoGainNode.disconnect();
		noiseModDepthLfoGainNode = null;
	}
	if (noiseModGainNode) {
		noiseModGainNode.disconnect();
		noiseModGainNode = null;
	}

	if (noiseGainNode) {
		noiseGainNode.disconnect();
		noiseGainNode = null;
	}
	if (noiseLowpassNode) {
		noiseLowpassNode.disconnect();
		noiseLowpassNode = null;
	}
	if (noiseHighpassNode) {
		noiseHighpassNode.disconnect();
		noiseHighpassNode = null;
	}
}

async function startNoiseGenerator(announce = true) {
	const context = resolveNoiseAudioContext();
	if (!context) {
		noiseError.value = 'Web Audio is unavailable in this browser.';
		return;
	}

	if (context.state === 'suspended') {
		await context.resume().catch(() => undefined);
	}

	destroyNoiseSource();

	const preset = selectedNoisePreset.value;
	const source = context.createBufferSource();
	const highpass = context.createBiquadFilter();
	highpass.type = 'highpass';
	const lowpass = context.createBiquadFilter();
	lowpass.type = 'lowpass';
	const gain = context.createGain();
	const modOsc = context.createOscillator();
	const modGain = context.createGain();
	const modRateLfo = context.createOscillator();
	const modRateLfoGain = context.createGain();
	const modDepthLfo = context.createOscillator();
	const modDepthLfoGain = context.createGain();

	modOsc.type = 'sine';
	modOsc.frequency.value = 0.1;
	modGain.gain.value = 0;
	modRateLfo.type = 'sine';
	modRateLfo.frequency.value = 0.12;
	modRateLfoGain.gain.value = 0;
	modDepthLfo.type = 'sine';
	modDepthLfo.frequency.value = 0.48;
	modDepthLfoGain.gain.value = 0;

	if (preset.source === 'purr') {
		const carrier = context.createOscillator();
		carrier.type = preset.carrierWave ?? 'sawtooth';
		carrier.frequency.value = preset.carrierHz ?? 50;

		const harmonic = context.createOscillator();
		harmonic.type = preset.harmonicWave ?? 'triangle';
		harmonic.frequency.value = preset.harmonicHz ?? 100;

		const harmonicGain = context.createGain();
		harmonicGain.gain.value = preset.harmonicMix ?? 0.35;

		const preMix = context.createGain();
		preMix.gain.value = 1;
		const formantA = context.createBiquadFilter();
		formantA.type = 'bandpass';
		formantA.frequency.value = preset.formantAHz ?? 118;
		formantA.Q.value = preset.formantQ ?? 1.45;
		const formantB = context.createBiquadFilter();
		formantB.type = 'bandpass';
		formantB.frequency.value = preset.formantBHz ?? 238;
		formantB.Q.value = preset.formantQ ?? 1.45;
		const formantAGain = context.createGain();
		formantAGain.gain.value = preset.formantMixA ?? 0.68;
		const formantBGain = context.createGain();
		formantBGain.gain.value = preset.formantMixB ?? 0.47;

		carrier.connect(preMix);
		harmonic.connect(harmonicGain);
		harmonicGain.connect(preMix);
		preMix.connect(formantA);
		preMix.connect(formantB);
		formantA.connect(formantAGain);
		formantB.connect(formantBGain);
		formantAGain.connect(highpass);
		formantBGain.connect(highpass);

		const jitterOsc = context.createOscillator();
		jitterOsc.type = 'sine';
		jitterOsc.frequency.value = preset.jitterRateHz ?? 0.82;
		const jitterCarrierGain = context.createGain();
		jitterCarrierGain.gain.value = preset.jitterDepthHz ?? 1.6;
		const jitterHarmonicGain = context.createGain();
		jitterHarmonicGain.gain.value = (preset.jitterDepthHz ?? 1.6) * 1.8;
		jitterOsc.connect(jitterCarrierGain);
		jitterOsc.connect(jitterHarmonicGain);
		jitterCarrierGain.connect(carrier.frequency);
		jitterHarmonicGain.connect(harmonic.frequency);

		noiseCarrierNode = carrier;
		noiseHarmonicNode = harmonic;
		noiseHarmonicGainNode = harmonicGain;
		noisePurrPreMixNode = preMix;
		noisePurrFormantANode = formantA;
		noisePurrFormantBNode = formantB;
		noisePurrFormantAGainNode = formantAGain;
		noisePurrFormantBGainNode = formantBGain;
		noiseJitterOscNode = jitterOsc;
		noiseJitterCarrierGainNode = jitterCarrierGain;
		noiseJitterHarmonicGainNode = jitterHarmonicGain;
	} else {
		source.buffer = buildNoiseBuffer(context, 3);
		source.loop = true;
		source.connect(highpass);
	}

	highpass.connect(lowpass);
	lowpass.connect(gain);
	modRateLfo.connect(modRateLfoGain);
	modRateLfoGain.connect(modOsc.frequency);
	modOsc.connect(modGain);
	modDepthLfo.connect(modDepthLfoGain);
	modDepthLfoGain.connect(modGain.gain);
	modGain.connect(gain.gain);
	gain.connect(context.destination);

	noiseSourceNode = preset.source === 'noise' ? source : null;
	noiseHighpassNode = highpass;
	noiseLowpassNode = lowpass;
	noiseGainNode = gain;
	noiseModOscNode = modOsc;
	noiseModGainNode = modGain;
	noiseModRateLfoNode = modRateLfo;
	noiseModRateLfoGainNode = modRateLfoGain;
	noiseModDepthLfoNode = modDepthLfo;
	noiseModDepthLfoGainNode = modDepthLfoGain;
	applyNoisePresetToNodes();
	try {
		modRateLfo.start();
		modDepthLfo.start();
		modOsc.start();
		if (preset.source === 'purr') {
			noiseCarrierNode?.start();
			noiseHarmonicNode?.start();
			noiseJitterOscNode?.start();
		} else {
			source.start();
		}
	} catch {
		destroyNoiseSource();
		noiseIsPlaying.value = false;
		noiseError.value = 'Unable to start audio output.';
		return;
	}

	if (preset.source === 'noise') {
		source.onended = () => {
			if (noiseSourceNode === source) {
				noiseSourceNode = null;
				noiseIsPlaying.value = false;
			}
		};
	}

	noiseIsPlaying.value = true;
	noiseError.value = '';
	if (announce) {
		pushStatus(`${selectedNoisePreset.value.label} noise started.`);
	}
}

function stopNoiseGenerator(announce = true) {
	destroyNoiseSource();
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
	applyNoisePresetToNodes();
}

function selectNoisePreset(nextPreset: NoisePresetId) {
	const previousPreset = selectedNoisePreset.value;
	noisePresetId.value = nextPreset;
	if (noiseIsPlaying.value) {
		const sourceChanged = previousPreset.source !== selectedNoisePreset.value.source;
		if (sourceChanged) {
			void startNoiseGenerator(false);
		} else {
			applyNoisePresetToNodes();
		}
		pushStatus(`${selectedNoisePreset.value.label} preset selected.`);
		return;
	}
	applyNoisePresetToNodes();
}

function cycleNoisePreset(direction: -1 | 1) {
	const currentIndex = noisePresets.findIndex((preset) => preset.id === noisePresetId.value);
	const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
	const nextIndex =
		(safeCurrent + direction + noisePresets.length) % noisePresets.length;
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
		(engine) => engine.id === browserSearchEngine.value
	);

	openInBrowser(targetUrl, selectedEngine?.label ?? browserNetSearchLabel.value, {
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

function openNetscapeBrowser(url = browserHomeUrl, label = 'Netscape Navigator') {
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
	if (!canBrowserGoBack.value) return;
	browserHistoryIndex.value -= 1;
	openInBrowser(browserHistory.value[browserHistoryIndex.value], 'Back', { pushHistory: false });
}

function goBrowserForward() {
	if (!canBrowserGoForward.value) return;
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
		if (!data || data.type !== 'navigator:navigate' || typeof data.href !== 'string') return;

		openInBrowser(data.href, data.href);
		return;
	}

	const vlcFrameWindow = vlcFrameRef.value?.contentWindow;
	if (vlcFrameWindow && event.source === vlcFrameWindow) {
		handleVlcFrameMessage(event.data);
	}
}

function minimizeWindow(windowId: WindowId) {
	const state = windowState.value[windowId];
	if (!state.isOpen || state.isMinimized) return;

	state.isMinimized = true;
	pushStatus(`${windowLabel(windowId)} minimized.`);
}

function toggleMaximizeWindow(windowId: WindowId) {
	if (isCompactLayout.value) return;

	const state = windowState.value[windowId];
	if (!state.isOpen) return;

	if (state.isMinimized) {
		state.isMinimized = false;
	}

	state.isMaximized = !state.isMaximized;
	focusWindow(windowId);
	pushStatus(
		state.isMaximized
			? `${windowLabel(windowId)} maximized.`
			: `${windowLabel(windowId)} restored.`
	);
	normalizeDesktopLayout();
}

function closeWindow(windowId: WindowId) {
	const state = windowState.value[windowId];
	if (!state.isOpen) return;

	if (windowId === 'otaclock') {
		stopOtaClockAlarm(false);
		otaClockConfigOpen.value = false;
	}
	if (windowId === 'noise') {
		stopNoiseGenerator(false);
	}

	state.isOpen = false;
	state.isMinimized = false;
	state.isMaximized = false;
	pushStatus(`${windowLabel(windowId)} closed.`);
}

function restoreWindow(windowId: WindowId, announce = true) {
	const state = windowState.value[windowId];
	state.isOpen = true;
	state.isMinimized = false;
	focusWindow(windowId);
	if (announce) {
		pushStatus(`${windowLabel(windowId)} restored.`);
	}
}

function openWindowFromMenu(windowId: WindowId) {
	startMenuOpen.value = false;
	restoreWindow(windowId, false);
	pushStatus(`${windowLabel(windowId)} opened.`);
}

function toggleWindowFromTaskbar(windowId: WindowId) {
	const state = windowState.value[windowId];

	if (!state.isOpen) {
		restoreWindow(windowId);
		return;
	}

	if (state.isMinimized) {
		state.isMinimized = false;
		focusWindow(windowId);
		pushStatus(`${windowLabel(windowId)} restored.`);
		return;
	}

	const highestZ = Math.max(
		...(
			Object.keys(windowPositions.value) as WindowId[]
		)
			.filter((id) => isWindowVisible(id))
			.map((id) => windowPositions.value[id].z)
	);
	const isFocused = windowPositions.value[windowId].z >= highestZ;

	if (isFocused) {
		minimizeWindow(windowId);
		return;
	}

	focusWindow(windowId);
}

function isTaskbarWindowActive(windowId: WindowId) {
	if (!isWindowVisible(windowId)) return false;

	const highestZ = Math.max(
		...(
			Object.keys(windowPositions.value) as WindowId[]
		)
			.filter((id) => isWindowVisible(id))
			.map((id) => windowPositions.value[id].z)
	);

	return windowPositions.value[windowId].z >= highestZ;
}

function openShellShortcut(shortcut: ShellShortcut) {
	if (shortcut.windowId === 'vlc') {
		openVlcWindow();
		return;
	}

	if (shortcut.windowId === 'noise') {
		openNoiseWindow();
		return;
	}

	if (shortcut.windowId === 'otaclock') {
		openOtaClockWindow();
		return;
	}

	if (shortcut.windowId) {
		openWindowFromMenu(shortcut.windowId);
		return;
	}

	if (shortcut.recycle) {
		restoreWindow('recycle', false);
		pushStatus('Recycle Bin opened.');
		return;
	}

	if (shortcut.tab) {
		setTab(shortcut.tab);
		return;
	}

	if (shortcut.tor) {
		openTorBrowser(shortcut.href ?? torBrowserHomeUrl, shortcut.label);
		return;
	}

	if (shortcut.href) {
		openNetscapeBrowser(shortcut.href, shortcut.label);
	}
}

function handleDesktopIconClick(icon: DesktopIcon, event: MouseEvent) {
	if (draggedIconIds.has(icon.id)) {
		event.preventDefault();
		draggedIconIds.delete(icon.id);
		return;
	}

	event.preventDefault();
	openShellShortcut(icon);
}

function handleDesktopIconContextAction(icon: DesktopIcon) {
	openShellShortcut(icon);
}

function handleRecycleShortcutClick(shortcut: ShellShortcut, event: MouseEvent) {
	event.preventDefault();
	openShellShortcut(shortcut);
}

function minimizeAllWindows() {
	for (const windowId of Object.keys(windowState.value) as WindowId[]) {
		if (windowState.value[windowId].isOpen) {
			windowState.value[windowId].isMinimized = true;
		}
	}

	pushStatus('All windows minimized.');
}

function resetDesktopIcons() {
	iconPositions.value = {};
	normalizeDesktopLayout();
	pushStatus('Desktop icons arranged.');
}

function resolveContextTarget(rawTarget: EventTarget | null): ContextTarget {
	if (!(rawTarget instanceof Element)) {
		return { type: 'desktop' };
	}
	const target = rawTarget as HTMLElement;

	if (target.closest('#start-menu')) {
		return { type: 'start' };
	}

	if (target.closest('.start-button')) {
		return { type: 'start' };
	}

	const taskbarWindow = target.closest('[data-taskbar-window-id]') as HTMLElement | null;
	if (taskbarWindow?.dataset.taskbarWindowId) {
		return { type: 'taskbar', id: taskbarWindow.dataset.taskbarWindowId };
	}

	const icon = target.closest('[data-icon-id]') as HTMLElement | null;
	if (icon?.dataset.iconId) {
		return { type: 'icon', id: icon.dataset.iconId };
	}

	const windowElement = target.closest('[data-window-id]') as HTMLElement | null;
	if (windowElement?.dataset.windowId) {
		return { type: 'window', id: windowElement.dataset.windowId };
	}

	return { type: 'desktop' };
}

function closeContextMenu() {
	contextMenuVisible.value = false;
}

async function openContextMenu(event: MouseEvent) {
	if (splashVisible.value || powerState.value !== 'idle') return;

	event.preventDefault();
	contextTarget.value = resolveContextTarget(event.target);
	startMenuOpen.value = false;
	contextMenuVisible.value = true;
	contextMenuX.value = event.clientX;
	contextMenuY.value = event.clientY;

	await nextTick();
	const menuElement = contextMenuRef.value;
	if (!menuElement) return;

	const gutter = 8;
	const maxX = Math.max(gutter, window.innerWidth - menuElement.offsetWidth - gutter);
	const maxY = Math.max(gutter, window.innerHeight - menuElement.offsetHeight - gutter);
	contextMenuX.value = clamp(event.clientX, gutter, maxX);
	contextMenuY.value = clamp(event.clientY, gutter, maxY);
}

function invokeContextMenuItem(item: ContextMenuItem) {
	if (item.separator || item.disabled) return;
	item.action();
	closeContextMenu();
}

function handleProjectOpen(project: PortfolioProject, event: MouseEvent) {
	if (project.link === '#') {
		event.preventDefault();
		pushStatus(`${project.title} link is private.`);
		return;
	}

	event.preventDefault();
	openInBrowser(project.link, project.title);
}

function toggleStartMenu() {
	closeContextMenu();
	startMenuOpen.value = !startMenuOpen.value;
}

function closeStartMenuOnOutsideClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	if (!target?.closest('.start-button')) {
		startMenuOpen.value = false;
	}

	if (!target?.closest('.xp-context-menu')) {
		closeContextMenu();
	}
}

function closeMenusOnEscape(event: KeyboardEvent) {
	if (event.key !== 'Escape') return;
	startMenuOpen.value = false;
	closeContextMenu();
}

function runSoftAction(name: string) {
	startMenuOpen.value = false;
	pushStatus(name);
}

function selectLoginUser(role: AuthSessionRole) {
	selectedLoginUser.value = role;
	loginError.value = '';
	if (role === 'guest') {
		adminLoginPassword.value = '';
		return;
	}

	void nextTick(() => {
		const adminPasswordInput = document.getElementById('xp-login-password') as
			| HTMLInputElement
			| null;
		adminPasswordInput?.focus();
	});
}

function resetSessionState() {
	activeDrag.value = null;
	draggedIconIds.clear();
	activeTab.value = 'about';
	startMenuOpen.value = false;
	closeContextMenu();
	clearBrowserFallbackTimer();
	stopOtaClockAlarm(false);
	stopNoiseGenerator(false);
	selectedLoginUser.value = 'guest';
	adminLoginPassword.value = '';
	loginSubmitting.value = false;
	loginError.value = '';
	sessionRole.value = 'guest';
	statusMessage.value = 'desktop ready.';
	browserRequestSerial += 1;
	browserLoading.value = false;
	browserError.value = '';
	browserBackend.value = 'standard';
	browserSkin.value = 'netscape';
	browserTitle.value = 'Netscape Navigator';
	browserCurrentUrl.value = browserHomeUrl;
	browserAddress.value = browserHomeUrl;
	browserFrameSrc.value = browserHomeUrl;
	browserRenderMode.value = 'snapshot';
	browserDocument.value = navigatorPlaceholderDocument('Type a URL and press Go.', browserHomeUrl);
	browserHistory.value = [browserHomeUrl];
	browserHistoryIndex.value = 0;
	browserSearchMenuOpen.value = false;
	browserSearchQuery.value = '';
	browserSearchEngine.value = 'duckduckgo';
	vlcPlaylistInput.value = vlcDefaultPlaylistUrl;
	vlcPlaylistId.value = vlcDefaultPlaylistId;
	vlcError.value = '';
	vlcVolume.value = 72;
	vlcMuted.value = false;
	vlcHideYoutubeControls.value = true;
	vlcSourcePanelOpen.value = false;
	vlcCurrentSeconds.value = 0;
	vlcDurationSeconds.value = 0;
	noisePresetId.value = 'brown-drift';
	noiseVolume.value = 42;
	noiseIsPlaying.value = false;
	noiseError.value = '';
	otaClockUse24Hour.value = true;
	otaClockAlarmEnabled.value = false;
	otaClockAlarmSound.value = 'LAUGH';
	otaClockAlarmDuration.value = 10;
	otaClockAlarmTimesInput.value = '12:00:00\n18:00:00';
	otaClockAlwaysOnTop.value = false;
	otaClockLockPosition.value = false;
	otaClockScale.value = 1;
	otaClockConfigOpen.value = false;
	blogPosts.value = [];
	selectedBlogPostId.value = null;
	blogLoading.value = false;
	blogError.value = '';
	blogComposerTitle.value = '';
	blogComposerExcerpt.value = '';
	blogComposerContent.value = '';
	blogComposerPublished.value = true;
	blogComposerSaving.value = false;
	blogComposerError.value = '';
	blogEditingPostId.value = null;
	blogDeletingPostId.value = null;
	stopOtaClockAlarm(false);
	windowState.value = createDefaultWindowState();
	windowPositions.value = createDefaultWindowPositions();
	windowSizes.value = createDefaultWindowSizes();
	zCounter = 13;
	normalizeDesktopLayout();
}

function playShutdownSound() {
	const AudioContextConstructor =
		window.AudioContext ||
		(window as Window & { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!AudioContextConstructor) return;

	try {
		const context = new AudioContextConstructor();
		const masterGain = context.createGain();
		masterGain.connect(context.destination);
		masterGain.gain.setValueAtTime(0.0001, context.currentTime);

		const now = context.currentTime + 0.03;
		void context.resume().catch(() => undefined);
		masterGain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
		masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

		const tones = [
			{ frequency: 587, start: 0, duration: 0.24 },
			{ frequency: 523, start: 0.22, duration: 0.31 },
			{ frequency: 392, start: 0.5, duration: 0.47 }
		];

		for (const tone of tones) {
			const oscillator = context.createOscillator();
			oscillator.type = 'triangle';
			oscillator.frequency.setValueAtTime(tone.frequency, now + tone.start);
			oscillator.connect(masterGain);
			oscillator.start(now + tone.start);
			oscillator.stop(now + tone.start + tone.duration);
		}

		window.setTimeout(() => {
			void context.close();
		}, 1400);
	} catch {
		// Ignore when audio is unavailable.
	}
}

async function performLogoff() {
	if (powerState.value !== 'idle') return;

	startMenuOpen.value = false;
	pushStatus('Logging off...');
	try {
		await $fetch('/api/auth/logout', { method: 'POST' });
	} catch {
		// Ignore logout transport failures and continue local reset.
	}
	powerState.value = 'loggingOff';
	playShutdownSound();
	await pause(1000);
	if (disposed) return;

	powerState.value = 'shuttingDown';
	await pause(1200);
	if (disposed) return;

	powerState.value = 'idle';
	splashMode.value = 'login';
	splashVisible.value = true;
	resetSessionState();
}

async function runStartupSequence() {
	splashMode.value = 'startup';

	await pause(1800);
	if (disposed) return;
	splashMode.value = 'login';
	selectLoginUser('guest');
}

async function continueToDesktop() {
	if (loginSubmitting.value) return;

	loginSubmitting.value = true;
	loginError.value = '';
	try {
		const payload = await $fetch<{ role: AuthSessionRole }>('/api/auth/login', {
			method: 'POST',
			body: {
				user: selectedLoginUser.value,
				password: selectedLoginUser.value === 'admin' ? adminLoginPassword.value : ''
			}
		});

		sessionRole.value = payload.role;
		adminLoginPassword.value = '';
		splashVisible.value = false;
		await loadBlogPosts();
		pushStatus(payload.role === 'admin' ? 'signed in as admin.' : 'signed in as guest.');
	} catch (error) {
		loginError.value = readApiErrorMessage(
			error,
			selectedLoginUser.value === 'admin'
				? 'Admin login failed.'
				: 'Unable to sign in as guest right now.'
		);
	} finally {
		loginSubmitting.value = false;
	}
}

function handleWindowResize() {
	normalizeDesktopLayout();
	closeContextMenu();
}

watch(activeThemeId, (themeId, previousThemeId) => {
	if (themeId === previousThemeId) return;
	void loadThemeBlinkies(themeId);
});

watch(otaClockAlwaysOnTop, (enabled) => {
	if (!enabled || !isWindowVisible('otaclock')) return;
	focusWindow('otaclock');
});

onMounted(() => {
	document.title = 'Okami Portfolio';
	vlcEmbedOrigin.value = window.location.origin;
	try {
		const savedTheme = localStorage.getItem(themeStorageKey);
		if (savedTheme && isThemeId(savedTheme)) {
			activeThemeId.value = savedTheme;
		} else {
			localStorage.setItem(themeStorageKey, activeThemeId.value);
		}
	} catch {
		// Ignore storage failures in restricted environments.
	}
	void loadThemeBlinkies(activeThemeId.value);
	void refreshAuthSession();
	incrementVisitorCount();
	normalizeDesktopLayout();
	updateClocks();
	clockTimer = window.setInterval(updateClocks, 1000);
	document.addEventListener('click', closeStartMenuOnOutsideClick);
	document.addEventListener('keydown', closeMenusOnEscape);
	window.addEventListener('resize', handleWindowResize);
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', releaseActiveDrag);
	window.addEventListener('pointercancel', releaseActiveDrag);
	window.addEventListener('message', handleBrowserWindowMessage);
	void runStartupSequence();
});

onBeforeUnmount(() => {
	disposed = true;

	if (statusTimer !== null) {
		window.clearTimeout(statusTimer);
	}

	if (clockTimer !== null) {
		window.clearInterval(clockTimer);
	}

	clearBrowserFallbackTimer();
	browserRequestSerial += 1;
	blinkieRequestSerial += 1;
	stopNoiseGenerator(false);
	if (noiseAudioContext) {
		void noiseAudioContext.close().catch(() => undefined);
		noiseAudioContext = null;
	}

	document.removeEventListener('click', closeStartMenuOnOutsideClick);
	document.removeEventListener('keydown', closeMenusOnEscape);
	window.removeEventListener('resize', handleWindowResize);
	window.removeEventListener('pointermove', handlePointerMove);
	window.removeEventListener('pointerup', releaseActiveDrag);
	window.removeEventListener('pointercancel', releaseActiveDrag);
	window.removeEventListener('message', handleBrowserWindowMessage);
});
</script>

<template>
	<div class="xp-shell" :data-theme="activeThemeId" @contextmenu.prevent="openContextMenu">
		<div
			v-if="splashVisible"
			id="splash-screen"
			class="splash-screen"
			:class="`splash-screen-${splashMode}`"
		>
			<div v-if="splashMode === 'startup'" class="xp-startup-screen">
				<div class="xp-startup-content">
					<div class="power-brand" aria-hidden="true">
						<div class="power-flag">
							<span class="pane pane-red"></span>
							<span class="pane pane-green"></span>
							<span class="pane pane-blue"></span>
							<span class="pane pane-yellow"></span>
						</div>
						<div class="power-wordmark">
							<span class="power-word-windows">Windows</span>
							<span class="power-word-xp">XP</span>
						</div>
					</div>
					<p class="xp-startup-caption">Microsoft Windows XP</p>
					<div class="xp-startup-loader" aria-hidden="true">
						<div class="xp-startup-loader-track">
							<span class="xp-startup-loader-box xp-startup-loader-box-1"></span>
							<span class="xp-startup-loader-box xp-startup-loader-box-2"></span>
							<span class="xp-startup-loader-box xp-startup-loader-box-3"></span>
						</div>
					</div>
				</div>
			</div>
			<div v-else class="xp-login-screen">
				<div class="xp-login-topbar"></div>
				<div class="xp-login-main">
					<div class="xp-login-panel">
						<div class="xp-login-left">
							<img class="xp-login-brand-logo" src="/windows-xp-logo.png" alt="Windows XP" />
							<p class="xp-login-prompt">To begin, click your user name</p>
						</div>
						<div class="xp-login-divider"></div>
						<div class="xp-login-user">
							<div class="xp-login-user-list">
								<div class="xp-login-user-entry" :class="{ active: selectedLoginUser === 'guest' }">
									<button
										class="xp-login-user-choice"
										@click="selectLoginUser('guest')"
									>
										<div class="xp-login-avatar xp-login-avatar-guest" aria-hidden="true"></div>
										<div class="xp-login-user-choice-copy">
											<p class="xp-login-user-choice-name">Guest</p>
											<p class="xp-login-user-choice-meta">Quick sign in</p>
										</div>
									</button>
									<div v-if="selectedLoginUser === 'guest'" class="xp-login-password-panel">
										<p class="xp-login-password-label">Password</p>
										<div class="xp-login-password-row">
											<input
												id="xp-login-password"
												type="password"
												:value="guestLoginPasswordSeed"
												readonly
												autocomplete="off"
												class="xp-login-guest-field"
											/>
											<span class="xp-login-language">EN</span>
											<button
												id="enter-button"
												class="xp-login-arrow"
												:disabled="loginSubmitting"
												@click="continueToDesktop"
											>
												{{ loginSubmitting ? '…' : '➜' }}
											</button>
											<button class="xp-login-help-btn" type="button" aria-label="Help">?</button>
										</div>
										<p v-if="loginError" class="xp-login-error">{{ loginError }}</p>
									</div>
								</div>
								<div class="xp-login-user-entry" :class="{ active: selectedLoginUser === 'admin' }">
									<button
										class="xp-login-user-choice"
										@click="selectLoginUser('admin')"
									>
										<div class="xp-login-avatar xp-login-avatar-admin" aria-hidden="true"></div>
										<div class="xp-login-user-choice-copy">
											<p class="xp-login-user-choice-name">Admin</p>
											<p class="xp-login-user-choice-meta">Password required</p>
										</div>
									</button>
									<div v-if="selectedLoginUser === 'admin'" class="xp-login-password-panel">
										<p class="xp-login-password-label">Password</p>
										<div class="xp-login-password-row">
											<input
												id="xp-login-password"
												v-model="adminLoginPassword"
												type="password"
												autocomplete="off"
												placeholder="Admin password"
												@keydown.enter.prevent="continueToDesktop"
											/>
											<span class="xp-login-language">EN</span>
											<button
												id="enter-button"
												class="xp-login-arrow"
												:disabled="loginSubmitting || !adminLoginPassword.trim()"
												@click="continueToDesktop"
											>
												{{ loginSubmitting ? '…' : '➜' }}
											</button>
											<button class="xp-login-help-btn" type="button" aria-label="Help">?</button>
										</div>
										<p v-if="loginError" class="xp-login-error">{{ loginError }}</p>
									</div>
								</div>
							</div>
							<div class="xp-login-hint">
								<p class="xp-login-hint-title">
									{{ selectedLoginUser === 'admin' ? 'Admin access' : 'Guest access' }}
								</p>
								<p v-if="selectedLoginUser === 'admin'">
									Admin password is validated on the backend.
								</p>
								<p v-else>Guest is a non-persistent local session.</p>
								<p>Use the arrow button to continue.</p>
							</div>
						</div>
					</div>
				</div>
				<div class="xp-login-bottom">
					<span class="xp-login-power">Turn off computer</span>
					<span class="xp-login-help">After you log on, you can add or change accounts.</span>
				</div>
			</div>
		</div>

		<div
			v-if="powerState !== 'idle'"
			class="power-screen"
			:class="`power-screen-${powerState}`"
		>
			<div class="power-content">
				<div class="power-brand" aria-hidden="true">
					<div class="power-flag">
						<span class="pane pane-red"></span>
						<span class="pane pane-green"></span>
						<span class="pane pane-blue"></span>
						<span class="pane pane-yellow"></span>
					</div>
					<div class="power-wordmark">
						<span class="power-word-windows">Windows</span>
						<span class="power-word-xp">XP</span>
					</div>
				</div>
				<p class="power-primary">{{ powerPrimaryText }}</p>
			</div>
			<div class="power-footer"></div>
		</div>

		<div class="desktop-icons">
			<a
				v-for="icon in desktopIcons"
				:key="icon.label"
				:href="icon.href ?? '#'"
				class="desktop-icon"
				:data-icon-id="icon.id"
				:style="iconStyle(icon)"
				draggable="false"
				@dragstart.prevent
				@pointerdown.prevent="startIconDrag(icon, $event)"
				@click="handleDesktopIconClick(icon, $event)"
			>
				<img
					:src="icon.icon"
					:alt="icon.label"
					width="32"
					height="32"
					draggable="false"
					@dragstart.prevent
				/>
				<p>{{ icon.label }}</p>
			</a>
		</div>

		<div class="contain">
			<div class="containrow containrow-links">
					<Transition name="xp-window">
						<div
							v-if="isWindowVisible('links')"
							ref="linksWindowRef"
							class="window side-window draggable-window"
							data-window-id="links"
							:class="{ 'window-maximized': isWindowMaximized('links') }"
							:style="windowStyle('links')"
							@pointerdown="focusWindow('links')"
						>
						<div
							class="title-bar drag-handle"
							@pointerdown.stop="startWindowDrag('links', $event)"
							>
								<div class="title-bar-text">Links</div>
								<div class="title-bar-controls">
									<button aria-label="Minimize" @click.stop="minimizeWindow('links')"></button>
									<button
										:aria-label="isWindowMaximized('links') ? 'Restore' : 'Maximize'"
										@click.stop="toggleMaximizeWindow('links')"
									></button>
									<button aria-label="Close" @click.stop="closeWindow('links')"></button>
								</div>
							</div>
							<div class="window-body links-window-body">
							<template v-for="group in linkGroups" :key="group.title">
								<span class="group-title">{{ group.title }}</span>
								<br />
								<template v-for="link in group.links" :key="link.href">
									<span class="link-prefix">[-]</span>
									<a
										:href="link.href"
										@click.prevent="openInBrowser(link.href, link.label)"
									>
										{{ link.label }}
									</a>
									<br />
									</template>
								</template>
							</div>
							<div
								v-for="direction in resizeDirections"
								v-if="canResizeWindow('links')"
								:key="`links-${direction}`"
								class="window-resize-handle"
								:class="`handle-${direction}`"
								@pointerdown="startWindowResize('links', direction, $event)"
							></div>
						</div>
					</Transition>

					<Transition name="xp-window">
						<div
							v-if="isWindowVisible('clock')"
							ref="clockWindowRef"
							class="window side-window draggable-window"
							data-window-id="clock"
							:class="{ 'window-maximized': isWindowMaximized('clock') }"
							:style="windowStyle('clock')"
							@pointerdown="focusWindow('clock')"
						>
						<div
							class="title-bar drag-handle"
							@pointerdown.stop="startWindowDrag('clock', $event)"
							>
								<div class="title-bar-text">timedatectl.d</div>
								<div class="title-bar-controls">
									<button aria-label="Minimize" @click.stop="minimizeWindow('clock')"></button>
									<button
										:aria-label="isWindowMaximized('clock') ? 'Restore' : 'Maximize'"
										@click.stop="toggleMaximizeWindow('clock')"
									></button>
									<button aria-label="Close" @click.stop="closeWindow('clock')"></button>
								</div>
							</div>
							<div class="window-body small-window-body">
							<p>
								<img
									:src="shellIcons.globe"
									width="12"
									height="12"
									alt="clock icon"
								/>
								<span> {{ liveClock }}</span>
							</p>
							<p>
								system status:
									<span id="online">{{ onlineStatus }}</span>
								</p>
							</div>
							<div
								v-for="direction in resizeDirections"
								v-if="canResizeWindow('clock')"
								:key="`clock-${direction}`"
								class="window-resize-handle"
								:class="`handle-${direction}`"
								@pointerdown="startWindowResize('clock', direction, $event)"
							></div>
						</div>
					</Transition>
			</div>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('browser')"
					ref="browserWindowRef"
					class="window browser-window draggable-window"
					data-window-id="browser"
					:class="{ 'window-maximized': isWindowMaximized('browser') }"
					:style="windowStyle('browser')"
					@pointerdown="focusWindow('browser')"
				>
						<div
							class="title-bar drag-handle"
							@pointerdown.stop="startWindowDrag('browser', $event)"
						>
						<div class="title-bar-text">
							<img
								:src="browserShellIcon"
								width="14"
								height="14"
								alt="navigator icon"
							/>
							{{ browserShellTitle }} - {{ browserTitle }}
							</div>
							<div class="title-bar-controls">
								<button aria-label="Minimize" @click.stop="minimizeWindow('browser')"></button>
								<button
								:aria-label="isWindowMaximized('browser') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('browser')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('browser')"></button>
						</div>
						</div>
					<div
						class="window-body browser-window-body netscape-shell"
						:class="{ 'tor-browser-skin': browserSkin === 'tor' }"
					>
						<div class="netscape-menu-row" role="menubar" aria-label="Netscape menu">
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">F</span>ile</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">E</span>dit</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">V</span>iew</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">G</span>o</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">B</span>ookmarks</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">O</span>ptions</button>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">D</span>irectory</button>
							<span class="netscape-menu-spacer"></span>
							<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">H</span>elp</button>
						</div>

						<div class="netscape-toolbar-row">
							<button
								type="button"
								class="netscape-tool-button"
								:disabled="!canBrowserGoBack"
								@click="goBrowserBack"
							>
								<span class="netscape-tool-icon icon-back" aria-hidden="true"></span>
								<span>Back</span>
							</button>
							<button
								type="button"
								class="netscape-tool-button"
								:disabled="!canBrowserGoForward"
								@click="goBrowserForward"
							>
								<span class="netscape-tool-icon icon-forward" aria-hidden="true"></span>
								<span>Forward</span>
							</button>
							<button type="button" class="netscape-tool-button" @click="goBrowserHome">
								<span class="netscape-tool-icon icon-home" aria-hidden="true"></span>
								<span>Home</span>
							</button>
							<div class="netscape-toolbar-separator" aria-hidden="true"></div>
							<button type="button" class="netscape-tool-button" @click="reloadBrowserPage">
								<span class="netscape-tool-icon icon-reload" aria-hidden="true"></span>
								<span>Reload</span>
							</button>
							<button
								type="button"
								class="netscape-tool-button"
								:disabled="!browserLoading"
								@click="stopBrowserLoading"
							>
								<span class="netscape-tool-icon icon-stop" aria-hidden="true"></span>
								<span>Stop</span>
							</button>
						</div>

						<div class="netscape-location-row">
							<label for="browser-address">Location:</label>
							<input
								id="browser-address"
								ref="browserAddressInputRef"
								v-model="browserAddress"
								type="text"
								@keydown.enter.prevent="navigateBrowserAddress"
							/>
							<button
								type="button"
								class="netscape-throbber"
								aria-label="Compatibility mode"
								title="Compatibility mode"
								@click="forceBrowserCompatibilityMode"
							>
								<img :src="browserSkin === 'tor' ? '/tor-browser-icon.svg' : '/netscape-logo.svg'" alt="" aria-hidden="true" />
							</button>
						</div>

						<div class="netscape-shortcuts-row">
							<button
								type="button"
								class="netscape-shortcut"
								:class="{ active: browserSearchMenuOpen }"
								@click="toggleBrowserSearchMenu"
							>
								{{ browserNetSearchLabel }}
							</button>
							<button
								v-if="browserBackend !== 'tor'"
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://duckduckgo.com/?q=retro+web+design', 'Web Picks', { backend: browserBackend, skin: browserSkin })"
							>
								Web Picks
							</button>
						</div>

						<div v-if="browserSearchMenuOpen" class="netscape-search-menu">
							<form class="netscape-search-form" @submit.prevent="submitBrowserSearch">
								<label for="browser-search-query">Search the web</label>
								<div class="netscape-search-row">
									<input
										id="browser-search-query"
										ref="browserSearchInputRef"
										v-model="browserSearchQuery"
										type="text"
										placeholder="type query..."
										autocomplete="off"
									/>
									<select v-model="browserSearchEngine" aria-label="Search engine">
										<option v-for="engine in browserSearchEngines" :key="engine.id" :value="engine.id">
											{{ engine.label }}
										</option>
									</select>
									<button type="submit" class="netscape-search-go">Go</button>
								</div>
								<div class="netscape-search-actions">
									<button
										v-for="engine in browserSearchEngines"
										:key="`quick-${engine.id}`"
										type="button"
										class="netscape-search-engine"
										@click="searchWithEngine(engine.id)"
									>
										{{ engine.label }}
									</button>
								</div>
							</form>
						</div>

						<div class="netscape-content-wrap">
							<iframe
								v-if="browserRenderMode === 'direct'"
								ref="browserFrameRef"
								class="browser-frame netscape-browser-frame"
								:src="browserFrameSrc"
								title="Netscape Navigator content"
								loading="lazy"
								referrerpolicy="no-referrer"
								@load="handleDirectBrowserFrameLoad"
								@error="handleDirectBrowserFrameError"
							></iframe>
							<iframe
								v-else
								ref="browserFrameRef"
								class="browser-frame netscape-browser-frame"
								:srcdoc="browserDocument"
								title="Netscape Navigator compatibility content"
								loading="lazy"
								sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
								referrerpolicy="no-referrer"
							></iframe>
							<div v-if="browserLoading" class="browser-overlay browser-loading netscape-browser-overlay">
								Loading...
							</div>
							<div v-else-if="browserError" class="browser-overlay browser-blocked netscape-browser-overlay">
								<div>{{ browserError }}</div>
								<button @click="forceBrowserCompatibilityMode">Retry compatibility mode</button>
								<button @click="openBrowserExternally">Open externally</button>
							</div>
						</div>
					</div>
					<div
						v-for="direction in resizeDirections"
						v-if="canResizeWindow('browser')"
						:key="`browser-${direction}`"
						class="window-resize-handle"
						:class="`handle-${direction}`"
						@pointerdown="startWindowResize('browser', direction, $event)"
					></div>
				</div>
			</Transition>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('vlc')"
					ref="vlcWindowRef"
					class="window vlc-window draggable-window"
					data-window-id="vlc"
					:class="{ 'window-maximized': isWindowMaximized('vlc') }"
					:style="windowStyle('vlc')"
					@pointerdown="focusWindow('vlc')"
				>
					<div
						class="title-bar drag-handle"
						@pointerdown.stop="startWindowDrag('vlc', $event)"
					>
						<div class="title-bar-text">
							<img
								:src="shellIcons.vlc"
								width="12"
								height="12"
								alt="vlc icon"
							/>
							VLC media player
						</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize" @click.stop="minimizeWindow('vlc')"></button>
							<button
								:aria-label="isWindowMaximized('vlc') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('vlc')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('vlc')"></button>
						</div>
					</div>
					<div class="window-body vlc-window-body">
						<div class="vlc-menubar" role="menubar" aria-label="VLC menu">
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Media')">Media</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Playback')">Playback</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Audio')">Audio</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Video')">Video</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Subtitle')">Subtitle</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Tools')">Tools</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('View')">View</button>
							<button type="button" class="vlc-menu-item" @click="openVlcMenuItem('Help')">Help</button>
						</div>
						<div v-show="vlcSourcePanelOpen" class="vlc-source-panel">
							<form class="vlc-source-form" @submit.prevent="loadVlcPlaylist">
								<input
									id="vlc-playlist-input"
									v-model="vlcPlaylistInput"
									type="text"
									autocomplete="off"
									placeholder="Paste YouTube playlist link or ID"
								/>
								<button type="submit">Open</button>
								<label class="vlc-ui-toggle" for="vlc-hide-youtube-controls">
									<input
										id="vlc-hide-youtube-controls"
										v-model="vlcHideYoutubeControls"
										type="checkbox"
										@change="handleVlcUiToggle"
									/>
									Hide YouTube UI
								</label>
							</form>
							<p v-if="vlcError" class="vlc-error">{{ vlcError }}</p>
						</div>
						<div class="vlc-content">
							<iframe
								ref="vlcFrameRef"
								class="vlc-frame"
								:src="vlcEmbedUrl"
								title="VLC playlist player"
								loading="lazy"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
								@load="handleVlcFrameLoad"
							></iframe>
						</div>
						<div class="vlc-bottom">
							<div class="vlc-seek-row">
								<span class="vlc-time">{{ vlcCurrentTimeLabel }}</span>
								<input
									class="vlc-timeline"
									type="range"
									min="0"
									max="100"
									step="0.1"
									:value="vlcProgressPercent"
									@input="seekVlcTimeline"
								/>
								<span class="vlc-time">{{ vlcDurationLabel }}</span>
							</div>
							<div class="vlc-controls" role="toolbar" aria-label="VLC controls">
								<div class="vlc-controls-left">
									<button type="button" class="vlc-control-button" aria-label="Previous track" @click="previousVlcTrack">|&lt;&lt;</button>
									<button type="button" class="vlc-control-button" aria-label="Play" @click="playVlc">&gt;</button>
									<button type="button" class="vlc-control-button" aria-label="Pause" @click="pauseVlc">||</button>
									<button type="button" class="vlc-control-button" aria-label="Stop" @click="stopVlc">[]</button>
									<button type="button" class="vlc-control-button" aria-label="Next track" @click="nextVlcTrack">&gt;&gt;|</button>
									<button type="button" class="vlc-control-button" aria-label="Playlist" @click="pushStatus('Playlist view is not available in this build.')">List</button>
									<button type="button" class="vlc-control-button" aria-label="Loop" @click="pushStatus('Loop toggle is not available in this build.')">Loop</button>
								</div>
								<div class="vlc-controls-right">
									<button
										type="button"
										class="vlc-control-button vlc-mute-button"
										aria-label="Mute"
										@click="toggleVlcMute"
									>
										{{ vlcMuted ? 'Muted' : 'Mute' }}
									</button>
									<label class="vlc-volume-wrap" for="vlc-volume-slider">
										<input
											id="vlc-volume-slider"
											type="range"
											min="0"
											max="100"
											:value="vlcVolume"
											@input="setVlcVolume"
										/>
										<span class="vlc-volume-value">{{ vlcVolume }}%</span>
									</label>
								</div>
							</div>
						</div>
					</div>
					<div
						v-for="direction in resizeDirections"
						v-if="canResizeWindow('vlc')"
						:key="`vlc-${direction}`"
						class="window-resize-handle"
						:class="`handle-${direction}`"
						@pointerdown="startWindowResize('vlc', direction, $event)"
					></div>
				</div>
			</Transition>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('noise')"
					ref="noiseWindowRef"
					class="window noise-window draggable-window"
					data-window-id="noise"
					:class="{ 'window-maximized': isWindowMaximized('noise') }"
					:style="windowStyle('noise')"
					@pointerdown="focusWindow('noise')"
				>
					<div
						class="title-bar drag-handle"
						@pointerdown.stop="startWindowDrag('noise', $event)"
					>
						<div class="title-bar-text">
							<img
								:src="shellIcons.noise"
								width="12"
								height="12"
								alt="noise icon"
							/>
							White Noise Generator
						</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize" @click.stop="minimizeWindow('noise')"></button>
							<button
								:aria-label="isWindowMaximized('noise') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('noise')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('noise')"></button>
						</div>
					</div>
					<div class="window-body noise-window-body">
						<div class="noise-menubar" role="menubar" aria-label="Noise player menu">
							<button type="button" class="noise-menu-item" @click="pushStatus('File menu not implemented.')">File</button>
							<button type="button" class="noise-menu-item" @click="pushStatus('Playback menu not implemented.')">Playback</button>
							<button type="button" class="noise-menu-item" @click="pushStatus('Effects menu not implemented.')">Effects</button>
							<button type="button" class="noise-menu-item" @click="pushStatus('Help menu not implemented.')">Help</button>
						</div>
						<div class="noise-player-shell">
							<div class="noise-lcd">
								<p class="noise-lcd-title">NoiseBox 2002</p>
								<p class="noise-lcd-preset">{{ selectedNoisePreset.label }}</p>
								<p class="noise-lcd-status">
									{{ noiseIsPlaying ? 'PLAYING' : 'STOPPED' }} • VOL {{ noiseVolume }}%
								</p>
							</div>
							<div class="noise-control-row" role="toolbar" aria-label="Noise controls">
								<button type="button" class="noise-button" @click="cycleNoisePreset(-1)">|&lt;</button>
								<button type="button" class="noise-button" @click="toggleNoiseGenerator">
									{{ noiseIsPlaying ? 'Stop' : 'Play' }}
								</button>
								<button type="button" class="noise-button" @click="stopNoiseGenerator()">[]</button>
								<button type="button" class="noise-button" @click="cycleNoisePreset(1)">&gt;|</button>
							</div>
							<label class="noise-volume-row" for="noise-volume-slider">
								<span>Intensity</span>
								<input
									id="noise-volume-slider"
									type="range"
									min="0"
									max="100"
									:value="noiseVolume"
									@input="setNoiseVolume"
								/>
								<span>{{ noiseVolume }}%</span>
							</label>
							<div class="noise-preset-list" role="radiogroup" aria-label="Noise presets">
								<button
									v-for="preset in noisePresets"
									:key="preset.id"
									type="button"
									class="noise-preset-item"
									:class="{ active: noisePresetId === preset.id }"
									@click="selectNoisePreset(preset.id)"
								>
									<span class="noise-preset-name">{{ preset.label }}</span>
									<span class="noise-preset-description">{{ preset.description }}</span>
								</button>
							</div>
							<p v-if="noiseError" class="noise-status-error">{{ noiseError }}</p>
						</div>
					</div>
					<div
						v-for="direction in resizeDirections"
						v-if="canResizeWindow('noise')"
						:key="`noise-${direction}`"
						class="window-resize-handle"
						:class="`handle-${direction}`"
						@pointerdown="startWindowResize('noise', direction, $event)"
					></div>
				</div>
			</Transition>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('recycle')"
					ref="recycleWindowRef"
					class="window recycle-window draggable-window"
					data-window-id="recycle"
					:class="{ 'window-maximized': isWindowMaximized('recycle') }"
					:style="windowStyle('recycle')"
					@pointerdown="focusWindow('recycle')"
				>
					<div
						class="title-bar drag-handle"
						@pointerdown.stop="startWindowDrag('recycle', $event)"
					>
						<div class="title-bar-text">
							<img
								:src="shellIcons.recycle"
								width="12"
								height="12"
								alt="recycle bin icon"
							/>
							Recycle Bin
						</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize" @click.stop="minimizeWindow('recycle')"></button>
							<button
								:aria-label="isWindowMaximized('recycle') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('recycle')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('recycle')"></button>
						</div>
					</div>
					<div class="window-body links-window-body recycle-window-body">
						<span class="group-title">-- saved links --</span>
						<div class="recycle-shortcuts-grid">
							<a
								v-for="shortcut in recycleBinShortcuts"
								:key="shortcut.id"
								:href="shortcut.href ?? '#'"
								class="recycle-shortcut"
								@click="handleRecycleShortcutClick(shortcut, $event)"
							>
								<img :src="shortcut.icon" :alt="shortcut.label" width="32" height="32" />
								<span>{{ shortcut.label }}</span>
							</a>
						</div>
					</div>
					<div
						v-for="direction in resizeDirections"
						v-if="canResizeWindow('recycle')"
						:key="`recycle-${direction}`"
						class="window-resize-handle"
						:class="`handle-${direction}`"
						@pointerdown="startWindowResize('recycle', direction, $event)"
					></div>
				</div>
			</Transition>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('otaclock')"
					ref="otaClockWindowRef"
					class="window otaclock-window draggable-window"
					data-window-id="otaclock"
					:class="{ 'window-maximized': isWindowMaximized('otaclock') }"
					:style="windowStyle('otaclock')"
					@pointerdown="focusWindow('otaclock')"
				>
					<div
						class="title-bar drag-handle"
						@pointerdown.stop="startWindowDrag('otaclock', $event)"
					>
						<div class="title-bar-text">
							<img
								:src="shellIcons.otaclock"
								width="12"
								height="12"
								alt="otaclock icon"
							/>
							OtaClock
						</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize" @click.stop="minimizeWindow('otaclock')"></button>
							<button
								:aria-label="isWindowMaximized('otaclock') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('otaclock')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('otaclock')"></button>
						</div>
					</div>
					<div class="window-body otaclock-window-body">
						<div class="otaclock-stage-wrap">
							<div class="otaclock-stage" :style="otaClockPanelStyle">
								<div class="otaclock-art-panel">
									<div class="otaclock-art-left">
										<div class="otaclock-hero-wrap">
											<img
												:src="otaClockSpriteSrc"
												alt="Otacon sprite"
												class="otaclock-hero otaclock-hero-main"
												:class="{ ringing: otaClockRinging }"
												draggable="false"
											/>
											<div v-if="!otaClockRinging" class="otaclock-bubble-copy">
												<div class="otaclock-bubble-time">{{ otaClockDisplayTime }}</div>
												<div class="otaclock-bubble-date">{{ otaClockDisplayDate }}</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<button
							type="button"
							class="otaclock-config-toggle"
							:aria-expanded="otaClockConfigOpen"
							aria-controls="otaclock-config-panel"
							title="Open OtaClock configuration"
							@pointerdown.stop
							@click.stop="otaClockConfigOpen = !otaClockConfigOpen"
						>
							<img
								src="/otaclock/gear_pixel.png"
								alt=""
								class="otaclock-gear-icon"
								draggable="false"
							/>
						</button>
						<div
							v-if="otaClockConfigOpen"
							id="otaclock-config-panel"
							class="otaclock-config-panel"
							@pointerdown.stop
						>
							<div class="otaclock-config-header">
								<span>OtaClock Configuration</span>
								<button
									type="button"
									class="otaclock-config-close"
									aria-label="Close configuration"
									@click="otaClockConfigOpen = false"
								>
									x
								</button>
							</div>
							<div class="otaclock-controls">
								<div class="otaclock-control-grid">
									<label><input v-model="otaClockUse24Hour" type="checkbox" /> 24-hour display</label>
									<label><input v-model="otaClockAlarmEnabled" type="checkbox" /> Alarm mode</label>
									<label><input v-model="otaClockAlwaysOnTop" type="checkbox" /> Always on top</label>
									<label><input v-model="otaClockLockPosition" type="checkbox" /> Lock position</label>
								</div>
								<div class="otaclock-control-row">
									<label for="otaclock-sound">Alarm sound</label>
									<select id="otaclock-sound" v-model="otaClockAlarmSound">
										<option value="LAUGH">LAUGH</option>
										<option value="OK">OK</option>
									</select>
									<label for="otaclock-duration">Ring time</label>
									<select id="otaclock-duration" v-model.number="otaClockAlarmDuration">
										<option :value="5">5s</option>
										<option :value="10">10s</option>
										<option :value="30">30s</option>
										<option :value="60">60s</option>
									</select>
									<label for="otaclock-scale">Scale</label>
									<input
										id="otaclock-scale"
										v-model.number="otaClockScale"
										type="range"
										min="1"
										max="1.8"
										step="0.1"
									/>
									<button
										type="button"
										:disabled="!otaClockRinging"
										@click="stopOtaClockAlarm()"
									>
										Stop Alarm
									</button>
								</div>
								<label class="otaclock-alarm-input-label" for="otaclock-alarm-times">
									Alarm times (HH:MM:SS, one per line)
								</label>
								<textarea
									id="otaclock-alarm-times"
									v-model="otaClockAlarmTimesInput"
									rows="2"
									spellcheck="false"
								></textarea>
							</div>
						</div>
					</div>
					<audio ref="otaClockAudioLaughRef" src="/otaclock/alarm_laugh.wav" preload="auto"></audio>
					<audio ref="otaClockAudioOkRef" src="/otaclock/alarm_ok.wav" preload="auto"></audio>
					<div
						v-for="direction in resizeDirections"
						v-if="canResizeWindow('otaclock')"
						:key="`otaclock-${direction}`"
						class="window-resize-handle"
						:class="`handle-${direction}`"
						@pointerdown="startWindowResize('otaclock', direction, $event)"
					></div>
				</div>
			</Transition>

			<Transition name="xp-window">
				<div
					v-if="isWindowVisible('main')"
					ref="mainWindowRef"
					class="window main-window draggable-window"
					data-window-id="main"
					:class="{ 'window-maximized': isWindowMaximized('main') }"
					:style="windowStyle('main')"
					@pointerdown="focusWindow('main')"
				>
					<div
						class="title-bar drag-handle"
						@pointerdown.stop="startWindowDrag('main', $event)"
					>
						<div class="title-bar-text">
							<img
								:src="shellIcons.shell"
								width="12"
								height="12"
								alt="window icon"
							/>
							okami@desktop:~/portfolio
						</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize" @click.stop="minimizeWindow('main')"></button>
							<button
								:aria-label="isWindowMaximized('main') ? 'Restore' : 'Maximize'"
								@click.stop="toggleMaximizeWindow('main')"
							></button>
							<button aria-label="Close" @click.stop="closeWindow('main')"></button>
						</div>
					</div>

					<div class="window-body">
					<pre class="ascii-banner">  ___  _  __    _    __  __ ___
 / _ \| |/ /   / \  |  \/  |_ _|
| | | | ' /   / _ \ | |\/| || |
| |_| | . \  / ___ \| |  | || |
 \___/|_|\_\/_/   \_\_|  |_|___|</pre>

					<menu role="tablist">
						<button
							v-for="tab in tabs"
							:key="tab.id"
							:aria-selected="activeTab === tab.id"
							@click="setTab(tab.id)"
						>
							{{ tab.label }}
						</button>
					</menu>

					<article role="tabpanel" :hidden="activeTab !== 'about'">
						<fieldset>
							<legend>Profile</legend>
							<p>
								okami / she-her / full-stack engineer.
								<br />this portfolio shell is a full rewrite with a windows xp navigation feel.
							</p>
						</fieldset>

						<fieldset>
							<legend>Current Focus</legend>
							<ul class="tree-view">
								<li>Building products and interfaces with strong identity.</li>
								<li>Maintaining community and platform projects.</li>
								<li>Shipping interfaces with personality, not template UI.</li>
							</ul>
						</fieldset>

						<fieldset class="blinkie-gallery">
							<legend>Blinkies</legend>
							<p v-if="blinkieLoading" class="blinkie-status">Loading blinkies...</p>
							<p v-else-if="blinkieError" class="blinkie-status blinkie-status-error">{{ blinkieError }}</p>
							<p v-else-if="blinkieBadges.length === 0" class="blinkie-status">
								No badge set found for this theme folder.
							</p>
							<div class="blinkie-badge-strip">
								<img
									v-for="(badgeSrc, index) in blinkieBadges"
									:key="badgeSrc"
									:src="badgeSrc"
									:alt="`Badge ${index + 1}`"
									class="blinkie-badge"
									loading="lazy"
									decoding="async"
									width="88"
									height="31"
								/>
							</div>
						</fieldset>

						<fieldset class="blinkie-gallery">
							<legend>Stamps</legend>
							<p v-if="!blinkieLoading && !blinkieError && blinkieStamps.length === 0" class="blinkie-status">
								No stamp set found for this theme folder.
							</p>
							<div class="blinkie-stamp-grid">
								<img
									v-for="(stampSrc, index) in blinkieStamps"
									:key="stampSrc"
									:src="stampSrc"
									:alt="`Stamp ${index + 1}`"
									class="blinkie-stamp"
									loading="lazy"
									decoding="async"
									width="99"
									height="56"
								/>
							</div>
						</fieldset>
					</article>

					<article id="projects-tab" role="tabpanel" :hidden="activeTab !== 'projects'">
						<fieldset>
							<legend>Projects</legend>
							<table class="projects-table">
								<thead>
									<tr>
										<th>Project</th>
										<th>Stack</th>
										<th>Window</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="project in projects" :key="project.title">
										<td>
											<strong>{{ project.title }}</strong>
											<div class="project-meta">
												{{ project.timeframe }} - {{ project.description }}
											</div>
										</td>
										<td>{{ project.tech }}</td>
										<td>
											<a
												v-if="project.link !== '#'"
												:href="project.link"
												@click="handleProjectOpen(project, $event)"
											>
												open
											</a>
											<span v-else>private</span>
										</td>
									</tr>
								</tbody>
							</table>
						</fieldset>
					</article>

					<article role="tabpanel" :hidden="activeTab !== 'blog'">
						<fieldset class="blog-toolbar">
							<legend>Blog</legend>
							<div class="blog-toolbar-row">
								<p class="blog-session-note">
									Signed in as <strong>{{ sessionRole }}</strong>
								</p>
								<button type="button" @click="loadBlogPosts">Refresh</button>
							</div>
							<p v-if="blogLoading" class="blinkie-status">Loading blog posts...</p>
							<p v-else-if="blogError" class="blinkie-status blinkie-status-error">{{ blogError }}</p>
							<p v-else-if="blogPosts.length === 0" class="blinkie-status">No posts yet.</p>
						</fieldset>

						<fieldset v-if="signedInAsAdmin" class="blog-composer">
							<legend>{{ blogEditingPostId !== null ? 'Edit Post (Admin)' : 'New Post (Admin)' }}</legend>
							<div class="blog-composer-grid">
								<label for="blog-title">Title</label>
								<input id="blog-title" v-model="blogComposerTitle" type="text" maxlength="160" />
								<label for="blog-excerpt">Excerpt</label>
								<input
									id="blog-excerpt"
									v-model="blogComposerExcerpt"
									type="text"
									maxlength="400"
								/>
								<label for="blog-content">Content</label>
								<textarea
									id="blog-content"
									v-model="blogComposerContent"
									rows="5"
									maxlength="20000"
								></textarea>
								<label class="blog-checkbox">
									<input v-model="blogComposerPublished" type="checkbox" />
									Published
								</label>
							</div>
							<p v-if="blogComposerError" class="blinkie-status blinkie-status-error">
								{{ blogComposerError }}
							</p>
							<div class="blog-composer-actions">
								<button
									type="button"
									:disabled="blogComposerSaving || blogDeletingPostId !== null"
									@click="submitBlogPost"
								>
									{{
										blogComposerSaving
											? blogEditingPostId !== null
												? 'Saving...'
												: 'Publishing...'
											: blogEditingPostId !== null
												? 'Save Changes'
												: 'Publish Post'
									}}
								</button>
								<button
									v-if="blogEditingPostId !== null"
									type="button"
									:disabled="blogComposerSaving || blogDeletingPostId !== null"
									@click="cancelEditingBlogPost"
								>
									Cancel Edit
								</button>
							</div>
						</fieldset>

						<section v-if="blogPosts.length > 0" class="blog-browser">
							<aside class="blog-post-list">
								<button
									v-for="post in blogPosts"
									:key="post.id"
									type="button"
									class="blog-post-list-item"
									:class="{ active: selectedBlogPostId === post.id }"
									@click="selectBlogPost(post.id)"
								>
									<span class="blog-post-list-title">{{ post.title }}</span>
									<span class="blog-post-list-meta">
										{{ formatBlogTimestamp(post.createdAt) }} • {{ post.author }}
										<span v-if="!post.published"> • draft</span>
									</span>
								</button>
							</aside>
							<article v-if="selectedBlogPost" class="blog-post-view">
								<header class="blog-post-header">
									<h3>{{ selectedBlogPost.title }}</h3>
									<p class="blog-post-meta">
										{{ formatBlogTimestamp(selectedBlogPost.createdAt) }} • {{ selectedBlogPost.author }}
										<span v-if="!selectedBlogPost.published"> • draft</span>
									</p>
									<div v-if="signedInAsAdmin" class="blog-post-admin-actions">
										<button
											type="button"
											:disabled="blogComposerSaving || blogDeletingPostId !== null"
											@click="beginEditingBlogPost(selectedBlogPost)"
										>
											Edit Post
										</button>
										<button
											type="button"
											class="danger"
											:disabled="blogComposerSaving || blogDeletingPostId !== null"
											@click="deleteSelectedBlogPost"
										>
											{{ blogDeletingPostId === selectedBlogPost.id ? 'Deleting...' : 'Delete Post' }}
										</button>
									</div>
								</header>
								<p v-if="selectedBlogPost.excerpt" class="blog-post-excerpt">
									{{ selectedBlogPost.excerpt }}
								</p>
								<div
									class="blog-post-content markdown-content"
									v-html="renderBlogMarkdown(selectedBlogPost.content)"
								></div>
							</article>
							<p v-else class="blinkie-status">Select a post from the list.</p>
						</section>
					</article>

					<article role="tabpanel" :hidden="activeTab !== 'contact'">
						<table class="contact-table">
							<tbody>
								<tr>
									<td>GitHub</td>
									<td>
										<a
											href="https://github.com/Lewdcario"
											@click.prevent="openInBrowser('https://github.com/Lewdcario', 'GitHub')"
										>
											@Lewdcario
										</a>
									</td>
								</tr>
								<tr>
									<td>Twitter</td>
									<td>
										<a
											href="https://twitter.com/okamicario"
											@click.prevent="openInBrowser('https://twitter.com/okamicario', 'Twitter')"
										>
											@okamicario
										</a>
									</td>
								</tr>
								<tr>
									<td>Email</td>
									<td>not public</td>
								</tr>
							</tbody>
						</table>

						<fieldset>
							<legend>Note</legend>
							<p>
								This desktop is intentionally heavy on retro chrome, just like requested:
								icons, tabs, start menu, status bars, and a forced continue gate.
							</p>
						</fieldset>
					</article>

					<div class="marquee-wrap">
						<marquee behavior="scroll" direction="left" scrollamount="2">
							{{ marqueeText }}
						</marquee>
					</div>

					<section class="field-row footer-buttons">
						<span class="status-text">{{ statusMessage }}</span>
						<button @click="runSoftAction('Settings applied.')">OK</button>
						<button @click="runSoftAction('Action canceled.')">Cancel</button>
					</section>
				</div>
				<div
					v-for="direction in resizeDirections"
					v-if="canResizeWindow('main')"
					:key="`main-${direction}`"
					class="window-resize-handle"
					:class="`handle-${direction}`"
					@pointerdown="startWindowResize('main', direction, $event)"
				></div>
				</div>
			</Transition>
		</div>

		<div
			v-if="contextMenuVisible"
			ref="contextMenuRef"
			class="xp-context-menu"
			:style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }"
			@contextmenu.stop.prevent
		>
			<div class="xp-context-menu-title">{{ contextMenuTitle }}</div>
			<div class="xp-context-menu-list">
				<template v-for="item in contextMenuItems" :key="item.id">
					<div v-if="item.separator" class="xp-context-menu-separator"></div>
					<button
						v-else
						type="button"
						class="xp-context-menu-item"
						:disabled="item.disabled"
						@click.stop="invokeContextMenuItem(item)"
					>
						{{ item.label }}
					</button>
				</template>
			</div>
		</div>

		<div class="taskbar">
			<div class="start-button">
				<button class="start-button-inner" @click.stop="toggleStartMenu">
					<span class="start-button-flag" aria-hidden="true">
						<span class="start-button-flag-pane red"></span>
						<span class="start-button-flag-pane green"></span>
						<span class="start-button-flag-pane blue"></span>
						<span class="start-button-flag-pane yellow"></span>
					</span>
					<span class="start-button-label">start</span>
				</button>
				<div v-show="startMenuOpen" id="start-menu" class="start-menu">
					<div class="start-menu-header">
						<div class="start-menu-header-label">Windows XP</div>
					</div>
					<div class="start-menu-items">
						<button class="start-menu-item" @click="setTab('about')">
							<img
								:src="shellIcons.about"
								width="16"
								height="16"
								alt="about icon"
							/>
							<span>About</span>
						</button>
						<button class="start-menu-item" @click="setTab('projects')">
							<img
								:src="shellIcons.folder"
								width="16"
								height="16"
								alt="projects icon"
							/>
							<span>Projects</span>
						</button>
						<button class="start-menu-item" @click="setTab('blog')">
							<img
								:src="shellIcons.about"
								width="16"
								height="16"
								alt="blog icon"
							/>
							<span>Blog</span>
						</button>
						<button
							class="start-menu-item"
							@click="openNetscapeBrowser(browserCurrentUrl || browserHomeUrl, 'Open Navigator')"
						>
							<img
								:src="shellIcons.browser"
								width="16"
								height="16"
								alt="browser icon"
							/>
							<span>Open Navigator</span>
						</button>
						<button
							class="start-menu-item"
							@click="openTorBrowser(browserCurrentUrl || torBrowserHomeUrl, 'Tor Browser')"
						>
							<img
								src="/tor-browser-icon.svg"
								width="16"
								height="16"
								alt="tor browser icon"
							/>
							<span>Open Tor Browser</span>
						</button>
						<button class="start-menu-item" @click="openVlcWindow">
							<img
								:src="shellIcons.vlc"
								width="16"
								height="16"
								alt="vlc icon"
							/>
							<span>Open VLC</span>
						</button>
						<button class="start-menu-item" @click="openNoiseWindow">
							<img
								:src="shellIcons.noise"
								width="16"
								height="16"
								alt="noise icon"
							/>
							<span>Open Noise Generator</span>
						</button>
						<button class="start-menu-item" @click="openOtaClockWindow">
							<img
								:src="shellIcons.otaclock"
								width="16"
								height="16"
								alt="otaclock icon"
							/>
							<span>Open OtaClock</span>
						</button>
						<button class="start-menu-item" @click="openWindowFromMenu('links')">
							<img
								:src="shellIcons.folder"
								width="16"
								height="16"
								alt="links window icon"
							/>
							<span>Open Links</span>
						</button>
						<button class="start-menu-item" @click="openWindowFromMenu('clock')">
							<img
								:src="shellIcons.globe"
								width="16"
								height="16"
								alt="clock window icon"
							/>
							<span>Open Clock</span>
						</button>
						<div class="start-menu-divider"></div>
						<div class="start-menu-section-label">Themes: {{ activeThemeLabel }}</div>
						<div class="start-theme-grid">
							<button
								v-for="theme in xpThemes"
								:key="theme.id"
								class="start-menu-item start-menu-theme-item"
								:class="{ active: activeThemeId === theme.id }"
								@click="setTheme(theme.id)"
							>
								<img
									:src="shellIcons.about"
									width="16"
									height="16"
									alt="theme icon"
								/>
								<span>{{ theme.label }}</span>
							</button>
						</div>
						<div class="start-menu-divider"></div>
						<button
							class="start-menu-item"
							@click="openNetscapeBrowser(browserHomeUrl, 'Home Page')"
						>
							<img
								:src="shellIcons.browser"
								width="16"
								height="16"
								alt="home icon"
							/>
							<span>Home Page</span>
						</button>
						<button
							class="start-menu-item"
							@click="performLogoff"
						>
							<img
								:src="shellIcons.power"
								width="16"
								height="16"
								alt="log off icon"
							/>
							<span>Log Off...</span>
						</button>
					</div>
				</div>
			</div>

			<div class="taskbar-divider"></div>

			<div id="taskbar-apps" class="open-apps">
				<div
					v-for="taskbarWindow in taskbarWindows"
					:key="taskbarWindow.id"
					class="taskbar-app"
					:data-taskbar-window-id="taskbarWindow.id"
					:class="{
						active: isTaskbarWindowActive(taskbarWindow.id),
						minimized: taskbarWindow.isMinimized,
						closed: !taskbarWindow.isOpen
					}"
					@click="toggleWindowFromTaskbar(taskbarWindow.id)"
				>
					<img :src="taskbarWindow.icon" width="16" height="16" :alt="`${taskbarWindow.label} icon`" />
					<span>{{ taskbarWindow.label }}</span>
				</div>
			</div>

			<div class="tray">
				<div id="hit-counter" class="tray-counter">{{ visitorDisplay }}</div>
				<div class="tray-divider"></div>
				<div id="taskbar-time" class="taskbar-time">{{ taskbarClock }}</div>
			</div>
		</div>
	</div>
</template>
