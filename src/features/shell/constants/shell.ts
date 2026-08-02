import type {
	DesktopIcon,
	LinkGroup,
	NoisePreset,
	ShellShortcut,
	TabId,
	WindowId,
	WindowMeta,
	WindowPosition,
	WindowSizesMap,
	WindowStateMap
} from '~/src/features/shell/model/types';

export const browserHomeUrl = 'https://library.okami.codes/';
export const torBrowserHomeUrl = 'https://check.torproject.org/';
export const torSearchHomeUrl = 'https://ahmia.fi/';

export const vlcDefaultPlaylistId = 'RDPRGV4FEQFf4';
export const vlcDefaultPlaylistUrl = `https://www.youtube.com/playlist?list=${vlcDefaultPlaylistId}`;

export const guestLoginPasswordSeed = 'cobalt_2002';
export const mainWindowTitle = 'okami@workstation:~/control-room [b6fa7792]';
export const standardBrowserName = 'Netscape Navigator';
export const browserPlaceholderPrompt = 'Enter a website and press Go.';
export const desktopReadyStatus = 'workspace ready.';
export const shellFeatureFlags = {
	otaclock: false
} as const;

type ShellFeatureId = keyof typeof shellFeatureFlags;

const windowFeatureMap: Partial<Record<WindowId, ShellFeatureId>> = {
	otaclock: 'otaclock'
};

const shortcutFeatureMap: Partial<Record<string, ShellFeatureId>> = {
	otaclock: 'otaclock'
};

export function isWindowEnabled(windowId: WindowId) {
	const feature = windowFeatureMap[windowId];
	return feature ? shellFeatureFlags[feature] : true;
}

export function isShortcutEnabled(
	shortcut: Pick<ShellShortcut, 'id' | 'windowId'>
) {
	const featureFromId = shortcutFeatureMap[shortcut.id];
	if (featureFromId) {
		return shellFeatureFlags[featureFromId];
	}
	if (shortcut.windowId) {
		return isWindowEnabled(shortcut.windowId);
	}
	return true;
}

export const shellIcons = {
	computer: '/xp-icons/pack/computer.png',
	briefcase: '/xp-icons/pack/briefcase.png',
	freePalestine: '/xp-icons/pack/free-palestine.png',
	dissociationTracker: 'https://tracker.okami.codes/icons/icon-192.png',
	browser: '/xp-icons/pack/browser.png',
	chrome: '/xp-icons/pack/chrome.png',
	vlc: '/xp-icons/pack/vlc.png',
	noise: '/xp-icons/pack/media.png',
	cmd: '/xp-icons/pack/cmd.png',
	chat: '/xp-icons/pack/msn-messenger-icon.png',
	mines: '/xp-icons/pack/minesweeper-icon.png',
	paint: '/xp-icons/pack/paint.png',
	missingno: '/xp-icons/pack/missingno.webp',
	picture: '/xp-icons/pack/documents.png',
	control: '/xp-icons/pack/control-panel.png',
	accessibility: '/xp-icons/pack/accessibility-options.png',
	addRemovePrograms: '/xp-icons/pack/add-remove-programs.png',
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

export const tabs: Array<{ id: TabId; label: string }> = [
	{ id: 'about', label: 'About' },
	{ id: 'blog', label: 'Blog' },
	{ id: 'contact', label: 'Contact' }
];

export const xpThemes = [
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

export type XpThemeId = (typeof xpThemes)[number]['id'];

export const defaultThemeId: XpThemeId = 'luna-blue';
export const defaultBlinkieThemeId: XpThemeId = 'candy';
export const themeStorageKey = 'okami_portfolio_theme';

export const noisePresets: NoisePreset[] = [
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

export const linkGroups: LinkGroup[] = [
	{
		title: 'Neburose',
		links: [
			{ label: 'Neburose LLC', href: 'https://neburose.org' },
			{ label: 'Discord Bot' }
		]
	},
	{
		title: 'Web Projects',
		links: [
			{
				label: 'Constellations',
				href: 'https://constellations.okami.codes'
			},
			{ label: 'Progressive Victory', href: 'https://progress.win' },
			{ label: 'Smashcords', href: 'https://smashcords.com' },
			{ label: 'discord.js', href: 'https://discord.js.org' }
		]
	},
	{
		title: 'Socials',
		links: [
			{ label: 'GitHub', href: 'https://github.com/Lewdcario' },
			{ label: 'Twitter', href: 'https://twitter.com/okamicario' }
		]
	}
];

export const recycleBinShortcuts: ShellShortcut[] = [
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

const allDesktopIcons: DesktopIcon[] = [
	{
		id: 'portfolio',
		label: 'Portfolio',
		icon: shellIcons.briefcase,
		href: '/portfolio',
		x: 34,
		y: 48
	},
	{
		id: 'about-me',
		label: 'About Me',
		icon: shellIcons.browser,
		href: 'https://library.okami.codes',
		x: 34,
		y: 156
	},
	{
		id: 'tor-browser',
		label: 'Tor Browser',
		icon: '/tor-browser-icon.png',
		href: torBrowserHomeUrl,
		tor: true,
		x: 34,
		y: 264
	},
	{
		id: 'vlc-player',
		label: 'VLC Player',
		icon: shellIcons.vlc,
		windowId: 'vlc',
		x: 34,
		y: 372
	},
	{
		id: 'noise-generator',
		label: 'Noise Player',
		icon: shellIcons.noise,
		windowId: 'noise',
		x: 34,
		y: 480
	},
	{
		id: 'cmd',
		label: 'Command Prompt',
		icon: shellIcons.cmd,
		windowId: 'cmd',
		x: 130,
		y: 48
	},
	{
		id: 'msn-chat',
		label: 'MSN Chat',
		icon: shellIcons.chat,
		windowId: 'chat',
		x: 130,
		y: 156
	},
	{
		id: 'otaclock',
		label: 'OtaClock',
		icon: shellIcons.otaclock,
		windowId: 'otaclock',
		x: 130,
		y: 372
	},
	{
		id: 'contact',
		label: 'Contact',
		icon: shellIcons.contact,
		tab: 'contact',
		x: 226,
		y: 48
	},
	{
		id: 'control-panel',
		label: 'Control Panel',
		icon: shellIcons.control,
		windowId: 'control',
		x: 226,
		y: 156
	},
	{
		id: 'minesweeper',
		label: 'Minesweeper',
		icon: shellIcons.mines,
		windowId: 'mines',
		x: 226,
		y: 264
	},
	{
		id: 'paint',
		label: 'Paint',
		icon: shellIcons.paint,
		windowId: 'paint',
		x: 226,
		y: 372
	},
	{
		id: 'my-pictures',
		label: 'My Art',
		icon: shellIcons.picture,
		windowId: 'gallery',
		x: 322,
		y: 48
	},
	{
		id: 'missingno',
		label: 'MISSINGNO.',
		icon: shellIcons.missingno,
		x: 322,
		y: 264
	},
	{
		id: 'dissociation-tracker',
		label: 'Dissociation Tracker',
		icon: shellIcons.dissociationTracker,
		href: 'https://tracker.okami.codes/',
		x: 322,
		y: 372
	},
	{
		id: 'free-palestine',
		label: 'FREE PALESTINE!!!',
		icon: shellIcons.freePalestine,
		href: 'https://www.pcrf.net/',
		x: 322,
		y: 156
	},
	{
		id: 'recycle-bin',
		label: 'Recycle Bin',
		icon: shellIcons.recycle,
		recycle: true,
		x: 322,
		y: 480
	}
];

export const desktopIcons: DesktopIcon[] = allDesktopIcons.filter((icon) =>
	isShortcutEnabled(icon)
);

const allWindowsMeta: WindowMeta[] = [
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
		label: mainWindowTitle,
		icon: shellIcons.shell
	},
	{
		id: 'browser',
		label: standardBrowserName,
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
		id: 'cmd',
		label: 'Command Prompt',
		icon: shellIcons.cmd
	},
	{
		id: 'chat',
		label: 'MSN Chat',
		icon: shellIcons.chat
	},
	{
		id: 'mines',
		label: 'Minesweeper',
		icon: shellIcons.mines
	},
	{
		id: 'paint',
		label: 'Paint',
		icon: shellIcons.paint
	},
	{
		id: 'gallery',
		label: 'My Art',
		icon: shellIcons.picture
	},
	{
		id: 'control',
		label: 'Control Panel',
		icon: shellIcons.control
	},
	{
		id: 'otaclock',
		label: 'OtaClock',
		icon: shellIcons.otaclock
	}
];

export const windowsMeta: WindowMeta[] = allWindowsMeta.filter((entry) =>
	isWindowEnabled(entry.id)
);

export function createDefaultWindowPositions(): Record<
	WindowId,
	WindowPosition
> {
	return {
		links: { x: 150, y: 66, z: 6 },
		clock: { x: 150, y: 330, z: 7 },
		main: { x: 380, y: 58, z: 8 },
		browser: { x: 300, y: 96, z: 9 },
		recycle: { x: 540, y: 132, z: 10 },
		vlc: { x: 460, y: 120, z: 11 },
		noise: { x: 690, y: 190, z: 12 },
		cmd: { x: 720, y: 220, z: 13 },
		otaclock: { x: 880, y: 120, z: 14 },
		chat: { x: 690, y: 138, z: 16 },
		mines: { x: 760, y: 170, z: 17 },
		control: { x: 580, y: 140, z: 18 },
		paint: { x: 640, y: 164, z: 19 },
		gallery: { x: 420, y: 96, z: 20 }
	};
}

export function createDefaultWindowState(): WindowStateMap {
	return {
		links: { isOpen: true, isMinimized: false, isMaximized: false },
		clock: { isOpen: true, isMinimized: false, isMaximized: false },
		main: { isOpen: true, isMinimized: false, isMaximized: false },
		browser: { isOpen: false, isMinimized: false, isMaximized: false },
		recycle: { isOpen: false, isMinimized: false, isMaximized: false },
		vlc: { isOpen: false, isMinimized: false, isMaximized: false },
		noise: { isOpen: false, isMinimized: false, isMaximized: false },
		cmd: { isOpen: false, isMinimized: false, isMaximized: false },
		chat: { isOpen: true, isMinimized: false, isMaximized: false },
		mines: { isOpen: false, isMinimized: false, isMaximized: false },
		paint: { isOpen: false, isMinimized: false, isMaximized: false },
		gallery: { isOpen: false, isMinimized: false, isMaximized: false },
		control: { isOpen: false, isMinimized: false, isMaximized: false },
		otaclock: { isOpen: false, isMinimized: false, isMaximized: false }
	};
}

export function noiseWindowHeightForPresetList() {
	const shellControlsHeight = 212;
	const presetItemHeight = 43;
	const presetItemGap = 5;
	const presetCount = Math.max(1, noisePresets.length);
	return (
		shellControlsHeight +
		presetCount * presetItemHeight +
		(presetCount - 1) * presetItemGap
	);
}

export function createDefaultWindowSizes(): WindowSizesMap {
	return {
		links: { width: 220, height: 230 },
		clock: { width: 220, height: 150 },
		main: { width: 860, height: 620 },
		browser: { width: 820, height: 600 },
		recycle: { width: 360, height: 280 },
		vlc: { width: 640, height: 430 },
		noise: { width: 430, height: noiseWindowHeightForPresetList() },
		cmd: { width: 560, height: 360 },
		chat: { width: 700, height: 470 },
		mines: { width: 320, height: 410 },
		paint: { width: 760, height: 560 },
		gallery: { width: 780, height: 560 },
		control: { width: 720, height: 620 },
		otaclock: { width: 440, height: 520 }
	};
}
