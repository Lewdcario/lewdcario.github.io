import { $fetch } from 'ofetch';
import { defaultBlinkieThemeId, themeStorageKey, xpThemes, type XpThemeId } from '~/src/features/shell/constants/shell';
import type { BlinkiePayload } from '~/src/features/shell/model/types';

export function createShellUtilities(deps: any) {
	const {
		statusMessage,
		startMenuOpen,
		activeThemeId,
		visitorCount,
		blinkieBadges,
		blinkieStamps,
		blinkieLoading,
		blinkieError,
		lifecycleRuntime
	} = deps;

	let statusTimer: number | null = null;
	let blinkieRequestSerial = 0;

	function randomBetween(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function pause(milliseconds: number) {
		return new Promise<void>((resolve) => {
			window.setTimeout(resolve, milliseconds);
		});
	}

	function incrementVisitorCount() {
		const key = 'okami_portfolio_visitors';
		const rawValue = Number.parseInt(localStorage.getItem(key) ?? '', 10);
		const seed = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 13600 + randomBetween(0, 900);
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

			if (lifecycleRuntime.disposed || requestSerial !== blinkieRequestSerial) return;

			blinkieBadges.value = payload.badges;
			blinkieStamps.value = payload.stamps;
		} catch (error) {
			if (lifecycleRuntime.disposed || requestSerial !== blinkieRequestSerial) return;
			blinkieBadges.value = [];
			blinkieStamps.value = [];
			blinkieError.value =
				error instanceof Error ? error.message : 'Unable to load blinkies for this theme.';
		} finally {
			if (!lifecycleRuntime.disposed && requestSerial === blinkieRequestSerial) {
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

	function disposeShellUtilities() {
		if (statusTimer !== null) {
			window.clearTimeout(statusTimer);
			statusTimer = null;
		}
		blinkieRequestSerial += 1;
	}

	return {
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
	};
}
