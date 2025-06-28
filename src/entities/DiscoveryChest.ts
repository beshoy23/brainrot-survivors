import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';
import { ChestReward } from '../scenes/ChestRewardScene';

export class DiscoveryChest {
  public sprite: GameObjects.Graphics;
  public isCollected: boolean = false;
  private glowGraphics: GameObjects.Graphics;
  private pulseTime: number = 0;
  
  constructor(scene: Scene, x: number, y: number) {
    // Create main chest sprite
    this.sprite = scene.add.graphics();
    this.sprite.setPosition(x, y);
    this.sprite.setDepth(15); // Above background, below player
    
    // Create glow effect
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setPosition(x, y);
    this.glowGraphics.setDepth(14); // Behind chest
    
    this.drawChest();
    this.drawGlow();
  }
  
  private drawChest(): void {
    this.sprite.clear();
    
    if (this.isCollected) return; // Don't draw if collected
    
    // Chest body - wooden brown
    this.sprite.fillStyle(0x8B4513, 1);
    this.sprite.fillRect(-12, -8, 24, 16);
    
    // Chest lid - slightly darker
    this.sprite.fillStyle(0x654321, 1);
    this.sprite.fillRect(-12, -12, 24, 8);
    
    // Metal bands - dark gray
    this.sprite.fillStyle(0x444444, 1);
    this.sprite.fillRect(-12, -4, 24, 2);
    this.sprite.fillRect(-12, 4, 24, 2);
    
    // Lock - gold
    this.sprite.fillStyle(0xFFD700, 1);
    this.sprite.fillCircle(0, -2, 3);
    this.sprite.fillRect(-1, -2, 2, 4);
    
    // Keyhole - black
    this.sprite.fillStyle(0x000000, 1);
    this.sprite.fillCircle(0, -2, 1.5);
    
    // Corner reinforcements
    this.sprite.fillStyle(0x444444, 1);
    this.sprite.fillRect(-12, -12, 3, 3);
    this.sprite.fillRect(9, -12, 3, 3);
    this.sprite.fillRect(-12, 5, 3, 3);
    this.sprite.fillRect(9, 5, 3, 3);
  }
  
  private drawGlow(): void {
    this.glowGraphics.clear();
    
    if (this.isCollected) return; // Don't glow if collected
    
    // Magical glow effect with multiple layers
    const glowLayers = 4;
    const baseRadius = 20;
    
    for (let i = glowLayers; i > 0; i--) {
      const layerRadius = (baseRadius / glowLayers) * i;
      const alpha = 0.15 * (1 - (i - 1) / glowLayers);
      
      // Mystical purple/blue glow
      this.glowGraphics.fillStyle(0x9370DB, alpha);
      this.glowGraphics.fillCircle(0, 0, layerRadius);
    }
    
    // Bright center sparkle
    this.glowGraphics.fillStyle(0xFFFFFF, 0.3);
    this.glowGraphics.fillCircle(0, 0, 3);
  }
  
  update(deltaTime: number): void {
    if (this.isCollected) return;
    
    // Update pulse animation
    this.pulseTime += deltaTime;
    const pulseFactor = 0.9 + Math.sin(this.pulseTime * 0.005) * 0.1; // Slow mystical pulse
    
    this.glowGraphics.setScale(pulseFactor);
    
    // Sparkle effect - random tiny sparkles around the chest
    if (Math.random() < 0.02) { // 2% chance per frame
      this.createSparkle();
    }
  }
  
  private createSparkle(): void {
    const scene = this.sprite.scene;
    const sparkle = scene.add.graphics();
    
    // Random position around chest
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = this.sprite.x + Math.cos(angle) * distance;
    const y = this.sprite.y + Math.sin(angle) * distance;
    
    sparkle.setPosition(x, y);
    sparkle.setDepth(16); // Above chest
    
    // Draw sparkle
    sparkle.fillStyle(0xFFFFFF, 1);
    sparkle.fillCircle(0, 0, 1);
    
    // Animate sparkle
    scene.tweens.add({
      targets: sparkle,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      ease: 'Power2',
      onComplete: () => sparkle.destroy()
    });
  }
  
  getPosition(): Vector2 {
    return new Vector2(this.sprite.x, this.sprite.y);
  }
  
  isPlayerNear(playerPos: Vector2, threshold: number = 30): boolean {
    if (this.isCollected) return false;
    
    const dx = this.sprite.x - playerPos.x;
    const dy = this.sprite.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= threshold;
  }
  
  collect(onRewardComplete: () => void): void {
    if (this.isCollected) return;
    
    this.isCollected = true;
    
    // Create collection effect
    const scene = this.sprite.scene;
    
    // Bright flash
    const flash = scene.add.graphics();
    flash.setPosition(this.sprite.x, this.sprite.y);
    flash.setDepth(20);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(0, 0, 30);
    
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
    
    // Hide chest and glow
    this.sprite.setVisible(false);
    this.glowGraphics.setVisible(false);
    
    // Create floating particles
    for (let i = 0; i < 12; i++) {
      const particle = scene.add.graphics();
      particle.setPosition(this.sprite.x, this.sprite.y);
      particle.setDepth(19);
      
      const angle = (i / 12) * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      
      particle.fillStyle(0xFFD700, 1);
      particle.fillCircle(0, 0, 2);
      
      scene.tweens.add({
        targets: particle,
        x: this.sprite.x + Math.cos(angle) * distance,
        y: this.sprite.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Generate rewards and show reward window
    const rewards = this.generateRewards();
    this.showRewardWindow(rewards, onRewardComplete);
  }
  
  private generateRewards(): ChestReward[] {
    const rewards: ChestReward[] = [];
    
    // Always give generous XP (50% of current level requirement)
    rewards.push({
      type: 'xp',
      value: 50, // Will be calculated as percentage in GameScene
      name: 'Ancient Knowledge',
      description: 'Gain substantial experience',
      icon: '0x00FFFF'
    });
    
    // Always give some health
    rewards.push({
      type: 'health',
      value: 20,
      name: 'Healing Essence',
      description: 'Restore 20 health points',
      icon: '0xFF0000'
    });
    
    // Random third reward (30% chance for upgrade token)
    if (Math.random() < 0.3) {
      rewards.push({
        type: 'upgrade',
        value: 1,
        name: 'Mysterious Scroll',
        description: 'Unlocks powerful abilities',
        icon: '0xF5DEB3'
      });
    }
    
    return rewards;
  }
  
  private showRewardWindow(rewards: ChestReward[], onComplete: () => void): void {
    const scene = this.sprite.scene;
    
    // Launch reward scene
    scene.scene.launch('ChestRewardScene', {
      rewards: rewards,
      onComplete: onComplete
    });
    
    // Pause the game scene
    scene.scene.pause();
  }
  
  destroy(): void {
    this.sprite.destroy();
    this.glowGraphics.destroy();
  }
}