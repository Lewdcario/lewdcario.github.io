<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import projects, { type PortfolioProject } from '../data/projects';

type TabId = 'about' | 'projects' | 'contact';

interface DesktopIcon {
	id: string;
	label: string;
	icon: string;
	href?: string;
	tab?: TabId;
	x: number;
	y: number;
	recycle?: boolean;
}

type WindowId = 'links' | 'clock' | 'main' | 'browser';
type SplashMode = 'boot' | 'login';
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

const tabs: Array<{ id: TabId; label: string }> = [
	{ id: 'about', label: 'About' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'contact', label: 'Contact' }
];

const bootLines: Array<{ time: string; text: string }> = [
	{ time: '[0.000]', text: ' loading okami.portfolio...' },
	{ time: '[0.011]', text: ' mounting /desktop/icons' },
	{ time: '[0.024]', text: ' initializing 98.css shell' },
	{ time: '[0.036]', text: ' preparing desktop windows' },
	{ time: '[0.049]', text: ' all systems nominal' }
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
		label: 'Browser',
		icon: 'https://win98icons.alexmeub.com/icons/png/msie1-2.png'
	}
];

function createDefaultWindowPositions(): Record<WindowId, WindowPosition> {
	return {
		links: { x: 150, y: 66, z: 6 },
		clock: { x: 150, y: 330, z: 7 },
		main: { x: 380, y: 58, z: 8 },
		browser: { x: 300, y: 96, z: 9 }
	};
}

function createDefaultWindowState() {
	return {
		links: { isOpen: true, isMinimized: false, isMaximized: false },
		clock: { isOpen: true, isMinimized: false, isMaximized: false },
		main: { isOpen: true, isMinimized: false, isMaximized: false },
		browser: { isOpen: false, isMinimized: false, isMaximized: false }
	};
}

function createDefaultWindowSizes() {
	return {
		links: { width: 220, height: 230 },
		clock: { width: 220, height: 150 },
		main: { width: 860, height: 620 },
		browser: { width: 760, height: 560 }
	};
}

const splashVisible = ref(true);
const splashMode = ref<SplashMode>('boot');
const powerState = ref<PowerState>('idle');
const showContinueButton = ref(false);
const bootOutput = ref<Array<{ time: string; text: string }>>([]);
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
const activeDrag = ref<DragState | null>(null);
const browserUrl = ref('https://vmfunc.re/');
const browserAddress = ref('https://vmfunc.re/');
const browserFrameRef = ref<HTMLIFrameElement | null>(null);
const browserLoading = ref(false);
const browserBlocked = ref(false);

const marqueeText =
	'okami portfolio - windows shell rewrite - click around like it is 2002';
const onlineStatus = 'online';

const visitorDisplay = computed(
	() => `visitors: ${visitorCount.value.toString().padStart(6, '0')}`
);
const splashTitle = computed(() =>
	splashMode.value === 'boot' ? 'sys/init' : 'winlogon'
);
const splashButtonLabel = computed(() =>
	splashMode.value === 'boot' ? 'continue' : 'OK'
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
		.map((windowMeta) => ({
			...windowMeta,
			...windowState.value[windowMeta.id]
		}))
);

let statusTimer: number | null = null;
let clockTimer: number | null = null;
let browserLoadTimer: number | null = null;
let disposed = false;
let zCounter = 9;
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
	const windowMeta = windowsMeta.find((entry) => entry.id === windowId);
	return windowMeta?.label ?? windowId;
}

function normalizeBrowserUrl(rawUrl: string) {
	const trimmed = rawUrl.trim();
	if (!trimmed) return 'https://vmfunc.re/';
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

function openInBrowser(url: string, label?: string) {
	const normalized = normalizeBrowserUrl(url);
	if (browserLoadTimer !== null) {
		window.clearTimeout(browserLoadTimer);
		browserLoadTimer = null;
	}

	browserLoading.value = true;
	browserBlocked.value = false;
	browserUrl.value = normalized;
	browserAddress.value = normalized;

	browserLoadTimer = window.setTimeout(() => {
		if (!browserLoading.value) return;
		browserLoading.value = false;
		browserBlocked.value = true;
		pushStatus('This site is taking too long or blocks iframe embedding.');
		browserLoadTimer = null;
	}, 6000);

	restoreWindow('browser', false);
	startMenuOpen.value = false;
	focusWindow('browser');
	pushStatus(`${label ?? normalized} opened in browser.`);
}

function navigateBrowserAddress() {
	openInBrowser(browserAddress.value, 'Browser');
}

function handleBrowserFrameLoad() {
	if (browserLoadTimer !== null) {
		window.clearTimeout(browserLoadTimer);
		browserLoadTimer = null;
	}

	browserLoading.value = false;

	const frame = browserFrameRef.value;
	if (!frame) return;

	try {
		const href = frame.contentWindow?.location.href ?? '';
		if (browserUrl.value !== 'about:blank' && href === 'about:blank') {
			browserBlocked.value = true;
			pushStatus('This site blocks in-window embedding. Use Open externally.');
		}
	} catch {
		// Cross-origin content loaded normally.
		browserBlocked.value = false;
	}
}

function openBrowserExternally() {
	const target = browserUrl.value || browserAddress.value;
	const externalWindow = window.open(target, '_blank', 'noopener,noreferrer');
	if (externalWindow) {
		externalWindow.opener = null;
	}
	pushStatus('Opened in external browser tab.');
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
		pushStatus('Recycle Bin is already empty.');
		return;
	}

	if (icon.tab) {
		event.preventDefault();
		setTab(icon.tab);
		return;
	}

	if (!icon.href) {
		event.preventDefault();
		return;
	}

	event.preventDefault();
	openInBrowser(icon.href, icon.label);
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
	startMenuOpen.value = !startMenuOpen.value;
}

function closeStartMenuOnOutsideClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	if (!target?.closest('.start-button')) {
		startMenuOpen.value = false;
	}
}

function runSoftAction(name: string) {
	startMenuOpen.value = false;
	pushStatus(name);
}

function resetSessionState() {
	if (browserLoadTimer !== null) {
		window.clearTimeout(browserLoadTimer);
		browserLoadTimer = null;
	}

	activeDrag.value = null;
	draggedIconIds.clear();
	activeTab.value = 'about';
	startMenuOpen.value = false;
	statusMessage.value = 'desktop ready.';
	browserLoading.value = false;
	browserBlocked.value = false;
	browserUrl.value = 'https://vmfunc.re/';
	browserAddress.value = browserUrl.value;
	windowState.value = createDefaultWindowState();
	windowPositions.value = createDefaultWindowPositions();
	windowSizes.value = createDefaultWindowSizes();
	zCounter = 9;
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
	bootOutput.value = [];
	resetSessionState();
}

async function runBootSequence() {
	splashMode.value = 'boot';
	bootOutput.value = [];
	showContinueButton.value = false;

	for (const line of bootLines) {
		if (disposed) return;

		const nextLine = { time: line.time, text: '' };
		bootOutput.value = [...bootOutput.value, nextLine];

		for (const character of line.text) {
			if (disposed) return;
			nextLine.text += character;
			bootOutput.value = [...bootOutput.value];
			await pause(randomBetween(3, 8));
		}

		await pause(randomBetween(70, 130));
	}

	showContinueButton.value = true;
}

function continueToDesktop() {
	const mode = splashMode.value;
	splashVisible.value = false;
	pushStatus(mode === 'login' ? 'signed in.' : 'desktop loaded.');
}

function handleWindowResize() {
	normalizeDesktopLayout();
}

onMounted(() => {
	document.title = 'Okami Portfolio';
	incrementVisitorCount();
	normalizeDesktopLayout();
	updateClocks();
	clockTimer = window.setInterval(updateClocks, 1000);
	document.addEventListener('click', closeStartMenuOnOutsideClick);
	window.addEventListener('resize', handleWindowResize);
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', releaseActiveDrag);
	window.addEventListener('pointercancel', releaseActiveDrag);
	void runBootSequence();
});

onBeforeUnmount(() => {
	disposed = true;

	if (statusTimer !== null) {
		window.clearTimeout(statusTimer);
	}

	if (clockTimer !== null) {
		window.clearInterval(clockTimer);
	}

	if (browserLoadTimer !== null) {
		window.clearTimeout(browserLoadTimer);
	}

	document.removeEventListener('click', closeStartMenuOnOutsideClick);
	window.removeEventListener('resize', handleWindowResize);
	window.removeEventListener('pointermove', handlePointerMove);
	window.removeEventListener('pointerup', releaseActiveDrag);
	window.removeEventListener('pointercancel', releaseActiveDrag);
});
</script>

<template>
	<div class="xp-shell">
		<div
			v-if="splashVisible"
			id="splash-screen"
			class="splash-screen"
			:class="`splash-screen-${splashMode}`"
		>
			<div v-if="splashMode === 'boot'" class="splash-content">
				<div class="window splash-window">
					<div class="title-bar">
						<div class="title-bar-text">{{ splashTitle }}</div>
						<div class="title-bar-controls">
							<button aria-label="Minimize"></button>
							<button aria-label="Maximize"></button>
							<button aria-label="Close"></button>
						</div>
					</div>
					<div class="window-body splash-body">
						<div id="boot-log">
							<div v-for="line in bootOutput" :key="line.time + line.text">
								<span class="boot-time">{{ line.time }}</span>
								{{ line.text }}
							</div>
						</div>
						<div v-if="showContinueButton" id="boot-continue">
							<button id="enter-button" @click="continueToDesktop">
								{{ splashButtonLabel }}
							</button>
						</div>
					</div>
				</div>
			</div>
			<div v-else class="xp-login-screen">
				<div class="xp-login-topbar"></div>
				<div class="xp-login-main">
					<div class="xp-login-panel">
						<div class="xp-login-left">
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
							<p class="xp-login-prompt">To begin, click your user name</p>
						</div>
						<div class="xp-login-divider"></div>
						<div class="xp-login-user">
							<div class="xp-login-avatar" aria-hidden="true">O</div>
							<p class="xp-login-user-name">okami</p>
							<button
								v-if="showContinueButton"
								id="enter-button"
								class="xp-login-ok"
								@click="continueToDesktop"
							>
								{{ splashButtonLabel }}
							</button>
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
								src="https://win98icons.alexmeub.com/icons/png/msie1-2.png"
								width="12"
								height="12"
								alt="browser icon"
							/>
							Browser
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
					<div class="window-body browser-window-body">
						<div class="field-row browser-toolbar">
							<label for="browser-address">Address</label>
							<input
								id="browser-address"
								v-model="browserAddress"
								type="text"
								@keydown.enter.prevent="navigateBrowserAddress"
							/>
							<button @click="navigateBrowserAddress">Go</button>
						</div>
						<iframe
							ref="browserFrameRef"
							class="browser-frame"
							:src="browserUrl"
							title="Internal browser"
							loading="lazy"
							@load="handleBrowserFrameLoad"
						></iframe>
						<div v-if="browserLoading" class="browser-overlay browser-loading">
							Loading page...
						</div>
						<div v-else-if="browserBlocked" class="browser-overlay browser-blocked">
							<div>This site refused iframe embedding.</div>
							<button @click="openBrowserExternally">Open externally</button>
						</div>
						<p class="browser-note">
							Some sites block iframe embedding. If that happens, try another link.
						</p>
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
					v-if="isWindowVisible('main')"
					ref="mainWindowRef"
					class="window main-window draggable-window"
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
								<br />
								this portfolio shell is a full rewrite inspired by
								<a href="https://vmfunc.re/" @click.prevent="openInBrowser('https://vmfunc.re/', 'vmfunc.re')">vmfunc.re</a>
								with a windows xp/98 navigation feel.
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
						<button class="start-menu-item" @click="openWindowFromMenu('browser')">
							<img
								src="https://win98icons.alexmeub.com/icons/png/msie1-2.png"
								width="16"
								height="16"
								alt="browser icon"
							/>
							<span>Open Browser</span>
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
							@click="openInBrowser('https://vmfunc.re/', 'Reference design')"
						>
							<img
								src="https://win98icons.alexmeub.com/icons/png/msie1-2.png"
								width="16"
								height="16"
								alt="reference icon"
							/>
							<span>Reference Site</span>
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
