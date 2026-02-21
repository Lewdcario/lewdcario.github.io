import type { NoisePreset } from '~/src/features/shell/model/types';

interface NoiseEngineStartResult {
	ok: boolean;
	error?: string;
}

export interface NoiseEngine {
	start: (preset: NoisePreset, volume: number) => Promise<NoiseEngineStartResult>;
	stop: () => void;
	applyPreset: (preset: NoisePreset, volume: number) => void;
	close: () => Promise<void>;
}

export function createNoiseEngine(): NoiseEngine {
	let noiseAudioContext: AudioContext | null = null;
	let noiseSourceNode: AudioBufferSourceNode | null = null;
	let noiseCarrierNode: OscillatorNode | null = null;
	let noiseHarmonicNode: OscillatorNode | null = null;
	let noiseHarmonicGainNode: GainNode | null = null;
	let noisePurrPreMixNode: GainNode | null = null;
	let noisePurrFormantANode: BiquadFilterNode | null = null;
	let noisePurrFormantBNode: BiquadFilterNode | null = null;
	let noisePurrFormantAGainNode: GainNode | null = null;
	let noisePurrFormantBGainNode: GainNode | null = null;
	let noiseJitterOscNode: OscillatorNode | null = null;
	let noiseJitterCarrierGainNode: GainNode | null = null;
	let noiseJitterHarmonicGainNode: GainNode | null = null;
	let noiseGainNode: GainNode | null = null;
	let noiseHighpassNode: BiquadFilterNode | null = null;
	let noiseLowpassNode: BiquadFilterNode | null = null;
	let noiseModOscNode: OscillatorNode | null = null;
	let noiseModGainNode: GainNode | null = null;
	let noiseModRateLfoNode: OscillatorNode | null = null;
	let noiseModRateLfoGainNode: GainNode | null = null;
	let noiseModDepthLfoNode: OscillatorNode | null = null;
	let noiseModDepthLfoGainNode: GainNode | null = null;

	function resolveNoiseAudioContext() {
		const constructor =
			window.AudioContext ||
			(window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!constructor) return null;

		if (!noiseAudioContext || noiseAudioContext.state === 'closed') {
			noiseAudioContext = new constructor();
		}

		return noiseAudioContext;
	}

	function buildNoiseBuffer(context: AudioContext, durationSeconds = 3) {
		const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
		const buffer = context.createBuffer(1, frameCount, context.sampleRate);
		const channel = buffer.getChannelData(0);
		for (let index = 0; index < channel.length; index += 1) {
			channel[index] = Math.random() * 2 - 1;
		}
		return buffer;
	}

	function applyPresetToNodes(preset: NoisePreset, volume: number) {
		if (!noiseAudioContext || !noiseHighpassNode || !noiseLowpassNode || !noiseGainNode) return;
		const now = noiseAudioContext.currentTime;
		const toneSmoothing = preset.source === 'purr' ? 0.012 : 0.03;
		const gainSmoothing = preset.source === 'purr' ? 0.015 : 0.04;
		const modSmoothing = preset.source === 'purr' ? 0.004 : 0.04;
		noiseHighpassNode.frequency.setTargetAtTime(preset.highpass, now, toneSmoothing);
		noiseLowpassNode.frequency.setTargetAtTime(preset.lowpass, now, toneSmoothing);

		const targetGain = Math.max(0.0001, Math.pow(volume / 100, 1.55) * preset.gain);
		noiseGainNode.gain.cancelScheduledValues(now);
		noiseGainNode.gain.setTargetAtTime(targetGain, now, gainSmoothing);

		if (noiseCarrierNode) {
			noiseCarrierNode.type = preset.carrierWave ?? 'sine';
			noiseCarrierNode.frequency.cancelScheduledValues(now);
			noiseCarrierNode.frequency.setTargetAtTime(preset.carrierHz ?? 50, now, toneSmoothing);
		}
		if (noiseHarmonicNode) {
			noiseHarmonicNode.type = preset.harmonicWave ?? 'sine';
			noiseHarmonicNode.frequency.cancelScheduledValues(now);
			noiseHarmonicNode.frequency.setTargetAtTime(preset.harmonicHz ?? 100, now, toneSmoothing);
		}
		if (noiseHarmonicGainNode) {
			noiseHarmonicGainNode.gain.cancelScheduledValues(now);
			noiseHarmonicGainNode.gain.setTargetAtTime(
				preset.harmonicMix ?? 0.35,
				now,
				toneSmoothing
			);
		}
		if (noisePurrFormantANode) {
			noisePurrFormantANode.frequency.cancelScheduledValues(now);
			noisePurrFormantANode.frequency.setTargetAtTime(
				preset.formantAHz ?? 118,
				now,
				toneSmoothing
			);
			noisePurrFormantANode.Q.cancelScheduledValues(now);
			noisePurrFormantANode.Q.setTargetAtTime(preset.formantQ ?? 1.45, now, toneSmoothing);
		}
		if (noisePurrFormantBNode) {
			noisePurrFormantBNode.frequency.cancelScheduledValues(now);
			noisePurrFormantBNode.frequency.setTargetAtTime(
				preset.formantBHz ?? 238,
				now,
				toneSmoothing
			);
			noisePurrFormantBNode.Q.cancelScheduledValues(now);
			noisePurrFormantBNode.Q.setTargetAtTime(preset.formantQ ?? 1.45, now, toneSmoothing);
		}
		if (noisePurrFormantAGainNode) {
			noisePurrFormantAGainNode.gain.cancelScheduledValues(now);
			noisePurrFormantAGainNode.gain.setTargetAtTime(
				preset.formantMixA ?? 0.68,
				now,
				toneSmoothing
			);
		}
		if (noisePurrFormantBGainNode) {
			noisePurrFormantBGainNode.gain.cancelScheduledValues(now);
			noisePurrFormantBGainNode.gain.setTargetAtTime(
				preset.formantMixB ?? 0.47,
				now,
				toneSmoothing
			);
		}
		if (noiseJitterOscNode) {
			noiseJitterOscNode.frequency.cancelScheduledValues(now);
			noiseJitterOscNode.frequency.setTargetAtTime(
				preset.jitterRateHz ?? 0.82,
				now,
				toneSmoothing
			);
		}
		if (noiseJitterCarrierGainNode) {
			noiseJitterCarrierGainNode.gain.cancelScheduledValues(now);
			noiseJitterCarrierGainNode.gain.setTargetAtTime(
				preset.jitterDepthHz ?? 1.6,
				now,
				toneSmoothing
			);
		}
		if (noiseJitterHarmonicGainNode) {
			noiseJitterHarmonicGainNode.gain.cancelScheduledValues(now);
			noiseJitterHarmonicGainNode.gain.setTargetAtTime(
				(preset.jitterDepthHz ?? 1.6) * 1.8,
				now,
				toneSmoothing
			);
		}

		if (noiseModOscNode && noiseModGainNode) {
			const baseModRate = Math.max(0.08, preset.modRateHz ?? 0.1);
			noiseModOscNode.type = preset.modWave ?? 'sine';
			noiseModOscNode.frequency.cancelScheduledValues(now);
			noiseModOscNode.frequency.setTargetAtTime(baseModRate, now, modSmoothing);

			if (noiseModRateLfoNode && noiseModRateLfoGainNode) {
				noiseModRateLfoNode.frequency.cancelScheduledValues(now);
				noiseModRateLfoNode.frequency.setTargetAtTime(
					preset.modRateDriftHz ?? 0.12,
					now,
					modSmoothing
				);
				const modRateDriftAmount = Math.max(
					0,
					Math.min(baseModRate * 0.85, preset.modRateDriftAmountHz ?? 0)
				);
				noiseModRateLfoGainNode.gain.cancelScheduledValues(now);
				noiseModRateLfoGainNode.gain.setTargetAtTime(modRateDriftAmount, now, modSmoothing);
			}

			const modulationDepth = Math.max(
				0,
				Math.min(targetGain * 0.92, targetGain * (preset.modDepth ?? 0))
			);
			noiseModGainNode.gain.cancelScheduledValues(now);
			noiseModGainNode.gain.setTargetAtTime(modulationDepth, now, modSmoothing);

			if (noiseModDepthLfoNode && noiseModDepthLfoGainNode) {
				noiseModDepthLfoNode.frequency.cancelScheduledValues(now);
				noiseModDepthLfoNode.frequency.setTargetAtTime(
					preset.modDepthDriftHz ?? 0.48,
					now,
					modSmoothing
				);
				const driftMix = Math.max(0, Math.min(0.49, preset.modDepthDriftMix ?? 0));
				noiseModDepthLfoGainNode.gain.cancelScheduledValues(now);
				noiseModDepthLfoGainNode.gain.setTargetAtTime(
					modulationDepth * driftMix,
					now,
					modSmoothing
				);
			}
		}
	}

	function destroyNoiseSource() {
		if (noiseSourceNode) {
			noiseSourceNode.onended = null;
			try {
				noiseSourceNode.stop();
			} catch {
				// Ignore stop errors if node already ended.
			}
			noiseSourceNode.disconnect();
			noiseSourceNode = null;
		}
		if (noiseCarrierNode) {
			try {
				noiseCarrierNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseCarrierNode.disconnect();
			noiseCarrierNode = null;
		}
		if (noiseHarmonicNode) {
			try {
				noiseHarmonicNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseHarmonicNode.disconnect();
			noiseHarmonicNode = null;
		}
		if (noiseHarmonicGainNode) {
			noiseHarmonicGainNode.disconnect();
			noiseHarmonicGainNode = null;
		}
		if (noiseJitterOscNode) {
			try {
				noiseJitterOscNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseJitterOscNode.disconnect();
			noiseJitterOscNode = null;
		}
		if (noiseJitterCarrierGainNode) {
			noiseJitterCarrierGainNode.disconnect();
			noiseJitterCarrierGainNode = null;
		}
		if (noiseJitterHarmonicGainNode) {
			noiseJitterHarmonicGainNode.disconnect();
			noiseJitterHarmonicGainNode = null;
		}
		if (noisePurrPreMixNode) {
			noisePurrPreMixNode.disconnect();
			noisePurrPreMixNode = null;
		}
		if (noisePurrFormantANode) {
			noisePurrFormantANode.disconnect();
			noisePurrFormantANode = null;
		}
		if (noisePurrFormantBNode) {
			noisePurrFormantBNode.disconnect();
			noisePurrFormantBNode = null;
		}
		if (noisePurrFormantAGainNode) {
			noisePurrFormantAGainNode.disconnect();
			noisePurrFormantAGainNode = null;
		}
		if (noisePurrFormantBGainNode) {
			noisePurrFormantBGainNode.disconnect();
			noisePurrFormantBGainNode = null;
		}

		if (noiseModOscNode) {
			try {
				noiseModOscNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseModOscNode.disconnect();
			noiseModOscNode = null;
		}
		if (noiseModRateLfoNode) {
			try {
				noiseModRateLfoNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseModRateLfoNode.disconnect();
			noiseModRateLfoNode = null;
		}
		if (noiseModRateLfoGainNode) {
			noiseModRateLfoGainNode.disconnect();
			noiseModRateLfoGainNode = null;
		}
		if (noiseModDepthLfoNode) {
			try {
				noiseModDepthLfoNode.stop();
			} catch {
				// Ignore stop errors if oscillator already ended.
			}
			noiseModDepthLfoNode.disconnect();
			noiseModDepthLfoNode = null;
		}
		if (noiseModDepthLfoGainNode) {
			noiseModDepthLfoGainNode.disconnect();
			noiseModDepthLfoGainNode = null;
		}
		if (noiseModGainNode) {
			noiseModGainNode.disconnect();
			noiseModGainNode = null;
		}

		if (noiseGainNode) {
			noiseGainNode.disconnect();
			noiseGainNode = null;
		}
		if (noiseLowpassNode) {
			noiseLowpassNode.disconnect();
			noiseLowpassNode = null;
		}
		if (noiseHighpassNode) {
			noiseHighpassNode.disconnect();
			noiseHighpassNode = null;
		}
	}

	async function start(preset: NoisePreset, volume: number): Promise<NoiseEngineStartResult> {
		const context = resolveNoiseAudioContext();
		if (!context) {
			return { ok: false, error: 'Web Audio is unavailable in this browser.' };
		}

		if (context.state === 'suspended') {
			await context.resume().catch(() => undefined);
		}

		destroyNoiseSource();

		const source = context.createBufferSource();
		const highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		const lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		const gain = context.createGain();
		const modOsc = context.createOscillator();
		const modGain = context.createGain();
		const modRateLfo = context.createOscillator();
		const modRateLfoGain = context.createGain();
		const modDepthLfo = context.createOscillator();
		const modDepthLfoGain = context.createGain();

		modOsc.type = 'sine';
		modOsc.frequency.value = 0.1;
		modGain.gain.value = 0;
		modRateLfo.type = 'sine';
		modRateLfo.frequency.value = 0.12;
		modRateLfoGain.gain.value = 0;
		modDepthLfo.type = 'sine';
		modDepthLfo.frequency.value = 0.48;
		modDepthLfoGain.gain.value = 0;

		if (preset.source === 'purr') {
			const carrier = context.createOscillator();
			carrier.type = preset.carrierWave ?? 'sawtooth';
			carrier.frequency.value = preset.carrierHz ?? 50;

			const harmonic = context.createOscillator();
			harmonic.type = preset.harmonicWave ?? 'triangle';
			harmonic.frequency.value = preset.harmonicHz ?? 100;

			const harmonicGain = context.createGain();
			harmonicGain.gain.value = preset.harmonicMix ?? 0.35;

			const preMix = context.createGain();
			preMix.gain.value = 1;
			const formantA = context.createBiquadFilter();
			formantA.type = 'bandpass';
			formantA.frequency.value = preset.formantAHz ?? 118;
			formantA.Q.value = preset.formantQ ?? 1.45;
			const formantB = context.createBiquadFilter();
			formantB.type = 'bandpass';
			formantB.frequency.value = preset.formantBHz ?? 238;
			formantB.Q.value = preset.formantQ ?? 1.45;
			const formantAGain = context.createGain();
			formantAGain.gain.value = preset.formantMixA ?? 0.68;
			const formantBGain = context.createGain();
			formantBGain.gain.value = preset.formantMixB ?? 0.47;

			carrier.connect(preMix);
			harmonic.connect(harmonicGain);
			harmonicGain.connect(preMix);
			preMix.connect(formantA);
			preMix.connect(formantB);
			formantA.connect(formantAGain);
			formantB.connect(formantBGain);
			formantAGain.connect(highpass);
			formantBGain.connect(highpass);

			const jitterOsc = context.createOscillator();
			jitterOsc.type = 'sine';
			jitterOsc.frequency.value = preset.jitterRateHz ?? 0.82;
			const jitterCarrierGain = context.createGain();
			jitterCarrierGain.gain.value = preset.jitterDepthHz ?? 1.6;
			const jitterHarmonicGain = context.createGain();
			jitterHarmonicGain.gain.value = (preset.jitterDepthHz ?? 1.6) * 1.8;
			jitterOsc.connect(jitterCarrierGain);
			jitterOsc.connect(jitterHarmonicGain);
			jitterCarrierGain.connect(carrier.frequency);
			jitterHarmonicGain.connect(harmonic.frequency);

			noiseCarrierNode = carrier;
			noiseHarmonicNode = harmonic;
			noiseHarmonicGainNode = harmonicGain;
			noisePurrPreMixNode = preMix;
			noisePurrFormantANode = formantA;
			noisePurrFormantBNode = formantB;
			noisePurrFormantAGainNode = formantAGain;
			noisePurrFormantBGainNode = formantBGain;
			noiseJitterOscNode = jitterOsc;
			noiseJitterCarrierGainNode = jitterCarrierGain;
			noiseJitterHarmonicGainNode = jitterHarmonicGain;
		} else {
			source.buffer = buildNoiseBuffer(context, 3);
			source.loop = true;
			source.connect(highpass);
		}

		highpass.connect(lowpass);
		lowpass.connect(gain);
		modRateLfo.connect(modRateLfoGain);
		modRateLfoGain.connect(modOsc.frequency);
		modOsc.connect(modGain);
		modDepthLfo.connect(modDepthLfoGain);
		modDepthLfoGain.connect(modGain.gain);
		modGain.connect(gain.gain);
		gain.connect(context.destination);

		noiseSourceNode = preset.source === 'noise' ? source : null;
		noiseHighpassNode = highpass;
		noiseLowpassNode = lowpass;
		noiseGainNode = gain;
		noiseModOscNode = modOsc;
		noiseModGainNode = modGain;
		noiseModRateLfoNode = modRateLfo;
		noiseModRateLfoGainNode = modRateLfoGain;
		noiseModDepthLfoNode = modDepthLfo;
		noiseModDepthLfoGainNode = modDepthLfoGain;
		applyPresetToNodes(preset, volume);
		try {
			modRateLfo.start();
			modDepthLfo.start();
			modOsc.start();
			if (preset.source === 'purr') {
				noiseCarrierNode?.start();
				noiseHarmonicNode?.start();
				noiseJitterOscNode?.start();
			} else {
				source.start();
			}
		} catch {
			destroyNoiseSource();
			return { ok: false, error: 'Unable to start audio output.' };
		}

		if (preset.source === 'noise') {
			source.onended = () => {
				if (noiseSourceNode === source) {
					noiseSourceNode = null;
				}
			};
		}

		return { ok: true };
	}

	function stop() {
		destroyNoiseSource();
	}

	async function close() {
		destroyNoiseSource();
		if (noiseAudioContext) {
			await noiseAudioContext.close().catch(() => undefined);
			noiseAudioContext = null;
		}
	}

	return {
		start,
		stop,
		applyPreset: applyPresetToNodes,
		close
	};
}
