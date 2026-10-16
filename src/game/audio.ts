/**
 * Procedural Horror Web Audio Synthesizer
 * Zero external audio files, 100% procedural Web Audio API.
 */

class HorrorAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Ambient Drone nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;

  // Tension / Monster proximity drone
  private tensionOsc: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private tensionFilter: BiquadFilterNode | null = null;

  // Heartbeat tracking
  private lastHeartbeatTime: number = 0;
  private heartbeatInterval: number = 1.2; // seconds

  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbientDrone();
      this.startTensionDrone();
      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;

    // Sub-bass rumble osc
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(46.2, this.ctx.currentTime); // Slight detune for binaural beat

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(110, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  private startTensionDrone() {
    if (!this.ctx || !this.masterGain) return;

    this.tensionOsc = this.ctx.createOscillator();
    this.tensionOsc.type = 'triangle';
    this.tensionOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    this.tensionFilter = this.ctx.createBiquadFilter();
    this.tensionFilter.type = 'bandpass';
    this.tensionFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.tensionFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.tensionGain = this.ctx.createGain();
    this.tensionGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.tensionOsc.connect(this.tensionFilter);
    this.tensionFilter.connect(this.tensionGain);
    this.tensionGain.connect(this.masterGain);

    this.tensionOsc.start();
  }

  /**
   * Update tension audio based on proximity to stalker entity (0 = far, 1 = right behind you)
   */
  public updateTension(proximity: number, isChasing: boolean) {
    if (!this.ctx || !this.tensionGain || !this.tensionFilter || !this.tensionOsc) return;

    const t = this.ctx.currentTime;
    const targetGain = isChasing ? 0.35 : Math.pow(proximity, 1.5) * 0.25;
    this.tensionGain.gain.setTargetAtTime(Math.max(0.0001, targetGain), t, 0.1);

    const targetFreq = 120 + proximity * 350 + (isChasing ? 180 : 0);
    this.tensionOsc.frequency.setTargetAtTime(targetFreq, t, 0.15);

    // Subtle pitch mod
    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(90 + proximity * 150, t, 0.2);
    }
  }

  /**
   * Procedural Heartbeat sound
   */
  public triggerHeartbeat(intensity: number = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    const playThump = (timeOffset: number, freq: number, gainVal: number) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(30, t + timeOffset + 0.12);

      gain.gain.setValueAtTime(gainVal * (0.3 + intensity * 0.5), t + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + timeOffset);
      osc.stop(t + timeOffset + 0.15);
    };

    playThump(0, 65, 0.6);
    playThump(0.12, 50, 0.4);
  }

  /**
   * Periodic heartbeat tick
   */
  public tickHeartbeat(bpm: number, intensity: number) {
    const now = performance.now() / 1000;
    this.heartbeatInterval = 60 / Math.max(40, bpm);

    if (now - this.lastHeartbeatTime >= this.heartbeatInterval) {
      this.lastHeartbeatTime = now;
      this.triggerHeartbeat(intensity);
    }
  }

  /**
   * Footstep sound (procedural concrete / wooden thud)
   */
  public playFootstep(isSprinting: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = isSprinting ? 95 : 75;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250 + Math.random() * 80, t);

    const vol = isSprinting ? 0.35 : 0.18;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Flashlight switch click
   */
  public playFlashlightClick(turnOn: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(turnOn ? 1800 : 1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Flashlight battery recharge / keycard pickup chime
   */
  public playItemPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.18, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.3);
    });
  }

  /**
   * Dedicated Battery Pickup sound: Electric zap/hum + high-energy ascending chime
   */
  public playBatteryPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Electric zap/hum
    const zapOsc = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(220, t);
    zapOsc.frequency.linearRampToValueAtTime(880, t + 0.15);

    zapGain.gain.setValueAtTime(0.2, t);
    zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    zapOsc.connect(zapGain);
    zapGain.connect(this.masterGain);
    zapOsc.start(t);
    zapOsc.stop(t + 0.22);

    // Chime chords
    const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chimeNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + 0.05 + idx * 0.05);

      gain.gain.setValueAtTime(0.25, t + 0.05 + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + 0.05 + idx * 0.05);
      osc.stop(t + 0.05 + idx * 0.05 + 0.4);
    });
  }

  /**
   * Sound played when flashlight battery drains to 0% and shuts off
   */
  public playBatteryDied() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * Dry metallic click when attempting to switch on an empty flashlight
   */
  public playEmptyClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Low battery beep warning
   */
  public playBatteryLowWarning() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.setValueAtTime(800, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Heavy iron door opening / unlocked squeak
   */
  public playDoorOpen() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.4);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  /**
   * Monster screech / alert roar when spotting the player
   */
  public playMonsterAlert() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = 50;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(260, t);
    osc1.frequency.exponentialRampToValueAtTime(680, t + 0.15);
    osc1.frequency.exponentialRampToValueAtTime(180, t + 0.6);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(190, t);
    osc2.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(120, t + 0.6);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc1.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.7);
    osc2.stop(t + 0.7);
  }

  /**
   * Jumpscare sting / death impact chord
   */
  public playJumpscareSting() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const clusterFreqs = [110, 116, 233, 246, 466, 493, 932];

    clusterFreqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 1.2);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.4);
    });
  }

  /**
   * Creepy whispering / radio static noise burst
   */
  public playStaticBurst(duration: number = 0.3) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Heavy exhausted breathing when sprinting or terrified
   */
  public playBreathing(intensity: number) {
    if (!this.ctx || !this.masterGain || this.isMuted || intensity < 0.2) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t);

    gain.gain.setValueAtTime(0.08 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * Terrifying Ghost Screech for low-light face apparition jumpscare
   */
  public playGhostScreech() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, t);
    osc1.frequency.exponentialRampToValueAtTime(1900, t + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.35);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(860, t);
    osc2.frequency.exponentialRampToValueAtTime(2200, t + 0.09);
    osc2.frequency.exponentialRampToValueAtTime(280, t + 0.38);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.48);
    osc2.stop(t + 0.48);
  }

  /**
   * Explosive fluorescent light bulb pop & electric shatter
   */
  public playBulbBurst() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // High frequency glass snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(2400, t);
    snapOsc.frequency.exponentialRampToValueAtTime(150, t + 0.06);

    snapGain.gain.setValueAtTime(0.35, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    snapOsc.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapOsc.start(t);
    snapOsc.stop(t + 0.08);

    // Electric fizzle
    this.playStaticBurst(0.25);
  }

  /**
   * Paranormal breathy binaural whisper
   */
  public playParanormalWhisper() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const dur = 0.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(1400, t + 0.3);
    filter.frequency.linearRampToValueAtTime(600, t + dur);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Rapid phantom footsteps rushing right toward the player
   */
  public playRushingPhantomSteps() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const stepTimes = [0, 0.08, 0.15, 0.21, 0.26, 0.30];
    stepTimes.forEach((delay, idx) => {
      setTimeout(() => {
        this.playFootstep(true);
      }, delay * 1000);
    });
  }

  /**
   * Deep bass impact + shockwave hit
   */
  public playSuddenShock() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }
}

export const soundManager = new HorrorAudioEngine();
