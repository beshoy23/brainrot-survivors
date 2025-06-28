import { Scene } from 'phaser';

interface ChestReward {
  type: 'xp' | 'health' | 'upgrade' | 'weapon';
  value: number;
  name: string;
  description: string;
  icon: string; // Color hex for now, could be sprite key later
}

export class ChestRewardScene extends Scene {
  private rewards: ChestReward[] = [];
  private onComplete?: () => void;
  
  constructor() {
    super({ key: 'ChestRewardScene' });
  }
  
  init(data: { rewards: ChestReward[], onComplete: () => void }): void {
    this.rewards = data.rewards;
    this.onComplete = data.onComplete;
  }
  
  create(): void {
    // Dark overlay background
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.8
    );
    overlay.setDepth(0);
    
    // Main reward window
    const windowWidth = Math.min(400, this.scale.width - 40);
    const windowHeight = Math.min(300, this.scale.height - 40);
    
    const rewardWindow = this.add.graphics();
    rewardWindow.setPosition(this.scale.width / 2, this.scale.height / 2);
    rewardWindow.setDepth(10);
    
    // Window background with gradient effect
    rewardWindow.fillGradientStyle(0x2a1810, 0x4a2820, 0x2a1810, 0x4a2820, 1);
    rewardWindow.fillRoundedRect(-windowWidth/2, -windowHeight/2, windowWidth, windowHeight, 15);
    
    // Golden border
    rewardWindow.lineStyle(4, 0xFFD700, 1);
    rewardWindow.strokeRoundedRect(-windowWidth/2, -windowHeight/2, windowWidth, windowHeight, 15);
    
    // Inner glow
    rewardWindow.lineStyle(2, 0xFFF8DC, 0.6);
    rewardWindow.strokeRoundedRect(-windowWidth/2 + 4, -windowHeight/2 + 4, windowWidth - 8, windowHeight - 8, 12);
    
    // Title
    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - windowHeight/2 + 30,
      'MYSTERIOUS CHEST REWARDS',
      {
        fontSize: '24px',
        color: '#FFD700',
        fontFamily: 'Arial Black',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    title.setOrigin(0.5);
    title.setDepth(20);
    
    // Subtitle with mystical flavor
    const subtitle = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - windowHeight/2 + 60,
      '"Ancient magic flows through you..."',
      {
        fontSize: '14px',
        color: '#DDA0DD',
        fontFamily: 'Arial',
        fontStyle: 'italic'
      }
    );
    subtitle.setOrigin(0.5);
    subtitle.setDepth(20);
    
    // Reward items
    this.displayRewards(windowWidth, windowHeight);
    
    // Continue button
    this.createContinueButton(windowHeight);
    
    // Entrance animation
    rewardWindow.setScale(0);
    title.setScale(0);
    subtitle.setScale(0);
    
    this.tweens.add({
      targets: [rewardWindow, title, subtitle],
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.out',
      delay: 100
    });
    
    // Sparkle effects around the window
    this.createSparkleEffects();
    
    // Play reward sound
    this.playRewardSounds();
  }
  
  private displayRewards(windowWidth: number, windowHeight: number): void {
    const startY = this.scale.height / 2 - 20;
    const itemSpacing = 45;
    
    this.rewards.forEach((reward, index) => {
      const yPos = startY + (index * itemSpacing);
      
      // Reward background
      const itemBg = this.add.graphics();
      itemBg.setPosition(this.scale.width / 2, yPos);
      itemBg.setDepth(15);
      
      // Item background with subtle glow
      itemBg.fillStyle(0x3a2820, 0.8);
      itemBg.fillRoundedRect(-windowWidth/2 + 20, -15, windowWidth - 40, 30, 8);
      itemBg.lineStyle(1, 0x8B7355, 0.6);
      itemBg.strokeRoundedRect(-windowWidth/2 + 20, -15, windowWidth - 40, 30, 8);
      
      // Reward icon
      const icon = this.add.graphics();
      icon.setPosition(this.scale.width / 2 - windowWidth/2 + 40, yPos);
      icon.setDepth(20);
      
      // Draw icon based on reward type
      this.drawRewardIcon(icon, reward);
      
      // Reward text
      const rewardText = this.add.text(
        this.scale.width / 2 - windowWidth/2 + 70,
        yPos - 8,
        reward.name,
        {
          fontSize: '16px',
          color: '#FFFFFF',
          fontFamily: 'Arial',
          fontStyle: 'bold'
        }
      );
      rewardText.setDepth(20);
      
      // Reward description
      const descText = this.add.text(
        this.scale.width / 2 - windowWidth/2 + 70,
        yPos + 6,
        reward.description,
        {
          fontSize: '12px',
          color: '#CCCCCC',
          fontFamily: 'Arial'
        }
      );
      descText.setDepth(20);
      
      // Animate items in sequence
      itemBg.setAlpha(0);
      icon.setScale(0);
      rewardText.setAlpha(0);
      descText.setAlpha(0);
      
      this.tweens.add({
        targets: [itemBg, rewardText, descText],
        alpha: 1,
        duration: 300,
        delay: 500 + (index * 150),
        ease: 'Power2'
      });
      
      this.tweens.add({
        targets: icon,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        delay: 500 + (index * 150),
        ease: 'Back.out'
      });
    });
  }
  
  private drawRewardIcon(graphics: Phaser.GameObjects.Graphics, reward: ChestReward): void {
    graphics.clear();
    
    switch (reward.type) {
      case 'xp':
        // XP Crystal - use polygon instead of fillStar
        graphics.fillStyle(0x00FFFF, 1);
        graphics.beginPath();
        // Draw a diamond/crystal shape
        graphics.moveTo(0, -8);
        graphics.lineTo(6, 0);
        graphics.lineTo(0, 8);
        graphics.lineTo(-6, 0);
        graphics.closePath();
        graphics.fill();
        graphics.lineStyle(2, 0x87CEEB, 1);
        graphics.strokeCircle(0, 0, 6);
        break;
        
      case 'health':
        // Health Potion
        graphics.fillStyle(0xFF0000, 1);
        graphics.fillRoundedRect(-6, -8, 12, 16, 3);
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillRect(-2, -6, 4, 2);
        graphics.fillCircle(0, -4, 3);
        break;
        
      case 'upgrade':
        // Upgrade Scroll
        graphics.fillStyle(0xF5DEB3, 1);
        graphics.fillRoundedRect(-8, -6, 16, 12, 2);
        graphics.lineStyle(1, 0xDAA520, 1);
        graphics.strokeRoundedRect(-8, -6, 16, 12, 2);
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(-6, -3, 12, 1);
        graphics.fillRect(-6, 0, 12, 1);
        graphics.fillRect(-6, 3, 12, 1);
        break;
        
      case 'weapon':
        // Weapon Icon
        graphics.fillStyle(0xC0C0C0, 1);
        graphics.fillRect(-2, -8, 4, 16);
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillRect(-6, -8, 12, 4);
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(-1, 4, 2, 6);
        break;
    }
  }
  
  private createContinueButton(windowHeight: number): void {
    const buttonY = this.scale.height / 2 + windowHeight/2 - 40;
    
    // Button background
    const buttonBg = this.add.graphics();
    buttonBg.setPosition(this.scale.width / 2, buttonY);
    buttonBg.setDepth(15);
    
    buttonBg.fillStyle(0x4a4a4a, 1);
    buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
    buttonBg.lineStyle(2, 0xFFD700, 1);
    buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    
    // Button text
    const buttonText = this.add.text(
      this.scale.width / 2,
      buttonY,
      'CONTINUE',
      {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Arial Black'
      }
    );
    buttonText.setOrigin(0.5);
    buttonText.setDepth(20);
    
    // Make button interactive
    const hitArea = this.add.rectangle(
      this.scale.width / 2,
      buttonY,
      120,
      30,
      0x000000,
      0
    );
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setDepth(25);
    
    // Button hover effects
    hitArea.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x6a6a6a, 1);
      buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
      buttonBg.lineStyle(2, 0xFFFF00, 1);
      buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    });
    
    hitArea.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x4a4a4a, 1);
      buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
      buttonBg.lineStyle(2, 0xFFD700, 1);
      buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    });
    
    hitArea.on('pointerdown', () => {
      // Visual feedback
      buttonBg.setScale(0.95);
      buttonText.setScale(0.95);
      
      this.time.delayedCall(100, () => {
        this.closeRewardWindow();
      });
    });
    
    // Animate button in
    buttonBg.setScale(0);
    buttonText.setScale(0);
    
    this.tweens.add({
      targets: [buttonBg, buttonText],
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: 800 + (this.rewards.length * 150),
      ease: 'Back.out'
    });
    
    // Also allow spacebar or enter to continue
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.closeRewardWindow();
    });
    
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.closeRewardWindow();
    });
  }
  
  private createSparkleEffects(): void {
    // Create magical sparkles around the window
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(Math.random() * 2000, () => {
        const sparkle = this.add.graphics();
        sparkle.setDepth(5);
        
        // Random position around window
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 100;
        const x = this.scale.width / 2 + Math.cos(angle) * distance;
        const y = this.scale.height / 2 + Math.sin(angle) * distance;
        
        sparkle.setPosition(x, y);
        
        // Draw sparkle - use polygon instead of fillStar
        sparkle.fillStyle(0xFFFFFF, 1);
        sparkle.beginPath();
        // Draw a simple 4-pointed star
        sparkle.moveTo(0, -4);
        sparkle.lineTo(1, -1);
        sparkle.lineTo(4, 0);
        sparkle.lineTo(1, 1);
        sparkle.lineTo(0, 4);
        sparkle.lineTo(-1, 1);
        sparkle.lineTo(-4, 0);
        sparkle.lineTo(-1, -1);
        sparkle.closePath();
        sparkle.fill();
        
        // Animate sparkle
        sparkle.setScale(0);
        this.tweens.add({
          targets: sparkle,
          scaleX: 1,
          scaleY: 1,
          alpha: 0,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => sparkle.destroy()
        });
      });
    }
  }
  
  private playRewardSounds(): void {
    // Play sequence of satisfying sounds
    // Window open sound
    // Note: These would be actual audio files in a real game
    
    // Item reveal sounds (delayed)
    this.rewards.forEach((reward, index) => {
      this.time.delayedCall(500 + (index * 150), () => {
        // Play reward sound based on type
      });
    });
    
    // Final completion sound
    this.time.delayedCall(800 + (this.rewards.length * 150), () => {
      // Play completion chime
    });
  }
  
  private closeRewardWindow(): void {
    // Fade out animation
    const allObjects = this.children.getAll();
    
    this.tweens.add({
      targets: allObjects,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.onComplete) {
          this.onComplete();
        }
        this.scene.stop();
      }
    });
  }
}

// Export reward types for use in other files
export { ChestReward };