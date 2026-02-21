<script setup lang="ts">
import { shellIcons, tabs } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';
import ShellMainAboutTab from './main/ShellMainAboutTab.vue';
import ShellMainBlogTab from './main/ShellMainBlogTab.vue';
import ShellMainContactTab from './main/ShellMainContactTab.vue';
import ShellMainProjectsTab from './main/ShellMainProjectsTab.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="main"
		title="okami@desktop:~/portfolio"
		:icon="shellIcons.shell"
		icon-alt="window icon"
		window-class="main-window"
	>
		<pre class="ascii-banner">  ___  _  __    _    __  __ ___
 / _ \| |/ /   / \  |  \/  |_ _|
| | | | ' /   / _ \ | |\/| || |
| |_| | . \  / ___ \| |  | || |
 \___/|_|\_\/_/   \_\_|  |_|___|</pre>

		<menu role="tablist">
			<button v-for="tab in tabs" :key="tab.id" :aria-selected="shell.activeTab === tab.id" @click="shell.setTab(tab.id)">
				{{ tab.label }}
			</button>
		</menu>

		<ShellMainAboutTab />
		<ShellMainProjectsTab />
		<ShellMainBlogTab />
		<ShellMainContactTab />

		<div class="marquee-wrap">
			<div class="marquee-track">
				<span>{{ shell.marqueeText }}</span>
			</div>
		</div>

		<section class="field-row footer-buttons">
			<span class="status-text">{{ shell.statusMessage }}</span>
			<button @click="shell.runSoftAction('Settings applied.')">OK</button>
			<button @click="shell.runSoftAction('Action canceled.')">Cancel</button>
		</section>
	</ShellWindowFrame>
</template>
