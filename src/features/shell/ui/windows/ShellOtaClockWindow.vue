<script setup lang="ts">
import { shellIcons } from '~/src/features/shell/constants/shell';
import { useShellControllerContext } from '~/src/features/shell/model/useShellController';
import ShellWindowFrame from './ShellWindowFrame.vue';

const shell = useShellControllerContext();
</script>

<template>
	<ShellWindowFrame
		window-id="otaclock"
		title="OtaClock"
		:icon="shellIcons.otaclock"
		icon-alt="otaclock icon"
		window-class="otaclock-window"
		body-class="otaclock-window-body"
	>
		<div class="otaclock-stage-wrap">
			<div class="otaclock-stage" :style="shell.otaClockPanelStyle">
				<div class="otaclock-art-panel">
					<div class="otaclock-art-left">
						<div class="otaclock-hero-wrap">
							<img
								:src="shell.otaClockSpriteSrc"
								alt="Otacon sprite"
								class="otaclock-hero otaclock-hero-main"
								:class="{ ringing: shell.otaClockRinging }"
								draggable="false"
							/>
							<div v-if="!shell.otaClockRinging" class="otaclock-bubble-copy">
								<div class="otaclock-bubble-time">{{ shell.otaClockDisplayTime }}</div>
								<div class="otaclock-bubble-date">{{ shell.otaClockDisplayDate }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<button
			type="button"
			class="otaclock-config-toggle"
			:aria-expanded="shell.otaClockConfigOpen"
			aria-controls="otaclock-config-panel"
			title="Open OtaClock configuration"
			@pointerdown.stop
			@click.stop="shell.otaClockConfigOpen = !shell.otaClockConfigOpen"
		>
			<img src="/otaclock/gear_pixel.png" alt="" class="otaclock-gear-icon" draggable="false" />
		</button>
		<div v-if="shell.otaClockConfigOpen" id="otaclock-config-panel" class="otaclock-config-panel" @pointerdown.stop>
			<div class="otaclock-config-header">
				<span>OtaClock Configuration</span>
				<button type="button" class="otaclock-config-close" aria-label="Close configuration" @click="shell.otaClockConfigOpen = false">
					x
				</button>
			</div>
			<div class="otaclock-controls">
				<div class="otaclock-control-grid">
					<label><input v-model="shell.otaClockUse24Hour" type="checkbox" /> 24-hour display</label>
					<label><input v-model="shell.otaClockAlarmEnabled" type="checkbox" /> Alarm mode</label>
					<label><input v-model="shell.otaClockAlwaysOnTop" type="checkbox" /> Always on top</label>
					<label><input v-model="shell.otaClockLockPosition" type="checkbox" /> Lock position</label>
				</div>
				<div class="otaclock-control-row">
					<label for="otaclock-sound">Alarm sound</label>
					<select id="otaclock-sound" v-model="shell.otaClockAlarmSound">
						<option value="LAUGH">LAUGH</option>
						<option value="OK">OK</option>
					</select>
					<label for="otaclock-duration">Ring time</label>
					<select id="otaclock-duration" v-model.number="shell.otaClockAlarmDuration">
						<option :value="5">5s</option>
						<option :value="10">10s</option>
						<option :value="30">30s</option>
						<option :value="60">60s</option>
					</select>
					<label for="otaclock-scale">Scale</label>
					<input id="otaclock-scale" v-model.number="shell.otaClockScale" type="range" min="1" max="1.8" step="0.1" />
					<button type="button" :disabled="!shell.otaClockRinging" @click="shell.stopOtaClockAlarm()">Stop Alarm</button>
				</div>
				<label class="otaclock-alarm-input-label" for="otaclock-alarm-times">Alarm times (HH:MM:SS, one per line)</label>
				<textarea id="otaclock-alarm-times" v-model="shell.otaClockAlarmTimesInput" rows="2" spellcheck="false"></textarea>
			</div>
		</div>
		<audio
			:ref="
				(element) =>
					(shell.otaClockAudioLaughRef = element as HTMLAudioElement | null)
			"
			src="/otaclock/alarm_laugh.wav"
			preload="auto"
		></audio>
		<audio
			:ref="
				(element) => (shell.otaClockAudioOkRef = element as HTMLAudioElement | null)
			"
			src="/otaclock/alarm_ok.wav"
			preload="auto"
		></audio>
	</ShellWindowFrame>
</template>
