import { onBeforeUnmount, onMounted, watch } from 'vue';
import projects, { type PortfolioProject } from '~/src/data/projects';
import { createNoiseEngine } from '~/src/features/noise/model/createNoiseEngine';
import { themeStorageKey } from '~/src/features/shell/constants/shell';
import { createBrowserMediaActions } from '~/src/features/shell/model/internal/createBrowserMediaActions';
import { createBlogActions } from '~/src/features/shell/model/internal/createBlogActions';
import { createChatActions } from '~/src/features/shell/model/internal/createChatActions';
import { createDesktopActions } from '~/src/features/shell/model/internal/createDesktopActions';
import { createSessionActions } from '~/src/features/shell/model/internal/createSessionActions';
import { createShellState } from '~/src/features/shell/model/internal/createShellState';
import { createShellComputedState } from '~/src/features/shell/model/internal/createShellComputedState';
import { createShellContextMenuState } from '~/src/features/shell/model/internal/createShellContextMenuState';
import { createShellUtilities } from '~/src/features/shell/model/internal/createShellUtilities';

function buildShellController() {
	const {
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
		blinkieBadges,
		blinkieStamps,
		blinkieLoading,
		blinkieError,
		contextMenuRef,
		contextMenuVisible,
		contextMenuX,
		contextMenuY,
		contextTarget
	} = createShellState();

	const noiseEngine = createNoiseEngine();

	const {
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
	} = createShellComputedState({
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
	});
	let clockTimer: number | null = null;
	let otaClockAlarmStopTimer: number | null = null;
	const lifecycleRuntime = {
		disposed: false
	};
	const browserRuntime = {
		requestSerial: 0,
		fallbackTimer: null as number | null
	};
	const windowRuntime = {
		zCounter: 24,
		draggedIconIds: new Set<string>()
	};

	const {
		randomBetween,
		pause,
		incrementVisitorCount,
		pushStatus,
		isThemeId,
		themeLabel,
		applyTheme,
		setTheme,
		blinkieFolderForTheme,
		loadThemeBlinkies,
		readApiErrorMessage,
		disposeShellUtilities
	} = createShellUtilities({
		statusMessage,
		startMenuOpen,
		activeThemeId,
		visitorCount,
		blinkieBadges,
		blinkieStamps,
		blinkieLoading,
		blinkieError,
		lifecycleRuntime
	});

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
		const audioElements = [
			otaClockAudioLaughRef.value,
			otaClockAudioOkRef.value
		];
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
		desktopActions.restoreWindow('otaclock', false);
		desktopActions.focusWindow('otaclock');

		const targetAudio =
			otaClockAlarmSound.value === 'LAUGH'
				? otaClockAudioLaughRef.value
				: otaClockAudioOkRef.value;

		if (targetAudio) {
			targetAudio.loop = true;
			void targetAudio.play().catch(() => {
				pushStatus(
					'OtaClock alarm triggered. Click Stop Alarm to silence it.'
				);
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

		const activeAlarms = parseOtaClockAlarmTimes(
			otaClockAlarmTimesInput.value
		);
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

	const blogActions = createBlogActions({
		sessionRole,
		blogLoading,
		blogError,
		blogPosts,
		selectedBlogPostId,
		blogEditingPostId,
		blogDeletingPostId,
		blogComposerTitle,
		blogComposerExcerpt,
		blogComposerContent,
		blogComposerPublished,
		blogComposerSaving,
		blogComposerError,
		signedInAsAdmin,
		selectedBlogPost,
		markdownRenderer,
		pushStatus,
		readApiErrorMessage
	});

	const chatActions = createChatActions({
		chatMessages,
		chatLoading,
		chatError,
		chatName,
		chatDraft,
		chatSending,
		pushStatus,
		readApiErrorMessage
	});

	let sessionActions: any = null;
	let browserMediaActions: any = null;
	let chatPollTimer: number | null = null;

	const desktopActions = createDesktopActions({
		activeTab,
		startMenuOpen,
		isCompactLayout,
		iconPositions,
		windowPositions,
		windowState,
		windowSizes,
		activeDrag,
		otaClockAlwaysOnTop,
		otaClockLockPosition,
		otaClockConfigOpen,
		browserCurrentUrl,
		browserSkin,
		browserShellTitle,
		contextMenuRef,
		contextMenuVisible,
		contextMenuX,
		contextMenuY,
		contextTarget,
		splashVisible,
		powerState,
		blogLoading,
		loadBlogPosts: blogActions.loadBlogPosts,
		pushStatus,
		openInBrowser: (...args: unknown[]) =>
			browserMediaActions.openInBrowser(...args),
		openStandardBrowser: (...args: unknown[]) =>
			browserMediaActions.openStandardBrowser(...args),
		openTorBrowser: (...args: unknown[]) =>
			browserMediaActions.openTorBrowser(...args),
		openVlcWindow: (...args: unknown[]) =>
			browserMediaActions.openVlcWindow(...args),
		openNoiseWindow: (...args: unknown[]) =>
			browserMediaActions.openNoiseWindow(...args),
		openOtaClockWindow: (...args: unknown[]) =>
			browserMediaActions.openOtaClockWindow(...args),
		performLogoff: (...args: unknown[]) =>
			sessionActions.performLogoff(...args),
		clearBrowserFallbackTimer: (...args: unknown[]) =>
			browserMediaActions.clearBrowserFallbackTimer(...args),
		stopBrowserLoading: (...args: unknown[]) =>
			browserMediaActions.stopBrowserLoading(...args),
		stopNoiseGenerator: (...args: unknown[]) =>
			browserMediaActions.stopNoiseGenerator(...args),
		stopOtaClockAlarm,
		windowRuntime
	});

	browserMediaActions = createBrowserMediaActions({
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
		vlcEmbedOrigin,
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
		restoreWindow: desktopActions.restoreWindow,
		focusWindow: desktopActions.focusWindow,
		browserRuntime,
		lifecycleRuntime
	});

	sessionActions = createSessionActions({
		selectedLoginUser,
		loginError,
		adminLoginPassword,
		activeDrag,
		windowRuntime,
		activeTab,
		startMenuOpen,
		closeContextMenu: desktopActions.closeContextMenu,
		clearBrowserFallbackTimer:
			browserMediaActions.clearBrowserFallbackTimer,
		stopOtaClockAlarm,
		stopNoiseGenerator: browserMediaActions.stopNoiseGenerator,
		loginSubmitting,
		sessionRole,
		statusMessage,
		browserRuntime,
		browserLoading,
		browserError,
		browserBackend,
		browserSkin,
		browserTitle,
		browserCurrentUrl,
		browserAddress,
		browserFrameSrc,
		browserRenderMode,
		browserDocument,
		browserPlaceholderDocument:
			browserMediaActions.browserPlaceholderDocument,
		browserHistory,
		browserHistoryIndex,
		browserSearchMenuOpen,
		browserSearchQuery,
		browserSearchEngine,
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
		otaClockUse24Hour,
		otaClockAlarmEnabled,
		otaClockAlarmSound,
		otaClockAlarmDuration,
		otaClockAlarmTimesInput,
		otaClockAlwaysOnTop,
		otaClockLockPosition,
		otaClockScale,
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
		windowState,
		windowPositions,
		windowSizes,
		normalizeDesktopLayout: desktopActions.normalizeDesktopLayout,
		powerState,
		pushStatus,
		pause,
		splashMode,
		splashVisible,
		loadBlogPosts: blogActions.loadBlogPosts,
		readApiErrorMessage,
		lifecycleRuntime
	});

	const { contextMenuTitle, contextMenuItems } = createShellContextMenuState({
		contextTarget,
		windowState,
		isCompactLayout,
		browserShellTitle,
		browserCurrentUrl,
		pushStatus,
		handleDesktopIconContextAction:
			desktopActions.handleDesktopIconContextAction,
		openTorBrowser: browserMediaActions.openTorBrowser,
		openInBrowser: browserMediaActions.openInBrowser,
		toggleMaximizeWindow: desktopActions.toggleMaximizeWindow,
		minimizeWindow: desktopActions.minimizeWindow,
		closeWindow: desktopActions.closeWindow,
		openStandardBrowser: browserMediaActions.openStandardBrowser,
		openVlcWindow: browserMediaActions.openVlcWindow,
		openNoiseWindow: browserMediaActions.openNoiseWindow,
		openChatWindow: () => desktopActions.openWindowFromMenu('chat'),
		openMinesWindow: () => desktopActions.openWindowFromMenu('mines'),
		openControlWindow: () => desktopActions.openWindowFromMenu('control'),
		openOtaClockWindow: browserMediaActions.openOtaClockWindow,
		performLogoff: sessionActions.performLogoff,
		minimizeAllWindows: desktopActions.minimizeAllWindows,
		resetDesktopIcons: desktopActions.resetDesktopIcons
	});

	watch(activeThemeId, (themeId, previousThemeId) => {
		if (themeId === previousThemeId) return;
		void loadThemeBlinkies(themeId);
	});

	watch(otaClockAlwaysOnTop, (enabled) => {
		if (!enabled || !desktopActions.isWindowVisible('otaclock')) return;
		desktopActions.focusWindow('otaclock');
	});

	watch(
		() => windowState.value.chat,
		(state) => {
			if (!state.isOpen || state.isMinimized) {
				if (chatPollTimer !== null) {
					window.clearInterval(chatPollTimer);
					chatPollTimer = null;
				}
				return;
			}

			void chatActions.loadChatMessages();
			if (chatPollTimer !== null) return;
			chatPollTimer = window.setInterval(() => {
				if (!desktopActions.isWindowVisible('chat')) return;
				void chatActions.loadChatMessages({ quiet: true });
			}, 5000);
		},
		{ deep: true }
	);

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
		void blogActions.refreshAuthSession();
		incrementVisitorCount();
		desktopActions.normalizeDesktopLayout();
		updateClocks();
		clockTimer = window.setInterval(updateClocks, 1000);
		document.addEventListener(
			'click',
			desktopActions.closeStartMenuOnOutsideClick
		);
		document.addEventListener('keydown', desktopActions.closeMenusOnEscape);
		window.addEventListener('resize', sessionActions.handleWindowResize);
		window.addEventListener(
			'pointermove',
			desktopActions.handlePointerMove
		);
		window.addEventListener('pointerup', desktopActions.releaseActiveDrag);
		window.addEventListener(
			'pointercancel',
			desktopActions.releaseActiveDrag
		);
		window.addEventListener(
			'message',
			browserMediaActions.handleBrowserWindowMessage
		);
		void sessionActions.runStartupSequence();
	});

	onBeforeUnmount(() => {
		lifecycleRuntime.disposed = true;

		if (clockTimer !== null) {
			window.clearInterval(clockTimer);
		}
		if (chatPollTimer !== null) {
			window.clearInterval(chatPollTimer);
		}

		disposeShellUtilities();
		browserMediaActions.disposeBrowserMediaActions();
		browserMediaActions.stopNoiseGenerator(false);
		void noiseEngine.close();

		document.removeEventListener(
			'click',
			desktopActions.closeStartMenuOnOutsideClick
		);
		document.removeEventListener(
			'keydown',
			desktopActions.closeMenusOnEscape
		);
		window.removeEventListener('resize', sessionActions.handleWindowResize);
		window.removeEventListener(
			'pointermove',
			desktopActions.handlePointerMove
		);
		window.removeEventListener(
			'pointerup',
			desktopActions.releaseActiveDrag
		);
		window.removeEventListener(
			'pointercancel',
			desktopActions.releaseActiveDrag
		);
		window.removeEventListener(
			'message',
			browserMediaActions.handleBrowserWindowMessage
		);
	});

	const shellState = {
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
		blinkieBadges,
		blinkieStamps,
		blinkieLoading,
		blinkieError,
		contextMenuRef,
		contextMenuVisible,
		contextMenuX,
		contextMenuY,
		contextTarget
	};

	const shellComputedState = {
		noiseEngine,
		marqueeText,
		onlineStatus,
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
		resizeDirections,
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
		vlcDurationLabel,
		contextMenuTitle,
		contextMenuItems
	};

	const shellLocalActions = {
		randomBetween,
		pause,
		updateClocks,
		parseOtaClockAlarmTimes,
		stopOtaClockAlarm,
		startOtaClockAlarm,
		checkOtaClockAlarm,
		incrementVisitorCount,
		pushStatus,
		isThemeId,
		themeLabel,
		applyTheme,
		setTheme,
		blinkieFolderForTheme,
		loadThemeBlinkies,
		readApiErrorMessage
	};

	return {
		...shellState,
		...shellComputedState,
		...shellLocalActions,
		...blogActions,
		...chatActions,
		...desktopActions,
		...browserMediaActions,
		...sessionActions
	};
}

export type ShellController = ReturnType<typeof buildShellController>;

export function createShellController(): ShellController {
	return buildShellController();
}
