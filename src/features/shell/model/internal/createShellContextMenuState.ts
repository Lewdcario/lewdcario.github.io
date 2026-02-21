import { computed } from 'vue';
import { browserHomeUrl, desktopIcons, torBrowserHomeUrl, windowsMeta } from '~/src/features/shell/constants/shell';
import type { ContextMenuItem, WindowId } from '~/src/features/shell/model/types';

export function createShellContextMenuState(deps: any) {
	const {
		contextTarget,
		windowState,
		isCompactLayout,
		browserShellTitle,
		browserCurrentUrl,
		pushStatus,
		handleDesktopIconContextAction,
		openTorBrowser,
		openInBrowser,
		toggleMaximizeWindow,
		minimizeWindow,
		closeWindow,
		openStandardBrowser,
		openVlcWindow,
		openNoiseWindow,
		openChatWindow,
		openOtaClockWindow,
		performLogoff,
		minimizeAllWindows,
		resetDesktopIcons
	} = deps;

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
						openStandardBrowser(browserCurrentUrl.value || browserHomeUrl, 'Open Navigator')
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
					id: 'open-chat',
					label: 'Open MSN Chat',
					action: () => openChatWindow()
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
				action: () => openStandardBrowser(browserCurrentUrl.value || browserHomeUrl, 'Open Navigator')
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

	return {
		contextMenuTitle,
		contextMenuItems
	};
}
