import { nextTick } from 'vue';
import { $fetch } from 'ofetch';
import type { AuthSessionRole } from '~/shared/auth';
import {
	browserPlaceholderPrompt,
	browserHomeUrl,
	createDefaultWindowPositions,
	createDefaultWindowSizes,
	createDefaultWindowState,
	desktopReadyStatus,
	standardBrowserName,
	vlcDefaultPlaylistId,
	vlcDefaultPlaylistUrl
} from '~/src/features/shell/constants/shell';

export function createSessionActions(deps: any) {
	const {
		selectedLoginUser,
		loginError,
		adminLoginPassword,
		activeDrag,
		windowRuntime,
		activeTab,
		startMenuOpen,
		closeContextMenu,
		clearBrowserFallbackTimer,
		stopOtaClockAlarm,
		stopNoiseGenerator,
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
		browserPlaceholderDocument,
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
		windowState,
		windowPositions,
		windowSizes,
		normalizeDesktopLayout,
		powerState,
		pushStatus,
		pause,
		splashMode,
		splashVisible,
		loadBlogPosts,
		readApiErrorMessage,
		lifecycleRuntime
	} = deps;

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
		windowRuntime.draggedIconIds.clear();
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
		statusMessage.value = desktopReadyStatus;
		browserRuntime.requestSerial += 1;
		browserLoading.value = false;
		browserError.value = '';
		browserBackend.value = 'standard';
		browserSkin.value = 'netscape';
		browserTitle.value = standardBrowserName;
		browserCurrentUrl.value = browserHomeUrl;
		browserAddress.value = browserHomeUrl;
		browserFrameSrc.value = browserHomeUrl;
		browserRenderMode.value = 'snapshot';
		browserDocument.value = browserPlaceholderDocument(browserPlaceholderPrompt, browserHomeUrl);
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
		windowState.value = createDefaultWindowState();
		windowPositions.value = createDefaultWindowPositions();
		windowSizes.value = createDefaultWindowSizes();
		windowRuntime.zCounter = 13;
		normalizeDesktopLayout();
	}

	function playShutdownSound() {
		const AudioContextConstructor =
			window.AudioContext ||
			(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
		if (lifecycleRuntime.disposed) return;

		powerState.value = 'shuttingDown';
		await pause(1200);
		if (lifecycleRuntime.disposed) return;

		powerState.value = 'idle';
		splashMode.value = 'login';
		splashVisible.value = true;
		resetSessionState();
	}

	async function runStartupSequence() {
		splashMode.value = 'startup';

		await pause(1800);
		if (lifecycleRuntime.disposed) return;
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
	}

	return {
		selectLoginUser,
		resetSessionState,
		playShutdownSound,
		performLogoff,
		runStartupSequence,
		continueToDesktop,
		handleWindowResize
	};
}
