import { Scene } from 'phaser';

export class SoundManager {
  private scene: Scene;
  private enabled: boolean = true;
  private volume: number = 0.3;
  private audioContext?: AudioContext;

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

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume * this.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Ignore audio errors
    }
  }

  private playPickupSound(): void {
    // Happy pickup - quick ascending notes
    this.playTone(800, 0.08, 'square', 0.2);
    setTimeout(() => this.playTone(1000, 0.08, 'square', 0.15), 40);
  }

  private playLevelUpSound(): void {
    // Triumphant level up - chord progression
    this.playTone(523, 0.3, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.3, 'sine', 0.25), 100); // E5
    setTimeout(() => this.playTone(784, 0.4, 'sine', 0.3), 200); // G5
  }

  private playHitSound(): void {
    // Sharp hit - quick noise burst
    this.playTone(150, 0.05, 'sawtooth', 0.15);
  }

  private playDeathSound(): void {
    // Enemy death - descending tone
    if (!this.audioContext) return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0.2 * this.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (e) {
      // Ignore
    }
  }

  private playShootSound(): void {
    // Quick shoot - brief tone
    this.playTone(1200, 0.03, 'square', 0.1);
  }

  play(soundKey: string, options?: { volume?: number; rate?: number }): void {
    if (!this.enabled) return;
    
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
    this.sounds.forEach(sound => {
      if ('setVolume' in sound) {
        (sound as any).setVolume(this.volume);
      }
    });
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}