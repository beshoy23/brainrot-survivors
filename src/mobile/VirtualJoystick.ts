import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';
import { MobileConfig } from './MobileConfig';
import { DeviceDetection } from './DeviceDetection';

export class VirtualJoystick {
  private scene: Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private handle: Phaser.GameObjects.Graphics;
  private touchZone: Phaser.GameObjects.Zone;
  
  private baseX: number;
  private baseY: number;
  private size: number;
  private handleSize: number;
  
  private isDragging: boolean = false;
  private touchId: number | null = null;
  private direction: Vector2 = new Vector2(0, 0);
  private distance: number = 0;
  
  // Settings
  private config = MobileConfig.controls.virtualJoystick;
  private isFixed: boolean;
  private deadZone: number;
  
  constructor(scene: Scene, x?: number, y?: number) {
    this.scene = scene;
    this.size = this.config.size;
    this.handleSize = this.size * 0.4;
    // Always use dynamic positioning
    this.isFixed = false;
    this.deadZone = this.config.deadZone;
    
    // Dynamic joystick starts hidden
    this.baseX = 0;
    this.baseY = 0;
    
    this.create();
  }

  private create(): void {
    // Container for all joystick elements
    this.container = this.scene.add.container(this.baseX, this.baseY);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);
    
    // Background circle
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0xffffff, this.config.opacity * 0.3);
    this.background.lineStyle(3, 0xffffff, this.config.opacity);
    this.background.fillCircle(0, 0, this.size / 2);
    this.background.strokeCircle(0, 0, this.size / 2);
    
    // Handle (moveable part)
    this.handle = this.scene.add.graphics();
    this.handle.fillStyle(0xffffff, this.config.opacity);
    this.handle.fillCircle(0, 0, this.handleSize / 2);
    
    // Add to container
    this.container.add([this.background, this.handle]);
    
    // Create touch zone - entire screen for dynamic joystick
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.touchZone = this.scene.add.zone(width / 2, height / 2, width, height);
    this.container.setVisible(false); // Hide until touched
    
    this.touchZone.setInteractive();
    this.touchZone.setScrollFactor(0);
    
    this.setupEvents();
  }

  private setupEvents(): void {
    // Touch start
    this.touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.touchId === null) {
        // Check if touch is in UI exclusion zones (top-right for pause button)
        const uiExclusionSize = 120; // Larger exclusion zone for better pause button access
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;
        
        // Top-right exclusion zone for pause button
        if (pointer.x > screenWidth - uiExclusionSize && pointer.y < uiExclusionSize) {
          return; // Don't handle this touch - let UI elements handle it
        }
        
        this.touchId = pointer.id;
        this.isDragging = true;
        
        // Always move joystick to touch position
        this.baseX = pointer.x;
        this.baseY = pointer.y;
        this.container.setPosition(this.baseX, this.baseY);
        this.container.setVisible(true);
        
        // Update visual state
        this.background.clear();
        this.background.fillStyle(0xffffff, this.config.activeOpacity * 0.3);
        this.background.lineStyle(3, 0xffffff, this.config.activeOpacity);
        this.background.fillCircle(0, 0, this.size / 2);
        this.background.strokeCircle(0, 0, this.size / 2);
        
        // Haptic feedback
        if (MobileConfig.platform.vibrationEnabled) {
          DeviceDetection.getInstance().vibrate(20);
        }
      }
    });
    
    // Global touch move (so it works even if pointer moves outside zone)
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.id === this.touchId) {
        this.updateJoystick(pointer.x, pointer.y);
      }
    });
    
    // Global touch end
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.touchId) {
        this.release();
      }
    });
    
    // Handle scene sleep/wake
    this.scene.events.on('sleep', () => {
      this.release();
    });
  }

  private updateJoystick(pointerX: number, pointerY: number): void {
    const dx = pointerX - this.baseX;
    const dy = pointerY - this.baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Limit to joystick radius
    const maxDistance = this.size / 2 - this.handleSize / 2;
    this.distance = Math.min(distance / maxDistance, 1);
    
    if (distance > 0) {
      // Calculate direction
      this.direction.x = dx / distance;
      this.direction.y = dy / distance;
      
      // Position handle
      const handleDistance = Math.min(distance, maxDistance);
      this.handle.x = (dx / distance) * handleDistance;
      this.handle.y = (dy / distance) * handleDistance;
    } else {
      this.direction.set(0, 0);
      this.handle.setPosition(0, 0);
    }
  }

  private release(): void {
    this.isDragging = false;
    this.touchId = null;
    this.distance = 0;
    this.direction.set(0, 0);
    
    // Animate handle back to center
    this.scene.tweens.add({
      targets: this.handle,
      x: 0,
      y: 0,
      duration: 100,
      ease: 'Power2'
    });
    
    // Reset visual state
    this.background.clear();
    this.background.fillStyle(0xffffff, this.config.opacity * 0.3);
    this.background.lineStyle(3, 0xffffff, this.config.opacity);
    this.background.fillCircle(0, 0, this.size / 2);
    this.background.strokeCircle(0, 0, this.size / 2);
    
    // Always hide when released
    this.container.setVisible(false);
  }

  // Public methods
  
  getDirection(): Vector2 {
    if (this.distance < this.deadZone) {
      return new Vector2(0, 0);
    }
    return this.direction.clone();
  }

  getDistance(): number {
    return Math.max(0, this.distance - this.deadZone) / (1 - this.deadZone);
  }

  getVelocity(maxSpeed: number = 1): Vector2 {
    const distance = this.getDistance();
    const dir = this.getDirection();
    return new Vector2(dir.x * distance * maxSpeed, dir.y * distance * maxSpeed);
  }

  isActive(): boolean {
    return this.isDragging && this.distance > this.deadZone;
  }

  setFixed(fixed: boolean): void {
    this.isFixed = fixed;
    if (!fixed) {
      this.container.setVisible(false);
    } else {
      this.container.setVisible(true);
      this.container.setPosition(this.config.position.x, this.scene.scale.height + this.config.position.y);
    }
  }

  setSize(size: number): void {
    this.size = size;
    this.handleSize = size * 0.4;
    this.background.clear();
    this.handle.clear();
    this.create();
  }

  setOpacity(opacity: number): void {
    this.container.setAlpha(opacity);
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.touchZone.setInteractive();
    } else {
      this.touchZone.disableInteractive();
      this.release(); // Release any current touch
    }
  }

  destroy(): void {
    this.touchZone.destroy();
    this.container.destroy();
  }
}