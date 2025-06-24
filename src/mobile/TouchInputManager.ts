import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';
import { DeviceDetection } from './DeviceDetection';
import { MobileConfig } from './MobileConfig';

export interface TouchInput {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  isActive: boolean;
}

export interface SwipeEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
}

export class TouchInputManager {
  private scene: Scene;
  private touches: Map<number, TouchInput> = new Map();
  private primaryTouchId: number | null = null;
  
  // Callbacks
  private onSwipeCallbacks: ((swipe: SwipeEvent) => void)[] = [];
  private onTapCallbacks: ((x: number, y: number) => void)[] = [];
  private onDoubleTapCallbacks: ((x: number, y: number) => void)[] = [];
  
  // Touch zones
  private touchZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  
  // Double tap detection
  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;
  private doubleTapThreshold: number = 300; // ms
  private doubleTapDistance: number = 50; // pixels
  
  // Pinch gesture
  private isPinching: boolean = false;
  private lastPinchDistance: number = 0;
  private onPinchCallbacks: ((scale: number) => void)[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    // Enable multi-touch
    this.scene.input.addPointer(3); // Support up to 4 fingers (including default)
    
    // Touch start
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const touch: TouchInput = {
        id: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        currentX: pointer.x,
        currentY: pointer.y,
        startTime: Date.now(),
        isActive: true
      };
      
      this.touches.set(pointer.id, touch);
      
      // Set primary touch if not set
      if (this.primaryTouchId === null) {
        this.primaryTouchId = pointer.id;
      }
      
      // Check for double tap
      this.checkDoubleTap(pointer.x, pointer.y);
      
      // Haptic feedback
      if (MobileConfig.platform.vibrationEnabled) {
        DeviceDetection.getInstance().vibrate(10);
      }
    });
    
    // Touch move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const touch = this.touches.get(pointer.id);
      if (touch && touch.isActive) {
        touch.currentX = pointer.x;
        touch.currentY = pointer.y;
        
        // Check for pinch gesture
        if (this.touches.size === 2) {
          this.handlePinchGesture();
        }
      }
    });
    
    // Touch end
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const touch = this.touches.get(pointer.id);
      if (touch && touch.isActive) {
        touch.isActive = false;
        
        // Check for swipe
        this.checkSwipe(touch);
        
        // Check for tap
        const duration = Date.now() - touch.startTime;
        const distance = Math.sqrt(
          Math.pow(touch.currentX - touch.startX, 2) + 
          Math.pow(touch.currentY - touch.startY, 2)
        );
        
        if (duration < 200 && distance < 10) {
          this.onTapCallbacks.forEach(cb => cb(touch.currentX, touch.currentY));
        }
        
        // Clean up
        this.touches.delete(pointer.id);
        if (pointer.id === this.primaryTouchId) {
          this.primaryTouchId = null;
          // Find new primary touch if any
          for (const [id, t] of this.touches) {
            if (t.isActive) {
              this.primaryTouchId = id;
              break;
            }
          }
        }
      }
      
      this.isPinching = false;
    });
  }

  private checkDoubleTap(x: number, y: number): void {
    const now = Date.now();
    const distance = Math.sqrt(
      Math.pow(x - this.lastTapX, 2) + 
      Math.pow(y - this.lastTapY, 2)
    );
    
    if (now - this.lastTapTime < this.doubleTapThreshold && 
        distance < this.doubleTapDistance) {
      this.onDoubleTapCallbacks.forEach(cb => cb(x, y));
      this.lastTapTime = 0; // Reset to prevent triple tap
    } else {
      this.lastTapTime = now;
      this.lastTapX = x;
      this.lastTapY = y;
    }
  }

  private checkSwipe(touch: TouchInput): void {
    const dx = touch.currentX - touch.startX;
    const dy = touch.currentY - touch.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - touch.startTime;
    
    if (distance > MobileConfig.controls.swipeThreshold && duration < 500) {
      const velocity = distance / duration;
      let direction: 'up' | 'down' | 'left' | 'right';
      
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      
      const swipeEvent: SwipeEvent = { direction, distance, velocity };
      this.onSwipeCallbacks.forEach(cb => cb(swipeEvent));
    }
  }

  private handlePinchGesture(): void {
    const touches = Array.from(this.touches.values()).filter(t => t.isActive);
    if (touches.length === 2) {
      const distance = Math.sqrt(
        Math.pow(touches[0].currentX - touches[1].currentX, 2) +
        Math.pow(touches[0].currentY - touches[1].currentY, 2)
      );
      
      if (this.isPinching) {
        const scale = distance / this.lastPinchDistance;
        this.onPinchCallbacks.forEach(cb => cb(scale));
      } else {
        this.isPinching = true;
      }
      
      this.lastPinchDistance = distance;
    }
  }

  // Public methods
  
  getPrimaryTouch(): TouchInput | null {
    if (this.primaryTouchId !== null) {
      return this.touches.get(this.primaryTouchId) || null;
    }
    return null;
  }

  getTouchCount(): number {
    return Array.from(this.touches.values()).filter(t => t.isActive).length;
  }

  createTouchZone(name: string, x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(x, y, width, height);
    zone.setInteractive();
    zone.setScrollFactor(0);
    this.touchZones.set(name, zone);
    return zone;
  }

  getTouchZone(name: string): Phaser.GameObjects.Zone | undefined {
    return this.touchZones.get(name);
  }

  // Event listeners
  
  onSwipe(callback: (swipe: SwipeEvent) => void): void {
    this.onSwipeCallbacks.push(callback);
  }

  onTap(callback: (x: number, y: number) => void): void {
    this.onTapCallbacks.push(callback);
  }

  onDoubleTap(callback: (x: number, y: number) => void): void {
    this.onDoubleTapCallbacks.push(callback);
  }

  onPinch(callback: (scale: number) => void): void {
    this.onPinchCallbacks.push(callback);
  }

  // Utility methods
  
  getTouchDelta(touchId?: number): Vector2 {
    const id = touchId ?? this.primaryTouchId;
    if (id === null) return new Vector2(0, 0);
    
    const touch = this.touches.get(id);
    if (!touch || !touch.isActive) return new Vector2(0, 0);
    
    return new Vector2(
      touch.currentX - touch.startX,
      touch.currentY - touch.startY
    );
  }

  getTouchVelocity(touchId?: number): Vector2 {
    const id = touchId ?? this.primaryTouchId;
    if (id === null) return new Vector2(0, 0);
    
    const touch = this.touches.get(id);
    if (!touch || !touch.isActive) return new Vector2(0, 0);
    
    const duration = (Date.now() - touch.startTime) / 1000; // Convert to seconds
    if (duration === 0) return new Vector2(0, 0);
    
    return new Vector2(
      (touch.currentX - touch.startX) / duration,
      (touch.currentY - touch.startY) / duration
    );
  }

  destroy(): void {
    this.touches.clear();
    this.touchZones.clear();
    this.onSwipeCallbacks = [];
    this.onTapCallbacks = [];
    this.onDoubleTapCallbacks = [];
    this.onPinchCallbacks = [];
  }
}