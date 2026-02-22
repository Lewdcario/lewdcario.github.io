<script setup lang="ts">
import { standardBrowserName } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="browser"
		:title="standardBrowserName"
		window-class="browser-window"
		body-class="browser-window-body"
	>
		<template #title>
			<img :src="shell.browserShellIcon" width="14" height="14" alt="browser icon" />
			{{ shell.browserShellTitle }} - {{ shell.browserTitle }}
		</template>

		<div class="netscape-shell" :class="{ 'tor-browser-skin': shell.browserSkin === 'tor' }">
			<div class="netscape-menu-row" role="menubar" aria-label="Browser menu">
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">F</span>ile</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">E</span>dit</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">V</span>iew</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">G</span>o</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">B</span>ookmarks</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">O</span>ptions</button>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">D</span>irectory</button>
				<span class="netscape-menu-spacer"></span>
				<button type="button" class="netscape-menu-item"><span class="netscape-menu-mnemonic">H</span>elp</button>
			</div>

			<div class="netscape-toolbar-row">
				<button type="button" class="netscape-tool-button" :disabled="!shell.canBrowserGoBack" @click="shell.goBrowserBack">
					<span class="netscape-tool-icon icon-back" aria-hidden="true"></span>
					<span>Back</span>
				</button>
				<button type="button" class="netscape-tool-button" :disabled="!shell.canBrowserGoForward" @click="shell.goBrowserForward">
					<span class="netscape-tool-icon icon-forward" aria-hidden="true"></span>
					<span>Forward</span>
				</button>
				<button type="button" class="netscape-tool-button" @click="shell.goBrowserHome">
					<span class="netscape-tool-icon icon-home" aria-hidden="true"></span>
					<span>Home</span>
				</button>
				<div class="netscape-toolbar-separator" aria-hidden="true"></div>
				<button type="button" class="netscape-tool-button" @click="shell.reloadBrowserPage">
					<span class="netscape-tool-icon icon-reload" aria-hidden="true"></span>
					<span>Reload</span>
				</button>
				<button type="button" class="netscape-tool-button" :disabled="!shell.browserLoading" @click="shell.stopBrowserLoading">
					<span class="netscape-tool-icon icon-stop" aria-hidden="true"></span>
					<span>Stop</span>
				</button>
			</div>

			<div class="netscape-location-row">
				<label for="browser-address">Location:</label>
				<input
					id="browser-address"
					:ref="(element) => (shell.browserAddressInputRef = element as HTMLInputElement | null)"
					v-model="shell.browserAddress"
					type="text"
					@keydown.enter.prevent="shell.navigateBrowserAddress"
				/>
				<button
					type="button"
					class="netscape-throbber"
					aria-label="Compatibility mode"
					title="Compatibility mode"
					@click="shell.forceBrowserCompatibilityMode"
				>
					<img :src="shell.browserShellIcon" alt="" aria-hidden="true" />
				</button>
			</div>

			<div class="netscape-shortcuts-row">
				<button
					type="button"
					class="netscape-shortcut"
					:class="{ active: shell.browserSearchMenuOpen }"
					@click="shell.toggleBrowserSearchMenu"
				>
					{{ shell.browserNetSearchLabel }}
				</button>
				<button
					v-if="shell.browserBackend !== 'tor'"
					type="button"
					class="netscape-shortcut"
					@click="shell.openInBrowser('https://duckduckgo.com/?q=retro+web+design', 'Web Picks', { backend: shell.browserBackend, skin: shell.browserSkin })"
				>
					Web Picks
				</button>
			</div>

			<div v-if="shell.browserSearchMenuOpen" class="netscape-search-menu">
				<form class="netscape-search-form" @submit.prevent="shell.submitBrowserSearch">
					<label for="browser-search-query">Search the web</label>
					<div class="netscape-search-row">
						<input
							id="browser-search-query"
							:ref="(element) => (shell.browserSearchInputRef = element as HTMLInputElement | null)"
							v-model="shell.browserSearchQuery"
							type="text"
							placeholder="type query..."
							autocomplete="off"
						/>
						<select v-model="shell.browserSearchEngine" aria-label="Search engine">
							<option v-for="engine in shell.browserSearchEngines" :key="engine.id" :value="engine.id">
								{{ engine.label }}
							</option>
						</select>
						<button type="submit" class="netscape-search-go">Go</button>
					</div>
					<div class="netscape-search-actions">
						<button
							v-for="engine in shell.browserSearchEngines"
							:key="`quick-${engine.id}`"
							type="button"
							class="netscape-search-engine"
							@click="shell.searchWithEngine(engine.id)"
						>
							{{ engine.label }}
						</button>
					</div>
				</form>
			</div>

			<div class="netscape-content-wrap">
				<iframe
					v-if="shell.browserRenderMode === 'direct'"
					:ref="(element) => (shell.browserFrameRef = element as HTMLIFrameElement | null)"
					class="browser-frame netscape-browser-frame"
					:src="shell.browserFrameSrc"
					title="Browser content"
					loading="lazy"
					referrerpolicy="no-referrer"
					@load="shell.handleDirectBrowserFrameLoad"
					@error="shell.handleDirectBrowserFrameError"
				></iframe>
				<iframe
					v-else
					:ref="(element) => (shell.browserFrameRef = element as HTMLIFrameElement | null)"
					class="browser-frame netscape-browser-frame"
					:srcdoc="shell.browserDocument"
					title="Browser compatibility content"
					loading="lazy"
					sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
					referrerpolicy="no-referrer"
				></iframe>
				<div v-if="shell.browserLoading" class="browser-overlay browser-loading netscape-browser-overlay">Loading...</div>
				<div v-else-if="shell.browserError" class="browser-overlay browser-blocked netscape-browser-overlay">
					<div>{{ shell.browserError }}</div>
					<button @click="shell.forceBrowserCompatibilityMode">Retry compatibility mode</button>
					<button @click="shell.openBrowserExternally">Open externally</button>
				</div>
			</div>
		</div>
	</ShellWindowFrame>
</template>
