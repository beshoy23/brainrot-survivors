import { Scene } from 'phaser';

export class SoundManager {
  private scene: Scene;
  private enabled: boolean = true;
  private volume: number = 0.4;
  private audioContext?: AudioContext;
  private activeSounds: Set<AudioNode> = new Set();
  private soundCooldowns: Map<string, number> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      // Audio not supported
      this.enabled = false;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3, delay: number = 0): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      const startTime = this.audioContext.currentTime + delay;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.exponentialRampToValueAtTime(volume * this.volume, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      this.activeSounds.add(oscillator);
      setTimeout(() => this.activeSounds.delete(oscillator), (delay + duration) * 1000);
    } catch (e) {
      // Ignore audio errors
    }
  }

  private playPickupSound(): void {
    // Satisfying pickup - sparkly ascending chord
    const baseFreq = 600 + Math.random() * 400; // Vary pitch slightly
    this.playTone(baseFreq, 0.06, 'triangle', 0.25);
    this.playTone(baseFreq * 1.25, 0.08, 'sine', 0.2, 0.02);
    this.playTone(baseFreq * 1.5, 0.1, 'sine', 0.15, 0.04);
    this.playTone(baseFreq * 2, 0.12, 'triangle', 0.1, 0.06);
  }

  private playLevelUpSound(): void {
    // Epic level up fanfare with harmonics
    const notes = [261.63, 329.63, 392.00, 523.25]; // C-E-G-C chord
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.5, 'sine', 0.3 - i * 0.05, i * 0.08);
      this.playTone(freq * 2, 0.3, 'triangle', 0.15 - i * 0.02, i * 0.08 + 0.1);
    });
    
    // Add sparkle
    for (let i = 0; i < 6; i++) {
      this.playTone(1000 + Math.random() * 1000, 0.05, 'square', 0.1, 0.3 + i * 0.05);
    }
  }

  private playHitSound(): void {
    // Punchy hit with impact
    const impact = 80 + Math.random() * 100;
    this.playTone(impact, 0.03, 'sawtooth', 0.25);
    this.playTone(impact * 2, 0.02, 'square', 0.15, 0.01);
    this.playTone(impact * 0.5, 0.08, 'triangle', 0.1, 0.02);
  }

  private playDeathSound(): void {
    // Quick, subtle death sound for mass enemies
    const pitch = 150 + Math.random() * 100;
    
    // Very brief, satisfying pop
    this.playTone(pitch, 0.04, 'triangle', 0.12);
    this.playTone(pitch * 1.5, 0.02, 'sine', 0.08, 0.01);
  }

  private playShootSound(): void {
    // Varied shoot sounds to prevent monotony
    const shootTypes = ['laser', 'pop', 'zap'];
    const type = shootTypes[Math.floor(Math.random() * shootTypes.length)];
    
    switch (type) {
      case 'laser':
        this.playTone(1200 + Math.random() * 400, 0.04, 'sawtooth', 0.12);
        this.playTone(800 + Math.random() * 200, 0.02, 'square', 0.08, 0.01);
        break;
      case 'pop':
        this.playTone(600 + Math.random() * 300, 0.03, 'triangle', 0.15);
        this.playTone(1200 + Math.random() * 400, 0.02, 'sine', 0.1, 0.01);
        break;
      case 'zap':
        this.playTone(1500 + Math.random() * 500, 0.025, 'square', 0.1);
        this.playTone(2000 + Math.random() * 600, 0.015, 'triangle', 0.06, 0.01);
        break;
    }
  }

  play(soundKey: string, options?: { volume?: number; rate?: number }): void {
    if (!this.enabled) return;
    
    // Prevent audio spam with cooldowns
    const now = Date.now();
    const cooldownTime = this.soundCooldowns.get(soundKey) || 0;
    
    // Different cooldowns for different sounds
    const cooldowns = {
      'shoot': 25,   // Very short for rapid fire
      'hit': 20,
      'pickup': 50,
      'death': 15,   // Very short for mass enemies
      'levelup': 500 // Longer for important sounds
    };
    
    if (now - cooldownTime < (cooldowns[soundKey] || 50)) {
      return; // Still in cooldown
    }
    
    this.soundCooldowns.set(soundKey, now);
    
    // Temporarily adjust volume if specified
    const originalVolume = this.volume;
    if (options?.volume !== undefined) {
      this.volume = options.volume;
    }
    
    switch (soundKey) {
      case 'pickup':
        this.playPickupSound();
        break;
      case 'levelup':
        this.playLevelUpSound();
        break;
      case 'hit':
        this.playHitSound();
        break;
      case 'death':
        this.playDeathSound();
        break;
      case 'shoot':
        this.playShootSound();
        break;
    }
    
    // Restore original volume
    this.volume = originalVolume;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  destroy(): void {
    this.activeSounds.clear();
    this.soundCooldowns.clear();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}