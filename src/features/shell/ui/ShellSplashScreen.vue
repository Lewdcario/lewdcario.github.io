<script setup lang="ts">
import { onBeforeUnmount, watch, ref } from 'vue';
import { guestLoginPasswordSeed } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';

const shell = useShellControllerContext();
const startupLoaderCellCount = 16;
const startupLoaderHead = ref(-2);

let startupLoaderTimer: ReturnType<typeof window.setInterval> | null = null;

function isStartupLoaderCellActive(cellIndex: number) {
	return cellIndex >= startupLoaderHead.value && cellIndex <= startupLoaderHead.value + 2;
}

function stopStartupLoaderAnimation() {
	if (startupLoaderTimer !== null) {
		window.clearInterval(startupLoaderTimer);
		startupLoaderTimer = null;
	}
}

function startStartupLoaderAnimation() {
	if (typeof window === 'undefined' || startupLoaderTimer !== null) return;
	startupLoaderHead.value = -2;
	startupLoaderTimer = window.setInterval(() => {
		const lastHead = startupLoaderCellCount - 1;
		startupLoaderHead.value =
			startupLoaderHead.value >= lastHead ? -2 : startupLoaderHead.value + 1;
	}, 110);
}

watch(
	() => [shell.splashVisible, shell.splashMode] as const,
	([visible, mode]) => {
		if (visible && mode === 'startup') {
			startStartupLoaderAnimation();
			return;
		}
		stopStartupLoaderAnimation();
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	stopStartupLoaderAnimation();
});
</script>

<template>
	<div
		v-if="shell.splashVisible"
		id="splash-screen"
		class="splash-screen"
		:class="`splash-screen-${shell.splashMode}`"
	>
		<div v-if="shell.splashMode === 'startup'" class="xp-startup-screen">
			<div class="xp-startup-content">
				<div class="power-brand" aria-hidden="true">
					<div class="power-flag">
						<span class="pane pane-red"></span>
						<span class="pane pane-green"></span>
						<span class="pane pane-blue"></span>
						<span class="pane pane-yellow"></span>
					</div>
					<div class="power-wordmark">
						<span class="power-word-windows">Windows</span>
						<span class="power-word-xp">XP</span>
					</div>
				</div>
				<p class="xp-startup-caption">Microsoft Windows XP</p>
				<div class="xp-startup-loader" aria-hidden="true">
					<div class="xp-startup-loader-track">
						<span
							v-for="cellIndex in startupLoaderCellCount"
							:key="`startup-loader-cell-${cellIndex}`"
							class="xp-startup-loader-cell"
							:class="{ 'is-active': isStartupLoaderCellActive(cellIndex - 1) }"
						></span>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="xp-login-screen">
			<div class="xp-login-topbar"></div>
			<div class="xp-login-main">
				<div class="xp-login-panel">
					<div class="xp-login-left">
						<img class="xp-login-brand-logo" src="/windows-xp-logo.png" alt="Windows XP" />
						<p class="xp-login-prompt">To begin, click your user name</p>
					</div>
					<div class="xp-login-divider"></div>
					<div class="xp-login-user">
						<div class="xp-login-user-list">
							<div class="xp-login-user-entry" :class="{ active: shell.selectedLoginUser === 'guest' }">
								<button class="xp-login-user-choice" @click="shell.selectLoginUser('guest')">
									<div class="xp-login-avatar xp-login-avatar-guest" aria-hidden="true"></div>
									<div class="xp-login-user-choice-copy">
										<p class="xp-login-user-choice-name">Guest</p>
										<p class="xp-login-user-choice-meta">Quick sign in</p>
									</div>
								</button>
								<div v-if="shell.selectedLoginUser === 'guest'" class="xp-login-password-panel">
									<p class="xp-login-password-label">Password</p>
									<div class="xp-login-password-row">
										<input
											id="xp-login-password"
											type="password"
											:value="guestLoginPasswordSeed"
											readonly
											autocomplete="off"
											class="xp-login-guest-field"
										/>
										<span class="xp-login-language">EN</span>
										<button
											id="enter-button"
											class="xp-login-arrow"
											:disabled="shell.loginSubmitting"
											@click="shell.continueToDesktop"
										>
											{{ shell.loginSubmitting ? '…' : '➜' }}
										</button>
										<button class="xp-login-help-btn" type="button" aria-label="Help">?</button>
									</div>
									<p v-if="shell.loginError" class="xp-login-error">{{ shell.loginError }}</p>
								</div>
							</div>
							<div class="xp-login-user-entry" :class="{ active: shell.selectedLoginUser === 'admin' }">
								<button class="xp-login-user-choice" @click="shell.selectLoginUser('admin')">
									<div class="xp-login-avatar xp-login-avatar-admin" aria-hidden="true"></div>
									<div class="xp-login-user-choice-copy">
										<p class="xp-login-user-choice-name">Admin</p>
										<p class="xp-login-user-choice-meta">Password required</p>
									</div>
								</button>
								<div v-if="shell.selectedLoginUser === 'admin'" class="xp-login-password-panel">
									<p class="xp-login-password-label">Password</p>
									<div class="xp-login-password-row">
										<input
											id="xp-login-password"
											v-model="shell.adminLoginPassword"
											type="password"
											autocomplete="off"
											placeholder="Admin password"
											@keydown.enter.prevent="shell.continueToDesktop"
										/>
										<span class="xp-login-language">EN</span>
										<button
											id="enter-button"
											class="xp-login-arrow"
											:disabled="shell.loginSubmitting || !shell.adminLoginPassword.trim()"
											@click="shell.continueToDesktop"
										>
											{{ shell.loginSubmitting ? '…' : '➜' }}
										</button>
										<button class="xp-login-help-btn" type="button" aria-label="Help">?</button>
									</div>
									<p v-if="shell.loginError" class="xp-login-error">{{ shell.loginError }}</p>
								</div>
							</div>
						</div>
						<div class="xp-login-hint">
							<p class="xp-login-hint-title">
								{{ shell.selectedLoginUser === 'admin' ? 'Admin access' : 'Guest access' }}
							</p>
							<p v-if="shell.selectedLoginUser === 'admin'">Admin password is validated on the backend.</p>
							<p v-else>Guest is a non-persistent local session.</p>
							<p>Use the arrow button to continue.</p>
						</div>
					</div>
				</div>
			</div>
			<div class="xp-login-bottom">
				<span class="xp-login-power">Turn off computer</span>
				<span class="xp-login-help">After you log on, you can add or change accounts.</span>
			</div>
		</div>
	</div>
</template>
