import { nextTick } from 'vue';
import {
	browserHomeUrl,
	desktopIcons,
	torBrowserHomeUrl,
	windowsMeta
} from '~/src/features/shell/constants/shell';
import type {
	ContextMenuItem,
	ContextTarget,
	DesktopIcon,
	ResizeDirection,
	ShellShortcut,
	TabId,
	WindowId
} from '~/src/features/shell/model/types';
import type { PortfolioProject } from '~/src/data/projects';

export function createDesktopActions(deps: any) {
	const {
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
		loadBlogPosts,
		pushStatus,
		openInBrowser,
		openStandardBrowser,
		openTorBrowser,
		openVlcWindow,
		openNoiseWindow,
		openOtaClockWindow,
		performLogoff,
		clearBrowserFallbackTimer,
		stopBrowserLoading,
		stopNoiseGenerator,
		stopOtaClockAlarm
	} = deps;

	const runtime = deps.windowRuntime as {
		zCounter: number;
		draggedIconIds: Set<string>;
	};

	function setTab(tab: TabId) {
		if (!isWindowVisible('main')) {
			restoreWindow('main', false);
		}
		activeTab.value = tab;
		if (tab === 'blog' && !blogLoading.value) {
			void loadBlogPosts();
		}
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

	function windowsAutoIconPosition(index: number) {
		const bounds = iconBounds();
		const startX = 34;
		const startY = bounds.minY + 8;
		const stepX = 96;
		const stepY = 108;
		const availableHeight = Math.max(0, bounds.maxY - startY);
		const rowsPerColumn = Math.max(
			1,
			Math.floor(availableHeight / stepY) + 1
		);
		const column = Math.floor(index / rowsPerColumn);
		const row = index % rowsPerColumn;

		return {
			x: startX + column * stepX,
			y: startY + row * stepY
		};
	}

	function windowMinSize(windowId: WindowId) {
		if (windowId === 'main') return { width: 520, height: 360 };
		if (windowId === 'browser') return { width: 460, height: 320 };
		if (windowId === 'remote') return { width: 560, height: 360 };
		if (windowId === 'vlc') return { width: 420, height: 280 };
		if (windowId === 'noise') return { width: 340, height: 280 };
		if (windowId === 'cmd') return { width: 420, height: 240 };
		if (windowId === 'chat') return { width: 520, height: 320 };
		if (windowId === 'mines') return { width: 280, height: 320 };
		if (windowId === 'control') return { width: 560, height: 420 };
		if (windowId === 'recycle') return { width: 260, height: 180 };
		if (windowId === 'otaclock') return { width: 390, height: 360 };
		return { width: 180, height: 120 };
	}

	function getWindowSize(windowId: WindowId) {
		return windowSizes.value[windowId];
	}

	function windowBounds(windowId: WindowId) {
		const state = windowState.value[windowId];
		const size = getWindowSize(windowId);
		const width = state.isMaximized ? window.innerWidth - 8 : size.width;
		const height = state.isMaximized
			? window.innerHeight - 42
			: size.height;
		const maxX = Math.max(12, window.innerWidth - width - 12);
		const maxY = Math.max(12, window.innerHeight - height - 40);

		return { minX: 12, maxX, minY: 12, maxY };
	}

	function normalizeDesktopLayout() {
		isCompactLayout.value = window.innerWidth <= 1180;

		const nextIcons: Record<string, { x: number; y: number }> = {
			...iconPositions.value
		};
		for (const [index, icon] of desktopIcons.entries()) {
			if (!nextIcons[icon.id]) {
				nextIcons[icon.id] = windowsAutoIconPosition(index);
			}
		}

		const iconLimits = iconBounds();
		for (const icon of desktopIcons) {
			const current = nextIcons[icon.id] ?? { x: icon.x, y: icon.y };
			nextIcons[icon.id] = {
				x: clamp(current.x, iconLimits.minX, iconLimits.maxX),
				y: clamp(current.y, iconLimits.minY, iconLimits.maxY)
			};
		}
		iconPositions.value = nextIcons;

		for (const windowId of Object.keys(
			windowPositions.value
		) as WindowId[]) {
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
		if (
			!windowState.value[windowId].isOpen ||
			windowState.value[windowId].isMinimized
		)
			return;
		runtime.zCounter += 1;
		windowPositions.value[windowId].z = runtime.zCounter;

		if (
			otaClockAlwaysOnTop.value &&
			windowId !== 'otaclock' &&
			isWindowVisible('otaclock')
		) {
			runtime.zCounter += 1;
			windowPositions.value.otaclock.z = runtime.zCounter;
		}
	}

	function startWindowDrag(windowId: WindowId, event: PointerEvent) {
		if (isCompactLayout.value || event.button !== 0) return;
		if (
			(event.target as HTMLElement | null)?.closest('.title-bar-controls')
		)
			return;
		if (windowId === 'otaclock' && otaClockLockPosition.value) return;
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

		(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(
			event.pointerId
		);
	}

	function startWindowResize(
		windowId: WindowId,
		direction: ResizeDirection,
		event: PointerEvent
	) {
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

		(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(
			event.pointerId
		);
	}

	function startIconDrag(icon: DesktopIcon, event: PointerEvent) {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();

		const position = iconPositions.value[icon.id] ?? {
			x: icon.x,
			y: icon.y
		};
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

		(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(
			event.pointerId
		);
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
			const startWidth =
				drag.startWidth ?? windowSizes.value[windowId].width;
			const startHeight =
				drag.startHeight ?? windowSizes.value[windowId].height;
			const minSize = windowMinSize(windowId);
			const viewportLeft = 12;
			const viewportTop = 12;
			const viewportRight = window.innerWidth - 12;
			const viewportBottom = window.innerHeight - 40;
			const startLeft = drag.startX;
			const startTop = drag.startY;
			const startRight = startLeft + startWidth;
			const startBottom = startTop + startHeight;
			let nextLeft = startLeft;
			let nextTop = startTop;
			let nextRight = startRight;
			let nextBottom = startBottom;

			// Keep the opposite edge anchored for west/north resize handles.
			if (direction?.includes('w')) {
				nextLeft = clamp(
					startLeft + deltaX,
					viewportLeft,
					startRight - minSize.width
				);
			}

			if (direction?.includes('e')) {
				nextRight = clamp(
					startRight + deltaX,
					startLeft + minSize.width,
					viewportRight
				);
			}

			if (direction?.includes('n')) {
				nextTop = clamp(
					startTop + deltaY,
					viewportTop,
					startBottom - minSize.height
				);
			}

			if (direction?.includes('s')) {
				nextBottom = clamp(
					startBottom + deltaY,
					startTop + minSize.height,
					viewportBottom
				);
			}

			const nextWidth = clamp(
				nextRight - nextLeft,
				minSize.width,
				viewportRight - nextLeft
			);
			const nextHeight = clamp(
				nextBottom - nextTop,
				minSize.height,
				viewportBottom - nextTop
			);

			windowPositions.value[windowId].x = nextLeft;
			windowPositions.value[windowId].y = nextTop;
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
			runtime.draggedIconIds.add(drag.id);
			window.setTimeout(() => {
				runtime.draggedIconIds.delete(drag.id);
			}, 0);
		}

		activeDrag.value = null;
	}

	function iconStyle(icon: DesktopIcon) {
		const position = iconPositions.value[icon.id] ?? {
			x: icon.x,
			y: icon.y
		};

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

		if (windowId === 'otaclock') {
			stopOtaClockAlarm(false);
			otaClockConfigOpen.value = false;
		}
		if (windowId === 'noise') {
			stopNoiseGenerator(false);
		}

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
			...(Object.keys(windowPositions.value) as WindowId[])
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
			...(Object.keys(windowPositions.value) as WindowId[])
				.filter((id) => isWindowVisible(id))
				.map((id) => windowPositions.value[id].z)
		);

		return windowPositions.value[windowId].z >= highestZ;
	}

	function openShellShortcut(shortcut: ShellShortcut) {
		if (shortcut.windowId === 'vlc') {
			openVlcWindow();
			return;
		}

		if (shortcut.windowId === 'noise') {
			openNoiseWindow();
			return;
		}

		if (shortcut.windowId === 'otaclock') {
			openOtaClockWindow();
			return;
		}

		if (shortcut.windowId) {
			openWindowFromMenu(shortcut.windowId);
			return;
		}

		if (shortcut.recycle) {
			restoreWindow('recycle', false);
			pushStatus('Recycle Bin opened.');
			return;
		}

		if (shortcut.tab) {
			setTab(shortcut.tab);
			return;
		}

		if (shortcut.tor) {
			openTorBrowser(shortcut.href ?? torBrowserHomeUrl, shortcut.label);
			return;
		}

		if (shortcut.href) {
			openStandardBrowser(shortcut.href, shortcut.label);
		}
	}

	function handleDesktopIconClick(icon: DesktopIcon, event: MouseEvent) {
		if (runtime.draggedIconIds.has(icon.id)) {
			event.preventDefault();
			runtime.draggedIconIds.delete(icon.id);
			return;
		}

		event.preventDefault();
		openShellShortcut(icon);
	}

	function handleDesktopIconContextAction(icon: DesktopIcon) {
		openShellShortcut(icon);
	}

	function handleRecycleShortcutClick(
		shortcut: ShellShortcut,
		event: MouseEvent
	) {
		event.preventDefault();
		openShellShortcut(shortcut);
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

	function resolveContextTarget(
		rawTarget: EventTarget | null
	): ContextTarget {
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

		const taskbarWindow = target.closest(
			'[data-taskbar-window-id]'
		) as HTMLElement | null;
		if (taskbarWindow?.dataset.taskbarWindowId) {
			return {
				type: 'taskbar',
				id: taskbarWindow.dataset.taskbarWindowId
			};
		}

		const icon = target.closest('[data-icon-id]') as HTMLElement | null;
		if (icon?.dataset.iconId) {
			return { type: 'icon', id: icon.dataset.iconId };
		}

		const windowElement = target.closest(
			'[data-window-id]'
		) as HTMLElement | null;
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
		const maxX = Math.max(
			gutter,
			window.innerWidth - menuElement.offsetWidth - gutter
		);
		const maxY = Math.max(
			gutter,
			window.innerHeight - menuElement.offsetHeight - gutter
		);
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

	return {
		setTab,
		clamp,
		iconBounds,
		windowMinSize,
		getWindowSize,
		windowBounds,
		normalizeDesktopLayout,
		focusWindow,
		startWindowDrag,
		startWindowResize,
		startIconDrag,
		handlePointerMove,
		releaseActiveDrag,
		iconStyle,
		isWindowVisible,
		windowStyle,
		isWindowMaximized,
		canResizeWindow,
		windowLabel,
		minimizeWindow,
		toggleMaximizeWindow,
		closeWindow,
		restoreWindow,
		openWindowFromMenu,
		toggleWindowFromTaskbar,
		isTaskbarWindowActive,
		openShellShortcut,
		handleDesktopIconClick,
		handleDesktopIconContextAction,
		handleRecycleShortcutClick,
		minimizeAllWindows,
		resetDesktopIcons,
		resolveContextTarget,
		closeContextMenu,
		openContextMenu,
		invokeContextMenuItem,
		handleProjectOpen,
		toggleStartMenu,
		closeStartMenuOnOutsideClick,
		closeMenusOnEscape,
		runSoftAction
	};
}
