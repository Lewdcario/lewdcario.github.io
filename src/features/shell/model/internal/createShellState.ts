import { ref } from 'vue';
import type { AuthSessionRole } from '~/shared/auth';
import type { BlogPost } from '~/shared/blog';
import type { ChatBlacklistedWord, ChatMessage } from '~/shared/chat';
import {
	browserPlaceholderPrompt,
	browserHomeUrl,
	createDefaultWindowPositions,
	createDefaultWindowSizes,
	createDefaultWindowState,
	desktopReadyStatus,
	defaultThemeId,
	standardBrowserName,
	type XpThemeId,
	vlcDefaultPlaylistId,
	vlcDefaultPlaylistUrl
} from '~/src/features/shell/constants/shell';
import type {
	ContextTarget,
	DragState,
	NoisePresetId,
	PowerState,
	SplashMode,
	TabId,
	WindowId,
	WindowPosition
} from '~/src/features/shell/model/types';

function initialBrowserPlaceholderDocument(url: string) {
	return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font:12px Tahoma,Arial,sans-serif;background:#fff;color:#111}h1{margin:0 0 8px;font-size:13px}.hint{color:#555}</style></head><body><h1>${standardBrowserName}</h1><p>${browserPlaceholderPrompt}</p><p class="hint">${url}</p></body></html>`;
}

export function createShellState() {
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
	const statusMessage = ref(desktopReadyStatus);
	const isCompactLayout = ref(false);
	const iconPositions = ref<Record<string, { x: number; y: number }>>({});
	const windowPositions = ref<Record<WindowId, WindowPosition>>(
		createDefaultWindowPositions()
	);
	const windowState = ref(createDefaultWindowState());
	const windowSizes = ref(createDefaultWindowSizes());
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
	const browserDocument = ref(
		initialBrowserPlaceholderDocument(browserHomeUrl)
	);
	const browserFrameSrc = ref(browserHomeUrl);
	const browserRenderMode = ref<'direct' | 'snapshot'>('snapshot');
	const browserBackend = ref<'standard' | 'tor'>('standard');
	const browserSkin = ref<'netscape' | 'tor'>('netscape');
	const browserFrameRef = ref<HTMLIFrameElement | null>(null);
	const browserAddressInputRef = ref<HTMLInputElement | null>(null);
	const browserSearchInputRef = ref<HTMLInputElement | null>(null);
	const browserLoading = ref(false);
	const browserError = ref('');
	const browserTitle = ref(standardBrowserName);
	const browserHistory = ref<string[]>([browserHomeUrl]);
	const browserHistoryIndex = ref(0);
	const browserSearchMenuOpen = ref(false);
	const browserSearchQuery = ref('');
	const browserSearchEngine = ref<
		'ahmia' | 'duckduckgo' | 'wiby' | 'startpage'
	>('duckduckgo');
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
	const chatMessages = ref<ChatMessage[]>([]);
	const chatLoading = ref(false);
	const chatError = ref('');
	const chatName = ref('');
	const chatDraft = ref('');
	const chatSending = ref(false);
	const chatBlacklistWords = ref<ChatBlacklistedWord[]>([]);
	const chatModerationOpen = ref(false);
	const chatModerationLoading = ref(false);
	const chatModerationError = ref('');
	const chatBlacklistDraft = ref('');
	const chatBlacklistSaving = ref(false);
	const chatDeletingMessageId = ref<number | null>(null);
	const chatDeletingBlacklistWordId = ref<number | null>(null);
	const blinkieBadges = ref<string[]>([]);
	const blinkieStamps = ref<string[]>([]);
	const blinkieLoading = ref(false);
	const blinkieError = ref('');
	const contextMenuRef = ref<HTMLElement | null>(null);
	const contextMenuVisible = ref(false);
	const contextMenuX = ref(0);
	const contextMenuY = ref(0);
	const contextTarget = ref<ContextTarget>({ type: 'desktop' });
	const missingnoCrashVisible = ref(false);
	const missingnoCrashProgress = ref(0);
	const missingnoCrashPhase = ref<'idle' | 'desktop' | 'counting'>('idle');

	return {
		splashVisible,
		splashMode,
		powerState,
		selectedLoginUser,
		sessionRole,
		adminLoginPassword,
		loginSubmitting,
		loginError,
		activeThemeId,
		activeTab,
		startMenuOpen,
		liveClock,
		taskbarClock,
		otaClockNow,
		visitorCount,
		statusMessage,
		isCompactLayout,
		iconPositions,
		windowPositions,
		windowState,
		windowSizes,
		linksWindowRef,
		clockWindowRef,
		mainWindowRef,
		browserWindowRef,
		recycleWindowRef,
		vlcWindowRef,
		noiseWindowRef,
		otaClockWindowRef,
		activeDrag,
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
		vlcFrameRef,
		vlcPlaylistInput,
		vlcPlaylistId,
		vlcError,
		vlcVolume,
		vlcMuted,
		vlcHideYoutubeControls,
		vlcEmbedOrigin,
		vlcSourcePanelOpen,
		vlcCurrentSeconds,
		vlcDurationSeconds,
		noisePresetId,
		noiseVolume,
		noiseIsPlaying,
		noiseError,
		otaClockAudioLaughRef,
		otaClockAudioOkRef,
		otaClockUse24Hour,
		otaClockAlarmEnabled,
		otaClockAlarmSound,
		otaClockAlarmDuration,
		otaClockAlarmTimesInput,
		otaClockAlwaysOnTop,
		otaClockLockPosition,
		otaClockScale,
		otaClockRinging,
		otaClockConfigOpen,
		blogPosts,
		selectedBlogPostId,
		blogLoading,
		blogError,
		blogComposerTitle,
		blogComposerExcerpt,
		blogComposerContent,
		blogComposerPublished,
		blogComposerSaving,
		blogComposerError,
		blogEditingPostId,
		blogDeletingPostId,
		chatMessages,
		chatLoading,
		chatError,
		chatName,
		chatDraft,
		chatSending,
		chatBlacklistWords,
		chatModerationOpen,
		chatModerationLoading,
		chatModerationError,
		chatBlacklistDraft,
		chatBlacklistSaving,
		chatDeletingMessageId,
		chatDeletingBlacklistWordId,
		blinkieBadges,
		blinkieStamps,
		blinkieLoading,
		blinkieError,
		contextMenuRef,
		contextMenuVisible,
		contextMenuX,
		contextMenuY,
		contextTarget,
		missingnoCrashVisible,
		missingnoCrashProgress,
		missingnoCrashPhase
	};
}
