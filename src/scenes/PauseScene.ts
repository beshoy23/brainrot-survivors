import { Scene } from 'phaser';

export class PauseScene extends Scene {
  private stats: any = {};
  private background!: Phaser.GameObjects.Rectangle;
  private container!: Phaser.GameObjects.Container;
  private isMobile: boolean = false;

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: any): void {
    this.stats = data || {};
  }

  create(): void {
    const { width, height } = this.scale;
    this.isMobile = (window as any).isMobile || false;

    // Semi-transparent background
    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.background.setInteractive();

    // Main container
    this.container = this.add.container(width / 2, height / 2);

    // Title
    const titleY = this.isMobile ? -height * 0.35 : -200;
    const title = this.add.text(0, titleY, 'PAUSED', {
      fontSize: this.isMobile ? '36px' : '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Cool VS-style stats
    this.createStatDisplay();

    // Resume button
    const buttonY = this.isMobile ? height * 0.3 : 180;
    const buttonWidth = this.isMobile ? 250 : 200;
    const buttonHeight = this.isMobile ? 60 : 50;
    
    const resumeButton = this.add.graphics();
    resumeButton.fillStyle(0x00ff00);
    resumeButton.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    resumeButton.lineStyle(3, 0xffffff);
    resumeButton.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    resumeButton.x = 0;
    resumeButton.y = buttonY;
    
    const hitArea = this.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: !this.isMobile });
    
    const resumeText = this.add.text(0, buttonY, 'RESUME', {
      fontSize: this.isMobile ? '28px' : '24px',
      fontFamily: 'Arial Black',
      color: '#ffffff'
    });
    resumeText.setOrigin(0.5);

    this.container.add([resumeButton, hitArea, resumeText]);
    
    hitArea.on('pointerover', () => {
      resumeButton.clear();
      resumeButton.fillStyle(0x44ff44);
      resumeButton.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      resumeButton.lineStyle(3, 0xffffff);
      resumeButton.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      this.container.setScale(1.05);
    });

    hitArea.on('pointerout', () => {
      resumeButton.clear();
      resumeButton.fillStyle(0x00ff00);
      resumeButton.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      resumeButton.lineStyle(3, 0xffffff);
      resumeButton.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      this.container.setScale(1);
    });

    hitArea.on('pointerdown', () => {
      this.resumeGame();
    });

    // Keyboard input
    this.input.keyboard!.on('keydown-ESC', () => {
      this.resumeGame();
    });

    // Prevent clicks from going through to game
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  private createStatDisplay(): void {
    const yOffset = this.isMobile ? 0 : -50;
    const statsContainer = this.add.container(0, yOffset);

    // Format time survived
    const minutes = Math.floor((this.stats.survivalTime || 0) / 60000);
    const seconds = Math.floor(((this.stats.survivalTime || 0) % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const statItems = [
      { label: 'Time Survived', value: timeString },
      { label: 'Player Level', value: this.stats.playerLevel || 1 },
      { label: 'Enemies Killed', value: this.stats.enemiesKilled || 0 },
      { label: 'XP Collected', value: this.stats.totalXP || 0 },
      { label: 'Damage Dealt', value: this.stats.damageDealt || 0 },
      { label: 'Active Enemies', value: this.stats.activeEnemies || 0 }
    ];

    if (this.isMobile) {
      // Mobile: Two column layout
      const colWidth = Math.min(this.scale.width * 0.45, 200);
      const gap = 20;
      const startX = -colWidth - gap/2;
      
      statItems.forEach((stat, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = startX + col * (colWidth + gap);
        const y = row * 35;
        
        // Combined label and value
        const statText = this.add.text(x, y, `${stat.label}: ${stat.value}`, {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2
        });
        statText.setOrigin(0, 0.5);
        statsContainer.add(statText);
      });
    } else {
      // Desktop: Original layout
      statItems.forEach((stat, index) => {
        const y = index * 35;
        
        // Label
        const label = this.add.text(-150, y, stat.label + ':', {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 3
        });
        label.setOrigin(0, 0.5);

        // Value
        const value = this.add.text(150, y, stat.value.toString(), {
          fontSize: '24px',
          fontFamily: 'Arial Bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3
        });
        value.setOrigin(1, 0.5);

        statsContainer.add([label, value]);
      });
    }

    // Add cool tip
    const tips = [
      'TIP: Collect gems quickly for bonus XP!',
      'TIP: Stay moving to avoid enemy swarms!',
      'TIP: Upgrade damage for faster clears!',
      'TIP: XP Magnet helps collect gems easier!',
      'TIP: Armor reduces all incoming damage!',
      'TIP: Health Regen keeps you alive longer!'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const tipY = this.isMobile ? 200 : 250;
    const tipText = this.add.text(0, tipY, randomTip, {
      fontSize: this.isMobile ? '16px' : '18px',
      fontFamily: 'Arial',
      color: '#88ff88',
      stroke: '#000000',
      strokeThickness: 2
    });
    tipText.setOrigin(0.5);

    this.container.add([statsContainer, tipText]);
  }

  private resumeGame(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}