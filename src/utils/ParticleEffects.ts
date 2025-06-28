import { Scene, GameObjects } from 'phaser';

export class ParticleEffects {
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  createDeathExplosion(x: number, y: number, color: number = 0xff0000): void {
    // Create multiple blood/energy particles
    const particleCount = 8 + Math.floor(Math.random() * 4); // 8-12 particles
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(x, y);
      particle.setDepth(50); // Above most things
      
      // Random particle properties
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const velocity = 50 + Math.random() * 100; // 50-150 velocity
      const size = 2 + Math.random() * 3; // 2-5 pixel size
      const particleColor = this.getRandomParticleColor(color);
      
      // Draw particle
      particle.fillStyle(particleColor, 1);
      particle.fillCircle(0, 0, size);
      
      // Calculate final position
      const finalX = x + Math.cos(angle) * velocity;
      const finalY = y + Math.sin(angle) * velocity;
      
      // Animate particle
      this.scene.tweens.add({
        targets: particle,
        x: finalX,
        y: finalY,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300 + Math.random() * 200, // 300-500ms
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  createCriticalHitEffect(x: number, y: number): void {
    // Large yellow burst for critical hits
    const burst = this.scene.add.graphics();
    burst.setPosition(x, y);
    burst.setDepth(60);
    
    // Draw star-like burst
    burst.fillStyle(0xFFD700, 1);
    const spikes = 8;
    const innerRadius = 8;
    const outerRadius = 20;
    
    burst.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        burst.moveTo(x, y);
      } else {
        burst.lineTo(x, y);
      }
    }
    burst.closePath();
    burst.fill();
    
    // Animate burst
    this.scene.tweens.add({
      targets: burst,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => burst.destroy()
    });
  }
  
  createHitSpark(x: number, y: number, angle: number): void {
    // Small spark effect for regular hits
    const spark = this.scene.add.graphics();
    spark.setPosition(x, y);
    spark.setDepth(55);
    
    // Draw small spark
    spark.fillStyle(0xFFFFFF, 1);
    spark.fillCircle(0, 0, 3);
    
    // Move spark in hit direction
    const distance = 15 + Math.random() * 10;
    const finalX = x + Math.cos(angle) * distance;
    const finalY = y + Math.sin(angle) * distance;
    
    this.scene.tweens.add({
      targets: spark,
      x: finalX,
      y: finalY,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => spark.destroy()
    });
  }
  
  createChainHitEffect(x: number, y: number, angle: number): void {
    // Larger, orange burst effect for chain reaction hits
    const chainEffect = this.scene.add.graphics();
    chainEffect.setPosition(x, y);
    chainEffect.setDepth(56); // Above regular hit sparks
    
    // Create multiple orange sparks in a burst pattern
    const sparkCount = 5;
    for (let i = 0; i < sparkCount; i++) {
      const spark = this.scene.add.graphics();
      spark.setPosition(x, y);
      spark.setDepth(56);
      
      // Orange/yellow color for chain hits
      spark.fillStyle(0xFF8C00, 1); // Dark orange
      spark.fillCircle(0, 0, 2 + Math.random() * 2);
      
      // Spread sparks in multiple directions from hit angle
      const spreadAngle = angle + (Math.random() - 0.5) * Math.PI; // 180° spread
      const distance = 20 + Math.random() * 15; // Larger spread than regular hits
      const finalX = x + Math.cos(spreadAngle) * distance;
      const finalY = y + Math.sin(spreadAngle) * distance;
      
      this.scene.tweens.add({
        targets: spark,
        x: finalX,
        y: finalY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200 + Math.random() * 100, // Slightly longer than regular sparks
        ease: 'Power2',
        onComplete: () => spark.destroy()
      });
    }
    
    // Add a larger central burst
    chainEffect.fillStyle(0xFFD700, 0.8); // Golden color
    chainEffect.fillCircle(0, 0, 6);
    
    this.scene.tweens.add({
      targets: chainEffect,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 250,
      ease: 'Power2',
      onComplete: () => chainEffect.destroy()
    });
  }
  
  createXPBurst(x: number, y: number): void {
    // Cyan energy burst when XP drops
    const burstCount = 6;
    
    for (let i = 0; i < burstCount; i++) {
      const energy = this.scene.add.graphics();
      energy.setPosition(x, y);
      energy.setDepth(45);
      
      const angle = (i / burstCount) * Math.PI * 2;
      const distance = 20 + Math.random() * 15;
      
      // Draw energy particle
      energy.fillStyle(0x00FFFF, 0.8);
      energy.fillCircle(0, 0, 2);
      
      // Radial burst animation
      this.scene.tweens.add({
        targets: energy,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 250,
        ease: 'Power2',
        onComplete: () => energy.destroy()
      });
    }
  }
  
  private getRandomParticleColor(baseColor: number): number {
    // Add some variation to particle colors
    const colors = [baseColor];
    
    if (baseColor === 0xff0000) {
      // Red enemy - add darker reds and orange
      colors.push(0xCC0000, 0x990000, 0xFF3300);
    } else if (baseColor === 0x00ffff) {
      // Cyan enemy - add blues and whites
      colors.push(0x0099CC, 0x3366FF, 0xCCFFFF);
    } else {
      // Default variations
      colors.push(0xFFFFFF, 0xCCCCCC);
    }
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}