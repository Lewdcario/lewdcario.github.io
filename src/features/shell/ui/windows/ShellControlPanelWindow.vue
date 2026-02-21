<script setup lang="ts">
import { shellIcons } from '~/src/features/shell/constants/shell';
import type { WindowId } from '~/src/features/shell/model/types';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();

interface ControlApplet {
	id: string;
	label: string;
	icon: string;
	onOpen: () => void;
}

interface ControlMenuItem {
	id: string;
	mnemonic: string;
	rest: string;
}

const menuItems: ControlMenuItem[] = [
	{ id: 'file', mnemonic: 'F', rest: 'ile' },
	{ id: 'edit', mnemonic: 'E', rest: 'dit' },
	{ id: 'view', mnemonic: 'V', rest: 'iew' },
	{ id: 'favorites', mnemonic: 'F', rest: 'avorites' },
	{ id: 'tools', mnemonic: 'T', rest: 'ools' },
	{ id: 'help', mnemonic: 'H', rest: 'elp' }
];

function openNavigator() {
	shell.openStandardBrowser(
		shell.browserCurrentUrl || 'https://library.okami.codes/',
		'Netscape Navigator'
	);
}

function openWindow(windowId: WindowId) {
	shell.openWindowFromMenu(windowId);
}

const controlApplets: ControlApplet[] = [
	{
		id: 'accessibility',
		label: 'Accessibility Options',
		icon: shellIcons.accessibility,
		onOpen: () => openWindow('main')
	},
	{
		id: 'add-remove-programs',
		label: 'Add or Remove Programs',
		icon: shellIcons.addRemovePrograms,
		onOpen: () => openWindow('vlc')
	},
	{
		id: 'date-time',
		label: 'Date and Time',
		icon: shellIcons.otaclock,
		onOpen: () => openWindow('otaclock')
	},
	{
		id: 'display',
		label: 'Display',
		icon: shellIcons.computer,
		onOpen: () => openWindow('main')
	},
	{
		id: 'paint',
		label: 'Paint',
		icon: shellIcons.paint,
		onOpen: () => openWindow('paint')
	},
	{
		id: 'folder-options',
		label: 'Folder Options',
		icon: shellIcons.folder,
		onOpen: () => openWindow('links')
	},
	{
		id: 'game-controllers',
		label: 'Game Controllers',
		icon: shellIcons.mines,
		onOpen: () => openWindow('mines')
	},
	{
		id: 'internet-options',
		label: 'Internet Options',
		icon: shellIcons.browser,
		onOpen: () => openNavigator()
	},
	{
		id: 'keyboard',
		label: 'Keyboard',
		icon: shellIcons.cmd,
		onOpen: () => openWindow('cmd')
	},
	{
		id: 'msn',
		label: 'MSN Messenger',
		icon: shellIcons.chat,
		onOpen: () => openWindow('chat')
	},
	{
		id: 'network',
		label: 'Network Connections',
		icon: shellIcons.remote,
		onOpen: () => openWindow('remote')
	},
	{
		id: 'sounds-audio',
		label: 'Sounds and Audio Devices',
		icon: shellIcons.noise,
		onOpen: () => openWindow('noise')
	},
	{
		id: 'taskbar-start',
		label: 'Taskbar and Start Menu',
		icon: shellIcons.start,
		onOpen: () =>
			shell.pushStatus(
				'Use desktop right-click and Start menu options to adjust shell behavior.'
			)
	},
	{
		id: 'user-accounts',
		label: 'User Accounts',
		icon: shellIcons.contact,
		onOpen: () => openWindow('chat')
	},
	{
		id: 'appearance-themes',
		label: 'Appearance and Themes',
		icon: shellIcons.control,
		onOpen: () => openWindow('main')
	}
];

function toggle24HourClock() {
	shell.otaClockUse24Hour = !shell.otaClockUse24Hour;
	shell.pushStatus(
		shell.otaClockUse24Hour
			? 'OtaClock now uses 24-hour time.'
			: 'OtaClock now uses 12-hour time.'
	);
}
</script>

<template>
	<ShellWindowFrame
		window-id="control"
		title="Control Panel"
		:icon="shellIcons.control"
		icon-alt="control panel icon"
		window-class="control-window"
		body-class="control-window-body"
	>
		<div class="xp-control-shell">
			<nav class="xp-control-menu-bar" aria-label="Control Panel menu">
				<button
					v-for="item in menuItems"
					:key="item.id"
					type="button"
					@click="shell.pushStatus(`${item.mnemonic}${item.rest} menu is not available in this build.`)"
				>
					<span class="xp-control-menu-mnemonic">{{ item.mnemonic }}</span>{{ item.rest }}
				</button>
			</nav>

			<div class="xp-control-toolbar">
				<div class="xp-control-address-row">
					<span class="xp-control-address-label">Address</span>
					<div class="xp-control-address-field" role="group" aria-label="Address bar">
						<img :src="shellIcons.control" alt="" aria-hidden="true" />
						<span>Control Panel</span>
						<button
							type="button"
							class="xp-control-address-arrow"
							@click="shell.pushStatus('Address dropdown is not available in this build.')"
						>
							v
						</button>
					</div>
				</div>
				<div class="xp-control-nav-buttons">
					<button type="button" disabled>Back</button>
					<button type="button" disabled>Forward</button>
					<button type="button" @click="openWindow('main')">Up</button>
				</div>
			</div>

			<div class="xp-control-workspace">
				<aside class="xp-control-side-pane">
					<section class="xp-control-side-card">
						<header>Control Panel</header>
						<button
							type="button"
							class="xp-control-task-link"
							@click="shell.pushStatus('Category View is not available in this build.')"
						>
							Switch to Category View
						</button>
						<button type="button" class="xp-control-task-link" @click="toggle24HourClock">
							Toggle 24-hour Clock
						</button>
						<button
							type="button"
							class="xp-control-task-link"
							@click="shell.resetDesktopIcons"
						>
							Arrange Desktop Icons
						</button>
					</section>

					<section class="xp-control-side-card xp-control-see-also">
						<header>See Also</header>
						<button type="button" class="xp-control-task-link" @click="openNavigator">
							Windows Update
						</button>
						<button type="button" class="xp-control-task-link" @click="openWindow('main')">
							Appearance and Themes
						</button>
						<button
							type="button"
							class="xp-control-task-link"
							@click="shell.pushStatus('Help and Support is not available in this build.')"
						>
							Help and Support
						</button>
					</section>
				</aside>

				<section class="xp-control-main-pane" aria-label="Control Panel applets">
					<div class="xp-control-applet-grid">
						<button
							v-for="applet in controlApplets"
							:key="applet.id"
							type="button"
							class="xp-control-applet"
							@click="applet.onOpen"
						>
							<img :src="applet.icon" :alt="`${applet.label} icon`" />
							<span>{{ applet.label }}</span>
						</button>
					</div>
				</section>
			</div>

			<footer class="xp-control-status-bar">{{ controlApplets.length }} objects</footer>
		</div>
	</ShellWindowFrame>
</template>
