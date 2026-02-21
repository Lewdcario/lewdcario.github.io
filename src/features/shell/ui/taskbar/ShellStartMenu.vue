<script setup lang="ts">
import {
	browserHomeUrl,
	shellIcons,
	torBrowserHomeUrl,
	xpThemes
} from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
</script>

<template>
	<div class="start-button">
		<button class="start-button-inner" @click.stop="shell.toggleStartMenu">
			<span class="start-button-flag" aria-hidden="true">
				<span class="start-button-flag-pane red"></span>
				<span class="start-button-flag-pane green"></span>
				<span class="start-button-flag-pane blue"></span>
				<span class="start-button-flag-pane yellow"></span>
			</span>
			<span class="start-button-label">start</span>
		</button>
		<div v-show="shell.startMenuOpen" id="start-menu" class="start-menu">
			<div class="start-menu-header">
				<div class="start-menu-header-label">Windows XP</div>
			</div>
			<div class="start-menu-items">
				<button class="start-menu-item" @click="shell.setTab('about')">
					<img :src="shellIcons.about" width="16" height="16" alt="about icon" />
					<span>About</span>
				</button>
				<button class="start-menu-item" @click="shell.setTab('projects')">
					<img :src="shellIcons.folder" width="16" height="16" alt="projects icon" />
					<span>Projects</span>
				</button>
				<button class="start-menu-item" @click="shell.setTab('blog')">
					<img :src="shellIcons.about" width="16" height="16" alt="blog icon" />
					<span>Blog</span>
				</button>
				<button class="start-menu-item" @click="shell.openStandardBrowser(shell.browserCurrentUrl || browserHomeUrl, 'Open Navigator')">
					<img :src="shellIcons.browser" width="16" height="16" alt="browser icon" />
					<span>Open Navigator</span>
				</button>
				<button class="start-menu-item" @click="shell.openTorBrowser(shell.browserCurrentUrl || torBrowserHomeUrl, 'Tor Browser')">
					<img src="/tor-browser-icon.png" width="16" height="16" alt="tor browser icon" />
					<span>Open Tor Browser</span>
				</button>
				<button class="start-menu-item" @click="shell.openVlcWindow">
					<img :src="shellIcons.vlc" width="16" height="16" alt="vlc icon" />
					<span>Open VLC</span>
				</button>
				<button class="start-menu-item" @click="shell.openNoiseWindow">
					<img :src="shellIcons.noise" width="16" height="16" alt="noise icon" />
					<span>Open Noise Generator</span>
				</button>
				<button class="start-menu-item" @click="shell.openOtaClockWindow">
					<img :src="shellIcons.otaclock" width="16" height="16" alt="otaclock icon" />
					<span>Open OtaClock</span>
				</button>
				<button class="start-menu-item" @click="shell.openWindowFromMenu('links')">
					<img :src="shellIcons.folder" width="16" height="16" alt="links window icon" />
					<span>Open Links</span>
				</button>
				<button class="start-menu-item" @click="shell.openWindowFromMenu('clock')">
					<img :src="shellIcons.globe" width="16" height="16" alt="clock window icon" />
					<span>Open Clock</span>
				</button>
				<div class="start-menu-divider"></div>
				<div class="start-menu-section-label">Themes: {{ shell.activeThemeLabel }}</div>
				<div class="start-theme-grid">
					<button
						v-for="theme in xpThemes"
						:key="theme.id"
						class="start-menu-item start-menu-theme-item"
						:class="{ active: shell.activeThemeId === theme.id }"
						@click="shell.setTheme(theme.id)"
					>
						<img :src="shellIcons.about" width="16" height="16" alt="theme icon" />
						<span>{{ theme.label }}</span>
					</button>
				</div>
				<div class="start-menu-divider"></div>
				<button class="start-menu-item" @click="shell.openStandardBrowser(browserHomeUrl, 'Home Portal')">
					<img :src="shellIcons.browser" width="16" height="16" alt="home icon" />
					<span>Home Portal</span>
				</button>
				<button class="start-menu-item" @click="shell.performLogoff">
					<img :src="shellIcons.power" width="16" height="16" alt="log off icon" />
					<span>Log Off...</span>
				</button>
			</div>
		</div>
	</div>
</template>
