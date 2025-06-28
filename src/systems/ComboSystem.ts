import { Scene } from 'phaser';

export interface ComboCallback {
  (comboCount: number, multiplier: number): void;
}

export class ComboSystem {
  private scene: Scene;
  private comboCount: number = 0;
  private comboMultiplier: number = 1.0;
  private lastComboTime: number = 0;
  private comboTimeout: number = 3000; // 3 seconds to keep combo alive
  private comboText?: Phaser.GameObjects.Text;
  private comboDisplay?: Phaser.GameObjects.Container;
  
  // Callbacks for combo events
  public onComboIncrease?: ComboCallback;
  public onComboReset?: ComboCallback;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.createComboDisplay();
  }
  
  private createComboDisplay(): void {
    // Create combo display container
    this.comboDisplay = this.scene.add.container(0, 0);
    this.comboDisplay.setDepth(150); // Very high depth
    this.comboDisplay.setVisible(false);
    
    // Background for combo counter
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(-80, -25, 160, 50, 10);
    background.lineStyle(3, 0xFF6600, 1);
    background.strokeRoundedRect(-80, -25, 160, 50, 10);
    
    // Combo text
    this.comboText = this.scene.add.text(0, 0, '', {
      fontSize: '24px',
      color: '#FF6600',
      stroke: '#FFFFFF',
      strokeThickness: 2,
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold'
    });
    this.comboText.setOrigin(0.5);
    
    this.comboDisplay.add([background, this.comboText]);
    
    // Position combo display in top-center
    this.comboDisplay.setPosition(
      this.scene.cameras.main.centerX,
      100
    );
  }
  
  addChainHit(): void {
    this.comboCount++;
    this.lastComboTime = Date.now();
    
    // Calculate exponential multiplier (1x, 1.5x, 2.25x, 3.38x, etc.)
    this.comboMultiplier = Math.pow(1.5, Math.min(this.comboCount - 1, 10));
    
    // Update display
    this.updateComboDisplay();
    
    // Show combo display
    if (!this.comboDisplay?.visible) {
      this.showComboDisplay();
    }
    
    // Trigger callback
    if (this.onComboIncrease) {
      this.onComboIncrease(this.comboCount, this.comboMultiplier);
    }
    
    // Special effects for high combos
    if (this.comboCount >= 5) {
      this.createComboEffect();
    }
  }
  
  private updateComboDisplay(): void {
    if (!this.comboText) return;
    
    const multiplierText = this.comboMultiplier > 1 ? 
      ` (${this.comboMultiplier.toFixed(1)}x)` : '';
    
    this.comboText.setText(`${this.comboCount} CHAIN${multiplierText}`);
    
    // Color coding based on combo level
    let color = '#FF6600'; // Orange default
    if (this.comboCount >= 10) {
      color = '#FF0066'; // Hot pink for amazing combos
    } else if (this.comboCount >= 5) {
      color = '#FF3300'; // Red for great combos
    } else if (this.comboCount >= 3) {
      color = '#FF9900'; // Yellow-orange for good combos
    }
    
    this.comboText.setColor(color);
  }
  
  private showComboDisplay(): void {
    if (!this.comboDisplay) return;
    
    this.comboDisplay.setVisible(true);
    this.comboDisplay.setScale(0.5);
    this.comboDisplay.setAlpha(0);
    
    // Animate in
    this.scene.tweens.add({
      targets: this.comboDisplay,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.out'
    });
  }
  
  private createComboEffect(): void {
    if (!this.comboDisplay) return;
    
    // Screen flash for high combos
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.3);
    flash.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    flash.setDepth(200); // Above everything
    
    // Flash animation
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy()
    });
    
    // Combo display pulse
    this.scene.tweens.add({
      targets: this.comboDisplay,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Particle burst at combo display
    this.createComboBurst();
  }
  
  private createComboBurst(): void {
    if (!this.comboDisplay) return;
    
    const x = this.comboDisplay.x;
    const y = this.comboDisplay.y;
    
    // Create multiple particles radiating out
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xFF6600, 1);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(x, y);
      particle.setDepth(160);
      
      // Animate particle outward
      const targetX = x + Math.cos(angle) * 80;
      const targetY = y + Math.sin(angle) * 80;
      
      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  update(): void {
    // Check if combo should timeout
    if (this.comboCount > 0 && Date.now() - this.lastComboTime > this.comboTimeout) {
      this.resetCombo();
    }
  }
  
  resetCombo(): void {
    if (this.comboCount === 0) return; // Already reset
    
    const oldCount = this.comboCount;
    const oldMultiplier = this.comboMultiplier;
    
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    
    // Hide combo display
    if (this.comboDisplay?.visible) {
      this.scene.tweens.add({
        targets: this.comboDisplay,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          if (this.comboDisplay) {
            this.comboDisplay.setVisible(false);
          }
        }
      });
    }
    
    // Trigger callback
    if (this.onComboReset) {
      this.onComboReset(oldCount, oldMultiplier);
    }
  }
  
  // Get current multiplier for damage calculations
  getCurrentMultiplier(): number {
    return this.comboMultiplier;
  }
  
  // Get current combo count
  getCurrentCombo(): number {
    return this.comboCount;
  }
  
  // Force reset (for game over, etc.)
  forceReset(): void {
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.lastComboTime = 0;
    
    if (this.comboDisplay) {
      this.comboDisplay.setVisible(false);
    }
  }
}