import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export type InputMode = 'AUTO_TARGET' | 'MANUAL_AIM';

export interface InputModeEvents {
  'mode-changed': (mode: InputMode) => void;
  'aim-direction-set': (direction: Vector2) => void;
  'manual-fire-requested': (direction: Vector2) => void;
}

export class InputModeManager {
  private scene: Scene;
  private currentMode: InputMode = 'AUTO_TARGET';
  private eventEmitter: Phaser.Events.EventEmitter;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.eventEmitter = new Phaser.Events.EventEmitter();
  }
  
  // Public API for mode management
  getCurrentMode(): InputMode {
    return this.currentMode;
  }
  
  isInAimingMode(): boolean {
    return this.currentMode === 'MANUAL_AIM';
  }
  
  switchToAiming(): void {
    if (this.currentMode === 'MANUAL_AIM') return;
    
    this.currentMode = 'MANUAL_AIM';
    this.eventEmitter.emit('mode-changed', this.currentMode);
  }
  
  switchToAutoTarget(): void {
    if (this.currentMode === 'AUTO_TARGET') return;
    
    this.currentMode = 'AUTO_TARGET';
    this.eventEmitter.emit('mode-changed', this.currentMode);
  }
  
  // Event management for clean communication
  on<K extends keyof InputModeEvents>(event: K, callback: InputModeEvents[K]): void {
    this.eventEmitter.on(event, callback);
  }
  
  off<K extends keyof InputModeEvents>(event: K, callback: InputModeEvents[K]): void {
    this.eventEmitter.off(event, callback);
  }
  
  // Called by input handlers to request actions
  requestManualFire(direction: Vector2): void {
    if (this.currentMode === 'MANUAL_AIM') {
      this.eventEmitter.emit('manual-fire-requested', direction);
      // Automatically return to auto-targeting after manual fire
      this.switchToAutoTarget();
    }
  }
  
  setAimDirection(direction: Vector2): void {
    if (this.currentMode === 'MANUAL_AIM') {
      this.eventEmitter.emit('aim-direction-set', direction);
    }
  }
  
  // Cleanup
  destroy(): void {
    this.eventEmitter.removeAllListeners();
  }
}