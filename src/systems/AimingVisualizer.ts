import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';
import { Enemy } from '../entities/Enemy';

export interface AimingVisuals {
  aimArrow?: Phaser.GameObjects.Graphics;
  trajectoryLine?: Phaser.GameObjects.Graphics;
  targetHighlights: Phaser.GameObjects.Graphics[];
  aimCircle?: Phaser.GameObjects.Graphics;
}

export class AimingVisualizer {
  private scene: Scene;
  private visuals: AimingVisuals = {
    targetHighlights: []
  };
  
  // Configuration
  private maxAimDistance: number = 150; // pixels
  private aimingRange: number = 60; // actual weapon range during aiming
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.createVisuals();
  }
  
  // Update range based on actual weapon stats
  updateRange(weaponRange: number): void {
    this.aimingRange = weaponRange;
  }
  
  // Public API for visual control
  showAiming(): void {
    this.visuals.aimArrow?.setVisible(true);
    this.visuals.trajectoryLine?.setVisible(true);
    this.visuals.aimCircle?.setVisible(true);
  }
  
  hideAiming(): void {
    this.visuals.aimArrow?.setVisible(false);
    this.visuals.trajectoryLine?.setVisible(false);
    this.visuals.aimCircle?.setVisible(false);
    
    // Hide target highlights
    this.visuals.targetHighlights.forEach(highlight => {
      highlight.setVisible(false);
    });
  }
  
  updateAimingVisuals(
    playerPos: Vector2, 
    aimingStartPos: Vector2, 
    aimingDirection: Vector2,
    enemies: Enemy[]
  ): void {
    // Draw aim arrow
    this.drawAimArrow(playerPos, aimingDirection);
    
    // Draw trajectory line  
    this.drawTrajectoryLine(playerPos, aimingDirection);
    
    // Draw aim circle
    this.drawAimCircle(aimingStartPos);
    
    // Highlight potential targets
    this.highlightTargets(playerPos, aimingDirection, enemies);
  }
  
  private createVisuals(): void {
    // Create reusable visual elements
    this.visuals.aimArrow = this.scene.add.graphics();
    this.visuals.trajectoryLine = this.scene.add.graphics();
    this.visuals.aimCircle = this.scene.add.graphics();
    
    // Set high depth to appear above game objects
    this.visuals.aimArrow.setDepth(1000);
    this.visuals.trajectoryLine.setDepth(999);
    this.visuals.aimCircle.setDepth(998);
    
    // Initially hidden
    this.hideAiming();
  }
  
  private drawAimArrow(playerPos: Vector2, aimingDirection: Vector2): void {
    const arrow = this.visuals.aimArrow;
    if (!arrow) return;
    
    arrow.clear();
    arrow.lineStyle(4, 0x00ff00, 1);
    arrow.fillStyle(0x00ff00, 1);
    
    // Draw arrow from player to aim direction
    const endX = playerPos.x + aimingDirection.x;
    const endY = playerPos.y + aimingDirection.y;
    
    // Arrow line
    arrow.moveTo(playerPos.x, playerPos.y);
    arrow.lineTo(endX, endY);
    
    // Arrow head
    const angle = Math.atan2(aimingDirection.y, aimingDirection.x);
    const headLength = 15;
    const headAngle = Math.PI / 6;
    
    arrow.moveTo(endX, endY);
    arrow.lineTo(
      endX - headLength * Math.cos(angle - headAngle),
      endY - headLength * Math.sin(angle - headAngle)
    );
    arrow.moveTo(endX, endY);
    arrow.lineTo(
      endX - headLength * Math.cos(angle + headAngle),
      endY - headLength * Math.sin(angle + headAngle)
    );
    
    arrow.stroke();
  }
  
  private drawTrajectoryLine(playerPos: Vector2, aimingDirection: Vector2): void {
    const line = this.visuals.trajectoryLine;
    if (!line) return;
    
    line.clear();
    line.lineStyle(2, 0x00ff00, 0.5);
    
    // Draw dashed line showing trajectory
    const steps = 10;
    const stepLength = this.aimingRange / steps;
    
    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) continue; // Skip every other step for dashed effect
      
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      
      const x1 = playerPos.x + aimingDirection.x * t1 * stepLength;
      const y1 = playerPos.y + aimingDirection.y * t1 * stepLength;
      const x2 = playerPos.x + aimingDirection.x * t2 * stepLength;
      const y2 = playerPos.y + aimingDirection.y * t2 * stepLength;
      
      line.moveTo(x1, y1);
      line.lineTo(x2, y2);
    }
    
    line.stroke();
  }
  
  private drawAimCircle(aimingStartPos: Vector2): void {
    const circle = this.visuals.aimCircle;
    if (!circle) return;
    
    circle.clear();
    circle.lineStyle(2, 0x00ff00, 0.3);
    
    // Draw circle around touch start position showing actual kick range
    circle.strokeCircle(aimingStartPos.x, aimingStartPos.y, this.aimingRange);
  }
  
  private highlightTargets(playerPos: Vector2, aimingDirection: Vector2, enemies: Enemy[]): void {
    // Clear previous highlights
    this.visuals.targetHighlights.forEach(highlight => {
      highlight.destroy();
    });
    this.visuals.targetHighlights = [];
    
    // Find enemies in kick direction
    enemies.forEach((enemy: Enemy) => {
      if (!enemy.sprite.active || enemy.isDying) return;
      
      const enemyPos = new Vector2(enemy.sprite.x, enemy.sprite.y);
      const distance = playerPos.distanceTo(enemyPos);
      
      if (distance <= this.aimingRange) {
        // Check if enemy is in aim direction
        const toEnemyX = enemyPos.x - playerPos.x;
        const toEnemyY = enemyPos.y - playerPos.y;
        const toEnemyMag = Math.sqrt(toEnemyX * toEnemyX + toEnemyY * toEnemyY);
        
        const aimDirMag = Math.sqrt(aimingDirection.x * aimingDirection.x + aimingDirection.y * aimingDirection.y);
        
        if (aimDirMag > 0 && toEnemyMag > 0) {
          // Normalize and calculate dot product manually
          const aimDirNormX = aimingDirection.x / aimDirMag;
          const aimDirNormY = aimingDirection.y / aimDirMag;
          const toEnemyNormX = toEnemyX / toEnemyMag;
          const toEnemyNormY = toEnemyY / toEnemyMag;
          
          const dot = aimDirNormX * toEnemyNormX + aimDirNormY * toEnemyNormY;
          
          if (dot > 0.7) { // Within 45 degrees
            // Create highlight
            const highlight = this.scene.add.graphics();
            highlight.lineStyle(3, 0xff0000, 1);
            highlight.strokeCircle(enemy.sprite.x, enemy.sprite.y, enemy.hitboxRadius + 5);
            highlight.setDepth(997);
            
            this.visuals.targetHighlights.push(highlight);
          }
        }
      }
    });
  }
  
  // Cleanup
  destroy(): void {
    this.visuals.aimArrow?.destroy();
    this.visuals.trajectoryLine?.destroy();
    this.visuals.aimCircle?.destroy();
    this.visuals.targetHighlights.forEach(highlight => highlight.destroy());
    this.visuals.targetHighlights = [];
  }
}