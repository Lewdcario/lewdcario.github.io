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

export const vlcDefaultPlaylistUrl =
	'https://www.youtube.com/watch?v=_laE9-4N3bA&list=PLvVEXejrE-HT5SPUUMaZ1QcTxa2S3PvPw';
export const vlcDefaultPlaylistId = 'PLvVEXejrE-HT5SPUUMaZ1QcTxa2S3PvPw';

export const guestLoginPasswordSeed = 'cobalt_2002';

export const shellIcons = {
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

export const tabs: Array<{ id: TabId; label: string }> = [
	{ id: 'about', label: 'About' },
	{ id: 'projects', label: 'Projects' },
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

export const desktopIcons: DesktopIcon[] = [
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

export const windowsMeta: WindowMeta[] = [
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

export function createDefaultWindowPositions(): Record<WindowId, WindowPosition> {
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

export function createDefaultWindowState(): WindowStateMap {
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

export function noiseWindowHeightForPresetList() {
	const shellControlsHeight = 212;
	const presetItemHeight = 43;
	const presetItemGap = 5;
	const presetCount = Math.max(1, noisePresets.length);
	return shellControlsHeight + presetCount * presetItemHeight + (presetCount - 1) * presetItemGap;
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
		otaclock: { width: 440, height: 520 }
	};
}
