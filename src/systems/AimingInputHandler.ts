import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export interface AimingInputEvents {
  'aim-start': (startPos: Vector2) => void;
  'aim-update': (direction: Vector2, startPos: Vector2) => void;
  'aim-complete': (direction: Vector2) => void;
  'aim-cancel': () => void;
}

export class AimingInputHandler {
  private scene: Scene;
  private eventEmitter: Phaser.Events.EventEmitter;
  
  // Input state
  private isTracking: boolean = false;
  private trackingTouchId: number | null = null;
  private startPos: Vector2 = new Vector2();
  private currentPos: Vector2 = new Vector2();
  private holdTimer?: number;
  
  // Configuration
  private holdThreshold: number = 50; // ms to hold before aiming starts (very fast for testing)
  private maxAimDistance: number = 150; // pixels
  private minDragDistance: number = 20; // pixels to cancel if moved too early
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.eventEmitter = new Phaser.Events.EventEmitter();
    this.setupInputListeners();
  }
  
  // Event management
  on<K extends keyof AimingInputEvents>(event: K, callback: AimingInputEvents[K]): void {
    this.eventEmitter.on(event, callback);
  }
  
  off<K extends keyof AimingInputEvents>(event: K, callback: AimingInputEvents[K]): void {
    this.eventEmitter.off(event, callback);
  }
  
  // Public API
  isCurrentlyAiming(): boolean {
    return this.isTracking;
  }
  
  getCurrentDirection(): Vector2 {
    return this.calculateDirection();
  }
  
  getStartPosition(): Vector2 {
    return new Vector2(this.startPos.x, this.startPos.y);
  }
  
  private setupInputListeners(): void {
    console.log('🎯 AimingInputHandler: Setting up input listeners');
    
    // Listen to scene input events with high priority (prepend: true)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleInputStart(pointer);
    }, undefined, true); // prepend: true gives higher priority
    
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleInputMove(pointer);
    }, undefined, true);
    
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleInputEnd(pointer);
    }, undefined, true);
  }
  
  private handleInputStart(pointer: Phaser.Input.Pointer): void {
    console.log('🎯 AimingInputHandler: Touch start detected at', pointer.x, pointer.y);
    
    // Allow aiming from anywhere for user-friendly experience
    this.trackingTouchId = pointer.id;
    this.startPos.set(pointer.x, pointer.y);
    this.currentPos.set(pointer.x, pointer.y);
    
    console.log('🎯 Starting hold timer for', this.holdThreshold, 'ms');
    
    // Start hold timer
    this.holdTimer = window.setTimeout(() => {
      console.log('🎯 Hold timer fired! Starting aiming...');
      this.startAiming();
    }, this.holdThreshold);
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }
  
  private handleInputMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.trackingTouchId) return;
    
    this.currentPos.set(pointer.x, pointer.y);
    
    if (this.isTracking) {
      // Update aiming direction
      const direction = this.calculateDirection();
      this.eventEmitter.emit('aim-update', direction, this.getStartPosition());
    } else {
      // Check if moved too far before aiming started (cancel)
      const dragDistance = this.startPos.distanceTo(this.currentPos);
      if (dragDistance > this.minDragDistance) {
        this.cancelAiming();
      }
    }
  }
  
  private handleInputEnd(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.trackingTouchId) return;
    
    if (this.isTracking) {
      // Complete the aim
      const direction = this.calculateDirection();
      this.eventEmitter.emit('aim-complete', direction);
    }
    
    this.endTracking();
  }
  
  private startAiming(): void {
    console.log('🎯 Starting aiming mode!');
    this.isTracking = true;
    this.holdTimer = undefined;
    
    // Emit aim start event
    console.log('🎯 Emitting aim-start event');
    this.eventEmitter.emit('aim-start', this.getStartPosition());
    
    // Initial direction update
    const direction = this.calculateDirection();
    console.log('🎯 Initial direction:', direction.x, direction.y);
    this.eventEmitter.emit('aim-update', direction, this.getStartPosition());
    
    // Strong haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
  
  private cancelAiming(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
    
    if (this.isTracking) {
      this.eventEmitter.emit('aim-cancel');
    }
    
    this.endTracking();
  }
  
  private endTracking(): void {
    this.isTracking = false;
    this.trackingTouchId = null;
    
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  }
  
  private calculateDirection(): Vector2 {
    const deltaX = this.currentPos.x - this.startPos.x;
    const deltaY = this.currentPos.y - this.startPos.y;
    
    // Limit aim distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, this.maxAimDistance);
    
    if (distance > 0) {
      const normalizedX = deltaX / distance;
      const normalizedY = deltaY / distance;
      
      return new Vector2(
        normalizedX * clampedDistance,
        normalizedY * clampedDistance
      );
    }
    
    return new Vector2(0, 0);
  }
  
  // Cleanup
  destroy(): void {
    this.endTracking();
    this.eventEmitter.removeAllListeners();
    
    // Remove scene input listeners
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');  
    this.scene.input.off('pointerup');
  }
}