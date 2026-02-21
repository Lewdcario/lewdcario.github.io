export type TabId = 'about' | 'projects' | 'blog' | 'contact';

export type WindowId =
	| 'links'
	| 'clock'
	| 'main'
	| 'browser'
	| 'recycle'
	| 'vlc'
	| 'noise'
	| 'cmd'
	| 'chat'
	| 'otaclock'
	| 'remote';

export interface ShellShortcut {
	id: string;
	label: string;
	icon: string;
	href?: string;
	tab?: TabId;
	tor?: boolean;
	recycle?: boolean;
	windowId?: WindowId;
}

export interface DesktopIcon extends ShellShortcut {
	x: number;
	y: number;
}

export type SplashMode = 'startup' | 'login';
export type PowerState = 'idle' | 'loggingOff' | 'shuttingDown';
export type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface WindowPosition {
	x: number;
	y: number;
	z: number;
}

export interface WindowSize {
	width: number;
	height: number;
}

export interface WindowVisibilityState {
	isOpen: boolean;
	isMinimized: boolean;
	isMaximized: boolean;
}

export type WindowStateMap = Record<WindowId, WindowVisibilityState>;
export type WindowSizesMap = Record<WindowId, WindowSize>;

export interface DragState {
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

export interface LinkGroup {
	title: string;
	links: Array<{ label: string; href: string }>;
}

export interface WindowMeta {
	id: WindowId;
	label: string;
	icon: string;
}

export type ContextTargetType =
	| 'desktop'
	| 'icon'
	| 'window'
	| 'taskbar'
	| 'start';

export interface ContextTarget {
	type: ContextTargetType;
	id?: string;
}

export interface ContextMenuItem {
	id: string;
	label: string;
	disabled?: boolean;
	separator?: boolean;
	action: () => void;
}

export interface BrowserRenderPayload {
	url: string;
	html: string;
	title?: string;
}

export type BrowserRenderMode = 'direct' | 'snapshot';
export type BrowserBackend = 'standard' | 'tor';
export type BrowserSkin = 'netscape' | 'tor';
export type BrowserSearchEngineId =
	| 'ahmia'
	| 'duckduckgo'
	| 'wiby'
	| 'startpage';

export interface BrowserRequestOptions {
	pushHistory?: boolean;
	backend?: BrowserBackend;
	skin?: BrowserSkin;
}

export interface BlinkiePayload {
	theme: string;
	badges: string[];
	stamps: string[];
}

export type NoisePresetId =
	| 'brown-drift'
	| 'white-static'
	| 'pink-cloud'
	| 'tape-hiss'
	| 'purring-white';

export type NoiseSourceType = 'noise' | 'purr';

export interface NoisePreset {
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
}
