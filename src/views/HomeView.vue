<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import projects, { type PortfolioProject } from '../data/projects';
import { blinkieBadges, blinkieStamps } from '../data/blinkies';

type TabId = 'about' | 'projects' | 'contact';

interface DesktopIcon {
	id: string;
	label: string;
	icon: string;
	href?: string;
	tab?: TabId;
	tor?: boolean;
	x: number;
	y: number;
	recycle?: boolean;
}

type WindowId = 'links' | 'clock' | 'main' | 'browser' | 'recycle';
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

type BrowserRenderMode = 'direct' | 'snapshot';
type BrowserBackend = 'standard' | 'tor';
type BrowserSkin = 'netscape' | 'tor';

const browserHomeUrl = 'https://library.okami.codes/';
const torBrowserHomeUrl = 'https://check.torproject.org/';
const loginPasswordSeed = 'cobalt_2002';

const tabs: Array<{ id: TabId; label: string }> = [
	{ id: 'about', label: 'About' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'contact', label: 'Contact' }
];

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

const recycleBinLinks: Array<{ label: string; href: string }> = [
	{ label: 'TheOldNet', href: 'https://theoldnet.com/' },
	{ label: 'Oldweb.Today', href: 'https://oldweb.today/' },
	{ label: 'Neocities', href: 'https://neocities.org/browse' },
	{ label: 'SpaceHey', href: 'https://spacehey.com/' },
	{ label: 'Wiby', href: 'https://wiby.me/' },
	{ label: 'Camerons World', href: 'https://www.cameronsworld.net/' }
];

const desktopIcons: DesktopIcon[] = [
	{
		id: 'github',
		label: 'GitHub',
		icon: 'https://win98icons.alexmeub.com/icons/png/computer_explorer_cool-3.png',
		href: 'https://github.com/Lewdcario',
		x: 34,
		y: 130
	},
	{
		id: 'about-me',
		label: 'About Me',
		icon: 'https://win98icons.alexmeub.com/icons/png/msie1-2.png',
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
		id: 'library',
		label: 'Library',
		icon: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png',
		href: 'https://library.okami.codes/library',
		x: 126,
		y: 250
	},
	{
		id: 'projects',
		label: 'Projects',
		icon: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png',
		tab: 'projects',
		x: 34,
		y: 250
	},
	{
		id: 'contact',
		label: 'Contact',
		icon: 'https://win98icons.alexmeub.com/icons/png/address_book_user.png',
		tab: 'contact',
		x: 34,
		y: 370
	},
	{
		id: 'recycle-bin',
		label: 'Recycle Bin',
		icon: 'https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png',
		recycle: true,
		x: 0,
		y: 0
	}
];

const windowsMeta: WindowMeta[] = [
	{
		id: 'links',
		label: 'Links',
		icon: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png'
	},
	{
		id: 'clock',
		label: 'timedatectl.d',
		icon: 'https://win98icons.alexmeub.com/icons/png/world-0.png'
	},
	{
		id: 'main',
		label: 'okami@desktop:~/portfolio',
		icon: 'https://win98icons.alexmeub.com/icons/png/msie1-4.png'
	},
	{
		id: 'browser',
		label: 'Netscape Navigator',
		icon: 'https://win98icons.alexmeub.com/icons/png/msie1-2.png'
	},
	{
		id: 'recycle',
		label: 'Recycle Bin',
		icon: 'https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png'
	}
];

function createDefaultWindowPositions(): Record<WindowId, WindowPosition> {
	return {
		links: { x: 150, y: 66, z: 6 },
		clock: { x: 150, y: 330, z: 7 },
		main: { x: 380, y: 58, z: 8 },
		browser: { x: 300, y: 96, z: 9 },
		recycle: { x: 540, y: 132, z: 10 }
	};
}

function createDefaultWindowState() {
	return {
		links: { isOpen: true, isMinimized: false, isMaximized: false },
		clock: { isOpen: true, isMinimized: false, isMaximized: false },
		main: { isOpen: true, isMinimized: false, isMaximized: false },
		browser: { isOpen: false, isMinimized: false, isMaximized: false },
		recycle: { isOpen: false, isMinimized: false, isMaximized: false }
	};
}

function createDefaultWindowSizes() {
	return {
		links: { width: 220, height: 230 },
		clock: { width: 220, height: 150 },
		main: { width: 860, height: 620 },
		browser: { width: 640, height: 600 },
		recycle: { width: 360, height: 280 }
	};
}

const splashVisible = ref(true);
const splashMode = ref<SplashMode>('startup');
const powerState = ref<PowerState>('idle');
const showContinueButton = ref(false);
const loginPasswordDisplay = ref('');
const loginTypingInProgress = ref(false);
const activeTab = ref<TabId>('about');
const startMenuOpen = ref(false);
const liveClock = ref('--:--:--');
const taskbarClock = ref('--:-- PM');
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
const browserLoading = ref(false);
const browserError = ref('');
const browserTitle = ref('Netscape Navigator');
const browserHistory = ref<string[]>([browserHomeUrl]);
const browserHistoryIndex = ref(0);
const contextMenuRef = ref<HTMLElement | null>(null);
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextTarget = ref<ContextTarget>({ type: 'desktop' });

const marqueeText =
	'okami portfolio - windows shell rewrite - click around like it is 2002';
const onlineStatus = 'online';

const visitorDisplay = computed(
	() => `visitors: ${visitorCount.value.toString().padStart(6, '0')}`
);
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
							: 'https://win98icons.alexmeub.com/icons/png/msie1-2.png',
					...windowState.value[windowMeta.id]
				};
			}

			return {
				...windowMeta,
				...windowState.value[windowMeta.id]
			};
		})
);
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
				action: () => openNetscapeBrowser(browserCurrentUrl.value || browserHomeUrl, 'Open Navigator')
			},
			{
				id: 'open-tor-browser',
				label: 'Open Tor Browser',
				action: () => openTorBrowser(browserCurrentUrl.value || torBrowserHomeUrl, 'Tor Browser')
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
let browserFallbackTimer: number | null = null;
let loginTypingTimer: number | null = null;
let loginTypingRun = 0;
let typingAudioContext: AudioContext | null = null;
let disposed = false;
let zCounter = 10;
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
	const hour24 = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');
	liveClock.value = `${hour24}:${minutes}:${seconds}`;

	const hour12raw = now.getHours() % 12;
	const hour12 = hour12raw === 0 ? 12 : hour12raw;
	const meridiem = now.getHours() >= 12 ? 'PM' : 'AM';
	taskbarClock.value = `${hour12}:${minutes} ${meridiem}`;
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

function setTab(tab: TabId) {
	if (!isWindowVisible('main')) {
		restoreWindow('main', false);
	}
	activeTab.value = tab;
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
	if (windowId === 'recycle') return { width: 260, height: 180 };
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
}

function startWindowDrag(windowId: WindowId, event: PointerEvent) {
	if (isCompactLayout.value || event.button !== 0) return;
	if ((event.target as HTMLElement | null)?.closest('.title-bar-controls')) return;
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
		const maxRight = window.innerWidth - 12;
		const maxBottom = window.innerHeight - 40;
		let nextX = drag.startX;
		let nextY = drag.startY;
		let nextWidth = startWidth;
		let nextHeight = startHeight;

		if (direction?.includes('e')) {
			nextWidth = clamp(startWidth + deltaX, minSize.width, maxRight - drag.startX);
		}

		if (direction?.includes('s')) {
			nextHeight = clamp(startHeight + deltaY, minSize.height, maxBottom - drag.startY);
		}

		if (direction?.includes('w')) {
			const maxDelta = startWidth - minSize.width;
			const minDelta = 12 - drag.startX;
			const appliedDelta = clamp(deltaX, minDelta, maxDelta);
			nextX = drag.startX + appliedDelta;
			nextWidth = startWidth - appliedDelta;
		}

		if (direction?.includes('n')) {
			const maxDelta = startHeight - minSize.height;
			const minDelta = 12 - drag.startY;
			const appliedDelta = clamp(deltaY, minDelta, maxDelta);
			nextY = drag.startY + appliedDelta;
			nextHeight = startHeight - appliedDelta;
		}

		nextWidth = clamp(nextWidth, minSize.width, maxRight - nextX);
		nextHeight = clamp(nextHeight, minSize.height, maxBottom - nextY);

		windowPositions.value[windowId].x = nextX;
		windowPositions.value[windowId].y = nextY;
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

function clearLoginTypingTimer() {
	if (loginTypingTimer !== null) {
		window.clearTimeout(loginTypingTimer);
		loginTypingTimer = null;
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

function openTorBrowser(url = torBrowserHomeUrl, label = 'Tor Browser') {
	openInBrowser(url, label, { backend: 'tor', skin: 'tor' });
}

function openNetscapeBrowser(url = browserHomeUrl, label = 'Netscape Navigator') {
	openInBrowser(url, label, { backend: 'standard', skin: 'netscape' });
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
	const frameWindow = browserFrameRef.value?.contentWindow;
	if (!frameWindow || event.source !== frameWindow) return;

	const data = event.data as { type?: string; href?: string } | null;
	if (!data || data.type !== 'navigator:navigate' || typeof data.href !== 'string') return;

	openInBrowser(data.href, data.href);
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

function handleDesktopIconClick(icon: DesktopIcon, event: MouseEvent) {
	if (draggedIconIds.has(icon.id)) {
		event.preventDefault();
		draggedIconIds.delete(icon.id);
		return;
	}

	if (icon.recycle) {
		event.preventDefault();
		restoreWindow('recycle', false);
		pushStatus('Recycle Bin opened.');
		return;
	}

	if (icon.tab) {
		event.preventDefault();
		setTab(icon.tab);
		return;
	}

	if (icon.tor) {
		event.preventDefault();
		openTorBrowser(icon.href ?? torBrowserHomeUrl, icon.label);
		return;
	}

	if (!icon.href) {
		event.preventDefault();
		return;
	}

	event.preventDefault();
	openNetscapeBrowser(icon.href, icon.label);
}

function handleDesktopIconContextAction(icon: DesktopIcon) {
	if (icon.recycle) {
		restoreWindow('recycle', false);
		pushStatus('Recycle Bin opened.');
		return;
	}

	if (icon.tab) {
		setTab(icon.tab);
		return;
	}

	if (icon.tor) {
		openTorBrowser(icon.href ?? torBrowserHomeUrl, icon.label);
		return;
	}

	if (icon.href) {
		openNetscapeBrowser(icon.href, icon.label);
	}
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

function playTypingSound() {
	const AudioContextConstructor =
		window.AudioContext ||
		(window as Window & { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!AudioContextConstructor) return;

	try {
		if (!typingAudioContext || typingAudioContext.state === 'closed') {
			typingAudioContext = new AudioContextConstructor();
		}

		const context = typingAudioContext;
		void context.resume().catch(() => undefined);

		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = 'square';
		oscillator.frequency.setValueAtTime(1600 + Math.random() * 450, context.currentTime);
		gain.gain.setValueAtTime(0.0001, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.004);
		gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.03);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start(context.currentTime);
		oscillator.stop(context.currentTime + 0.03);
		oscillator.onended = () => {
			oscillator.disconnect();
			gain.disconnect();
		};
	} catch {
		// Ignore when audio is unavailable.
	}
}

function startLoginPasswordTyping() {
	clearLoginTypingTimer();
	loginTypingRun += 1;
	const run = loginTypingRun;
	loginPasswordDisplay.value = '';
	loginTypingInProgress.value = true;

	const totalCharacters = loginPasswordSeed.length;
	const typeNext = () => {
		if (
			disposed ||
			run !== loginTypingRun ||
			splashMode.value !== 'login' ||
			!splashVisible.value
		) {
			loginTypingInProgress.value = false;
			return;
		}

		if (loginPasswordDisplay.value.length >= totalCharacters) {
			loginTypingInProgress.value = false;
			return;
		}

		loginPasswordDisplay.value += '•';
		playTypingSound();
		loginTypingTimer = window.setTimeout(typeNext, 48 + Math.floor(Math.random() * 38));
	};

	loginTypingTimer = window.setTimeout(typeNext, 250);
}

function resetSessionState() {
	activeDrag.value = null;
	draggedIconIds.clear();
	activeTab.value = 'about';
	startMenuOpen.value = false;
	closeContextMenu();
	clearBrowserFallbackTimer();
	clearLoginTypingTimer();
	loginTypingRun += 1;
	loginTypingInProgress.value = false;
	loginPasswordDisplay.value = '';
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
	windowState.value = createDefaultWindowState();
	windowPositions.value = createDefaultWindowPositions();
	windowSizes.value = createDefaultWindowSizes();
	zCounter = 10;
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
	showContinueButton.value = true;
	resetSessionState();
	startLoginPasswordTyping();
}

async function runStartupSequence() {
	splashMode.value = 'startup';
	showContinueButton.value = false;

	await pause(1800);
	if (disposed) return;
	splashMode.value = 'login';
	showContinueButton.value = true;
	startLoginPasswordTyping();
}

function continueToDesktop() {
	clearLoginTypingTimer();
	loginTypingRun += 1;
	loginTypingInProgress.value = false;
	loginPasswordDisplay.value = '';
	splashVisible.value = false;
	pushStatus('signed in.');
}

function handleWindowResize() {
	normalizeDesktopLayout();
	closeContextMenu();
}

onMounted(() => {
	document.title = 'Okami Portfolio';
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
	clearLoginTypingTimer();
	loginTypingRun += 1;
	loginTypingInProgress.value = false;
	if (typingAudioContext && typingAudioContext.state !== 'closed') {
		void typingAudioContext.close();
	}
	typingAudioContext = null;
	browserRequestSerial += 1;

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
	<div class="xp-shell" @contextmenu.prevent="openContextMenu">
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
						<span class="xp-startup-loader-strip"></span>
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
						<div class="xp-login-user" :class="{ typing: loginTypingInProgress }">
							<div class="xp-login-card">
								<div class="xp-login-card-header">
									<div class="xp-login-avatar" aria-hidden="true"></div>
									<div class="xp-login-card-header-copy">
										<p class="xp-login-user-name">Okami</p>
										<p class="xp-login-card-subtitle">Type your password</p>
									</div>
								</div>
								<div class="xp-login-password-row">
									<input
										id="xp-login-password"
										type="password"
										:value="loginPasswordDisplay"
										readonly
										autocomplete="off"
									/>
									<span class="xp-login-language">EN</span>
									<button
										v-if="showContinueButton"
										id="enter-button"
										class="xp-login-arrow"
										:disabled="loginTypingInProgress"
										@click="continueToDesktop"
									>
										➜
									</button>
									<button class="xp-login-help-btn" type="button" aria-label="Help">?</button>
								</div>
							</div>
							<div class="xp-login-hint">
								<p class="xp-login-hint-title">Did you forget your password?</p>
								<p>You can click the "?" button to see your password hint.</p>
								<p>Please type your password again.</p>
								<p>Be sure to use the correct uppercase and lowercase letters.</p>
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
									src="https://win98icons.alexmeub.com/icons/png/world-0.png"
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
							<button type="button" class="netscape-tool-button" disabled>
								<span class="netscape-tool-icon icon-images" aria-hidden="true"></span>
								<span>Images</span>
							</button>
							<div class="netscape-toolbar-separator" aria-hidden="true"></div>
							<button type="button" class="netscape-tool-button" @click="focusBrowserAddress">
								<span class="netscape-tool-icon icon-open" aria-hidden="true"></span>
								<span>Open</span>
							</button>
							<button
								type="button"
								class="netscape-tool-button"
								@click="openInBrowser('https://duckduckgo.com/', 'Find', { backend: browserBackend, skin: browserSkin })"
							>
								<span class="netscape-tool-icon icon-find" aria-hidden="true"></span>
								<span>Find</span>
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
								@click="openInBrowser('https://library.okami.codes/library', 'Guided Tour', { backend: browserBackend, skin: browserSkin })"
							>
								Guided Tour
							</button>
							<button
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://library.okami.codes/', `What's New`, { backend: browserBackend, skin: browserSkin })"
							>
								What's New
							</button>
							<button
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://stackoverflow.com/questions', 'Questions', { backend: browserBackend, skin: browserSkin })"
							>
								Questions
							</button>
							<button
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://duckduckgo.com/', 'Net Search', { backend: browserBackend, skin: browserSkin })"
							>
								Net Search
							</button>
							<button
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://wiby.me/', 'Net Directory', { backend: browserBackend, skin: browserSkin })"
							>
								Net Directory
							</button>
							<button
								type="button"
								class="netscape-shortcut"
								@click="openInBrowser('https://groups.google.com/', 'Newsgroups', { backend: browserBackend, skin: browserSkin })"
							>
								Newsgroups
							</button>
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
								{{
									browserBackend === 'tor'
										? 'Routing through Tor relay render service...'
										: browserRenderMode === 'direct'
										? 'Opening in iframe. Compatibility mode will auto-load if blocked...'
										: 'Rendering compatibility snapshot through headless browser...'
								}}
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
								src="https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png"
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
						<br />
						<template v-for="link in recycleBinLinks" :key="link.href">
							<span class="link-prefix">[-]</span>
							<a :href="link.href" @click.prevent="openInBrowser(link.href, link.label)">
								{{ link.label }}
							</a>
							<br />
						</template>
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
								src="https://win98icons.alexmeub.com/icons/png/msie1-4.png"
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
					<img
						src="https://win98icons.alexmeub.com/icons/png/windows-0.png"
						width="16"
						height="16"
						alt="start button"
					/>
					<span>Start</span>
				</button>
				<div v-show="startMenuOpen" id="start-menu" class="start-menu">
					<div class="start-menu-header">
						<div class="start-menu-header-label">Windows XP</div>
					</div>
					<div class="start-menu-items">
						<button class="start-menu-item" @click="setTab('about')">
							<img
								src="https://win98icons.alexmeub.com/icons/png/font_tt-0.png"
								width="16"
								height="16"
								alt="about icon"
							/>
							<span>About</span>
						</button>
						<button class="start-menu-item" @click="setTab('projects')">
							<img
								src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png"
								width="16"
								height="16"
								alt="projects icon"
							/>
							<span>Projects</span>
						</button>
						<button
							class="start-menu-item"
							@click="openNetscapeBrowser(browserCurrentUrl || browserHomeUrl, 'Open Navigator')"
						>
							<img
								src="https://win98icons.alexmeub.com/icons/png/msie1-2.png"
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
						<button class="start-menu-item" @click="openWindowFromMenu('links')">
							<img
								src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png"
								width="16"
								height="16"
								alt="links window icon"
							/>
							<span>Open Links</span>
						</button>
						<button class="start-menu-item" @click="openWindowFromMenu('clock')">
							<img
								src="https://win98icons.alexmeub.com/icons/png/world-0.png"
								width="16"
								height="16"
								alt="clock window icon"
							/>
							<span>Open Clock</span>
						</button>
						<div class="start-menu-divider"></div>
						<button
							class="start-menu-item"
							@click="openNetscapeBrowser(browserHomeUrl, 'Home Page')"
						>
							<img
								src="https://win98icons.alexmeub.com/icons/png/msie1-2.png"
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
								src="https://win98icons.alexmeub.com/icons/png/standby_monitor_moon-0.png"
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
