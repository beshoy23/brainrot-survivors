import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Weapon } from '../entities/Weapon';
import { Projectile } from '../entities/Projectile';
import { PoolManager } from '../managers/PoolManager';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { MultiShotBehavior } from '../weapons/behaviors/MultiShotBehavior';
import { VSMultiShotBehavior } from '../weapons/behaviors/VSMultiShotBehavior';
import { Vector2 } from '../utils/Vector2';

export interface EnemyDeathCallback {
  (x: number, y: number): void;
}

export interface DamageDealtCallback {
  (damage: number): void;
}

export class WeaponSystem {
  private weapons: Weapon[] = [];
  private projectilePool: PoolManager<Projectile>;
  private activeProjectiles: Set<Projectile> = new Set();
  public onEnemyDeath?: EnemyDeathCallback;
  public onDamageDealt?: DamageDealtCallback;

  constructor(private scene: Scene) {
    // Initialize projectile pool
    this.projectilePool = new PoolManager(
      () => new Projectile(scene),
      (projectile) => projectile.reset(),
      100 // Increased for multi-shot
    );
    
    // Create starter weapon
    this.addWeapon(WeaponFactory.createStarterWeapon());
  }

  addWeapon(weapon: Weapon): void {
    this.weapons.push(weapon);
  }
  
  updateWeaponsForUpgrades(): void {
    // Update multi-shot behavior if needed
    const upgradeManager = (window as any).upgradeManager;
    const multiShotLevel = upgradeManager ? 
      upgradeManager.getUpgradeLevel('projectileCount') : 0;
    
    this.weapons.forEach(weapon => {
      if (weapon.behavior instanceof VSMultiShotBehavior) {
        weapon.behavior.setAdditionalShots(multiShotLevel);
      } else if (weapon.behavior instanceof MultiShotBehavior) {
        weapon.behavior.setAdditionalShots(multiShotLevel);
      } else if (multiShotLevel > 0 && this.weapons.length === 1) {
        // Replace basic weapon with VS-style multi-shot
        this.weapons[0] = WeaponFactory.createStarterWeapon();
      }
    });
  }

  update(deltaTime: number, currentTime: number, player: Player, enemies: Enemy[]): void {
    // Update all active projectiles
    const projectilesToRemove: Projectile[] = [];
    
    this.activeProjectiles.forEach(projectile => {
      const expired = projectile.update(deltaTime);
      
      if (expired || !projectile.sprite.active) {
        projectilesToRemove.push(projectile);
      } else {
        // Check collision with enemies
        enemies.forEach(enemy => {
          if (!enemy.sprite.active) return;
          
          const dx = projectile.x - enemy.x;
          const dy = projectile.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 15) { // Hit radius
            const isDead = enemy.takeDamage(projectile.damage);
            
            // VS-style damage number popup
            this.createDamageNumber(enemy.x, enemy.y, projectile.damage);
            
            // Track damage dealt
            if (this.onDamageDealt) {
              this.onDamageDealt(projectile.damage);
            }
            
            if (isDead) {
              // Enemy died - notify callback
              if (this.onEnemyDeath) {
                this.onEnemyDeath(enemy.x, enemy.y);
              }
            } else {
              // Flash red on hit (Graphics objects use fillStyle, not tint)
              if (enemy.sprite instanceof Phaser.GameObjects.Graphics) {
                // Redraw with tint effect
                const originalColor = enemy.enemyType.color;
                enemy.sprite.clear();
                enemy.sprite.fillStyle(0xff6666, 1);
                enemy.drawEnemy();
                
                this.scene.time.delayedCall(100, () => {
                  if (enemy.sprite.active) {
                    enemy.sprite.clear();
                    enemy.sprite.fillStyle(originalColor, 1);
                    enemy.drawEnemy();
                  }
                });
              }
            }
            
            projectilesToRemove.push(projectile);
          }
        });
      }
    });
    
    // Remove expired projectiles
    projectilesToRemove.forEach(projectile => {
      this.activeProjectiles.delete(projectile);
      this.projectilePool.release(projectile);
    });
    
    // Fire weapons using their behaviors
    const playerPos = player.getPosition();
    
    this.weapons.forEach(weapon => {
      if (!weapon.canFire(currentTime)) return;
      
      // Use weapon behavior to determine projectiles
      const projectileFires = weapon.behavior.fire(
        playerPos,
        enemies,
        this.projectilePool,
        weapon.getDamage(),
        weapon.range,
        player
      );
      
      // Fire each projectile
      projectileFires.forEach(({ projectile, startX, startY, targetX, targetY, speed, visuals, followTarget, liveTarget }) => {
        projectile.fire(
          startX ?? playerPos.x, // Use custom start or player position
          startY ?? playerPos.y,
          targetX,
          targetY,
          weapon.getDamage(),
          visuals,
          speed ?? weapon.projectileSpeed, // Use custom speed or weapon's speed
          followTarget,
          liveTarget
        );
        
        this.activeProjectiles.add(projectile);
      });
      
      if (projectileFires.length > 0) {
        weapon.updateFireTime(currentTime);
      }
    });
  }

  reset(): void {
    this.activeProjectiles.forEach(projectile => {
      this.projectilePool.release(projectile);
    });
    this.activeProjectiles.clear();
  }
  
  private createDamageNumber(x: number, y: number, damage: number, isCritical: boolean = false): void {
    // VS-style damage number popup
    const fontSize = isCritical ? '20px' : '16px';
    const color = isCritical ? '#ff3333' : '#ffff00'; // Red for crits, yellow for normal
    
    const damageText = this.scene.add.text(x, y - 10, Math.round(damage).toString(), {
      fontSize: fontSize,
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold'
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(100); // High depth to appear above everything
    
    // Random slight offset for multiple hits
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 10;
    
    // VS-style animation: float up and fade out
    const targetY = isCritical ? y - 50 + offsetY : y - 40 + offsetY;
    const targetScale = isCritical ? 1.5 : 1.2;
    
    this.scene.tweens.add({
      targets: damageText,
      x: x + offsetX,
      y: targetY,
      alpha: 0,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 700,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
    
    // Add extra pop effect for criticals
    if (isCritical) {
      damageText.setScale(1.5);
      this.scene.tweens.add({
        targets: damageText,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.out'
      });
    }
  }
}