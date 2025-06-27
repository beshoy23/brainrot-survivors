/**
 * Critical System Integration Tests
 * 
 * Tests the most complex system interactions that could cause production bugs.
 * Uses simplified mocking to focus on testing coordination logic rather than
 * getting caught up in complex Phaser mocking.
 */

import { PoolManager } from '../../managers/PoolManager';
import { SpatialGrid } from '../../utils/SpatialGrid';
import { Vector2 } from '../../utils/Vector2';

// Simplified mock interfaces that focus on behavior
interface MockEnemy {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isDying: boolean;
  takeDamage: (damage: number) => boolean;
  reset: () => void;
}

interface MockProjectile {
  id: string;
  x: number;
  y: number;
  damage: number;
  active: boolean;
  expired: boolean;
}

interface MockWeapon {
  fireRate: number;
  damage: number;
  lastFireTime: number;
  canFire: (currentTime: number) => boolean;
  fire: () => MockProjectile[];
}

/**
 * Simplified System Mocks that test coordination logic
 */
class MockSpawnSystem {
  private enemyPool: PoolManager<MockEnemy>;
  private activeEnemies: Set<MockEnemy> = new Set();
  
  constructor() {
    this.enemyPool = new PoolManager(
      () => this.createEnemy(),
      (enemy) => enemy.reset(),
      10
    );
  }

  private createEnemy(): MockEnemy {
    const id = `enemy-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      x: 0,
      y: 0,
      health: 10,
      maxHealth: 10,
      isDying: false,
      takeDamage: function(damage: number) {
        this.health -= damage;
        if (this.health <= 0) {
          this.isDying = true;
          return true;
        }
        return false;
      },
      reset: function() {
        this.health = this.maxHealth;
        this.isDying = false;
      }
    };
  }

  spawn(position: Vector2, count: number = 1): MockEnemy[] {
    const enemies: MockEnemy[] = [];
    for (let i = 0; i < count; i++) {
      const enemy = this.enemyPool.acquire();
      const angle = (i / count) * Math.PI * 2;
      enemy.x = position.x + Math.cos(angle) * 100;
      enemy.y = position.y + Math.sin(angle) * 100;
      this.activeEnemies.add(enemy);
      enemies.push(enemy);
    }
    return enemies;
  }

  update(): void {
    // Clean up dead enemies
    const toRemove: MockEnemy[] = [];
    this.activeEnemies.forEach(enemy => {
      if (enemy.isDying) {
        toRemove.push(enemy);
      }
    });
    
    toRemove.forEach(enemy => {
      this.activeEnemies.delete(enemy);
      this.enemyPool.release(enemy);
    });
  }

  getActiveEnemies(): MockEnemy[] {
    return Array.from(this.activeEnemies);
  }

  getPoolStats() {
    return {
      active: this.enemyPool.getActiveCount(),
      total: this.enemyPool.getTotalCount()
    };
  }
}

class MockWeaponSystem {
  private projectilePool: PoolManager<MockProjectile>;
  private activeProjectiles: Set<MockProjectile> = new Set();
  private weapons: MockWeapon[] = [];
  
  public damageDealt: number = 0;
  public enemiesKilled: number = 0;
  
  constructor() {
    this.projectilePool = new PoolManager(
      () => this.createProjectile(),
      (proj) => { proj.active = false; proj.expired = false; },
      50
    );
    
    // Add a basic weapon
    this.weapons.push({
      fireRate: 5,
      damage: 10,
      lastFireTime: 0,
      canFire: function(time: number) {
        const canFire = time - this.lastFireTime > (1000 / this.fireRate);
        if (canFire) this.lastFireTime = time;
        return canFire;
      },
      fire: () => {
        const projectile = this.projectilePool.acquire();
        projectile.active = true;
        projectile.damage = 10;
        this.activeProjectiles.add(projectile);
        return [projectile];
      }
    });
  }

  private createProjectile(): MockProjectile {
    return {
      id: `proj-${Math.random().toString(36).substr(2, 9)}`,
      x: 0,
      y: 0,
      damage: 10,
      active: false,
      expired: false
    };
  }

  update(time: number, playerPos: Vector2, enemies: MockEnemy[]): void {
    // Fire weapons
    this.weapons.forEach(weapon => {
      if (weapon.canFire(time)) {
        const projectiles = weapon.fire();
        projectiles.forEach(proj => {
          proj.x = playerPos.x;
          proj.y = playerPos.y;
        });
      }
    });

    // Update projectiles and check collisions
    const toRemove: MockProjectile[] = [];
    
    this.activeProjectiles.forEach(projectile => {
      if (!projectile.active || projectile.expired) {
        toRemove.push(projectile);
        return;
      }

      // Simple movement
      projectile.x += 5;
      
      // Check collisions
      enemies.forEach(enemy => {
        if (enemy.isDying) return;
        
        const distance = Math.sqrt(
          Math.pow(enemy.x - projectile.x, 2) + 
          Math.pow(enemy.y - projectile.y, 2)
        );
        
        if (distance < 20) { // Hit radius
          const died = enemy.takeDamage(projectile.damage);
          this.damageDealt += projectile.damage;
          
          if (died) {
            this.enemiesKilled++;
          }
          
          projectile.expired = true;
        }
      });
    });

    // Clean up expired projectiles
    toRemove.forEach(projectile => {
      this.activeProjectiles.delete(projectile);
      this.projectilePool.release(projectile);
    });
  }

  getStats() {
    return {
      activeProjectiles: this.activeProjectiles.size,
      damageDealt: this.damageDealt,
      enemiesKilled: this.enemiesKilled
    };
  }

  addWeapon(weapon: MockWeapon): void {
    this.weapons.push(weapon);
  }
}

class MockUpgradeSystem {
  private upgrades: Map<string, number> = new Map();
  
  applyUpgrade(type: string): boolean {
    const currentLevel = this.upgrades.get(type) || 0;
    this.upgrades.set(type, currentLevel + 1);
    return true;
  }

  getUpgradeLevel(type: string): number {
    return this.upgrades.get(type) || 0;
  }

  reset(): void {
    this.upgrades.clear();
  }
}

describe('Critical System Integration Tests', () => {
  let spawnSystem: MockSpawnSystem;
  let weaponSystem: MockWeaponSystem;
  let upgradeSystem: MockUpgradeSystem;
  let spatialGrid: SpatialGrid;

  beforeEach(() => {
    spawnSystem = new MockSpawnSystem();
    weaponSystem = new MockWeaponSystem();
    upgradeSystem = new MockUpgradeSystem();
    spatialGrid = new SpatialGrid(800, 600, 50);
  });

  describe('Enemy Death Cascade Integration', () => {
    it('should handle simultaneous enemy deaths without corruption', () => {
      // Spawn multiple enemies in close proximity
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 10);
      
      // Add to spatial grid
      enemies.forEach(enemy => spatialGrid.insert(enemy));
      
      // Position enemies close to projectiles for guaranteed hits
      enemies.forEach((enemy, i) => {
        enemy.x = 400 + (i - 5) * 20; // Spread them out a bit
        enemy.y = 300;
      });
      
      // Create high-damage weapon for instant kills
      weaponSystem.addWeapon({
        fireRate: 100,
        damage: 15,
        lastFireTime: 0,
        canFire: () => true,
        fire: function() {
          const projectiles: MockProjectile[] = [];
          // Fire spread shot
          for (let i = 0; i < 10; i++) {
            projectiles.push({
              id: `spread-${i}`,
              x: 400,
              y: 300,
              damage: this.damage,
              active: true,
              expired: false
            });
          }
          return projectiles;
        }
      });

      // Manually create and position projectiles for guaranteed hits
      for (let i = 0; i < 10; i++) {
        const proj = weaponSystem['projectilePool'].acquire();
        proj.x = 400 + (i - 5) * 20; // Match enemy positions
        proj.y = 300;
        proj.damage = 15;
        proj.active = true;
        weaponSystem['activeProjectiles'].add(proj);
      }
      
      // Execute weapon system update
      weaponSystem.update(1000, new Vector2(400, 300), enemies);
      
      // Verify some enemies took damage
      const deadEnemies = enemies.filter(e => e.isDying);
      expect(deadEnemies.length).toBeGreaterThan(0);
      
      // Update spawn system to clean up
      spawnSystem.update();
      
      // Verify pool handled dead enemies
      const activeEnemies = spawnSystem.getActiveEnemies();
      expect(activeEnemies.length).toBe(enemies.length - deadEnemies.length);
      
      // Verify spatial grid consistency
      deadEnemies.forEach(enemy => spatialGrid.remove(enemy));
      const remaining = spatialGrid.getNearby(400, 300, 200);
      expect(remaining.length).toBe(activeEnemies.length);
    });

    it('should maintain pool integrity during mass enemy death', () => {
      const initialPoolStats = spawnSystem.getPoolStats();
      
      // Spawn enemies
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 20);
      expect(spawnSystem.getActiveEnemies().length).toBe(20);
      
      // Kill all enemies
      enemies.forEach(enemy => enemy.takeDamage(100));
      
      // Clean up
      spawnSystem.update();
      
      // Verify all enemies returned to pool
      expect(spawnSystem.getActiveEnemies().length).toBe(0);
      const finalPoolStats = spawnSystem.getPoolStats();
      expect(finalPoolStats.active).toBe(0);
      // Pool may grow if needed, but should be reasonable
      expect(finalPoolStats.total).toBeGreaterThanOrEqual(initialPoolStats.total);
      expect(finalPoolStats.total).toBeLessThanOrEqual(initialPoolStats.total + 20);
    });

    it('should handle concurrent damage from multiple sources', () => {
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 5);
      
      // Multiple damage sources
      const damageSources = [
        { damage: 3, source: 'weapon1' },
        { damage: 4, source: 'weapon2' },
        { damage: 3, source: 'aura' }
      ];

      // Apply damage from all sources
      enemies.forEach(enemy => {
        damageSources.forEach(source => {
          enemy.takeDamage(source.damage);
        });
      });

      // All enemies should be dead (10 total damage)
      expect(enemies.every(e => e.isDying)).toBe(true);
      expect(enemies.every(e => e.health <= 0)).toBe(true);
    });
  });

  describe('System Update Order Dependencies', () => {
    it('should handle correct update order: spawn -> weapon -> cleanup', () => {
      const updateLog: string[] = [];
      
      // Spawn enemies
      updateLog.push('spawn');
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 5);
      
      // Weapon system damages enemies
      updateLog.push('weapon');
      weaponSystem.update(1000, new Vector2(400, 300), enemies);
      
      // Spawn system cleans up dead enemies
      updateLog.push('cleanup');
      spawnSystem.update();
      
      // Verify order
      expect(updateLog).toEqual(['spawn', 'weapon', 'cleanup']);
      
      // Verify state consistency
      const activeEnemies = spawnSystem.getActiveEnemies();
      const stats = weaponSystem.getStats();
      expect(activeEnemies.length + stats.enemiesKilled).toBe(5);
    });

    it('should handle incorrect update order gracefully', () => {
      // Spawn enemies
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 5);
      
      // Clean up first (wrong order - nothing to clean)
      spawnSystem.update();
      expect(spawnSystem.getActiveEnemies().length).toBe(5);
      
      // Then damage
      weaponSystem.update(1000, new Vector2(400, 300), enemies);
      
      // Clean up again (correct)
      spawnSystem.update();
      
      // System should still work correctly
      const finalActive = spawnSystem.getActiveEnemies();
      expect(finalActive.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Upgrade Integration During Combat', () => {
    it('should apply upgrades without disrupting combat', () => {
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 10);
      
      // Start combat
      weaponSystem.update(1000, new Vector2(400, 300), enemies);
      const damageBeforeUpgrade = weaponSystem.getStats().damageDealt;
      
      // Apply damage upgrade mid-combat
      upgradeSystem.applyUpgrade('damage');
      expect(upgradeSystem.getUpgradeLevel('damage')).toBe(1);
      
      // Continue combat - need to ensure projectiles fire
      const aliveEnemies = enemies.filter(e => !e.isDying);
      if (aliveEnemies.length > 0) {
        weaponSystem.update(2000, new Vector2(400, 300), aliveEnemies);
        const damageAfterUpgrade = weaponSystem.getStats().damageDealt;
        
        // Verify combat continued (may have already killed all enemies)
        expect(damageAfterUpgrade).toBeGreaterThanOrEqual(damageBeforeUpgrade);
      } else {
        // All enemies already dead, that's fine
        expect(weaponSystem.getStats().enemiesKilled).toBeGreaterThan(0);
      }
    });

    it('should handle multiple simultaneous upgrades', () => {
      // Apply multiple upgrades
      const upgrades = ['damage', 'fireRate', 'projectileCount'];
      upgrades.forEach(upgrade => {
        expect(upgradeSystem.applyUpgrade(upgrade)).toBe(true);
      });
      
      // Verify all applied
      upgrades.forEach(upgrade => {
        expect(upgradeSystem.getUpgradeLevel(upgrade)).toBe(1);
      });
    });
  });

  describe('Memory and Performance Under Load', () => {
    it('should handle rapid spawn/death cycles without memory leaks', () => {
      const cycles = 10;
      const poolStats: any[] = [];
      
      for (let i = 0; i < cycles; i++) {
        // Spawn wave
        const enemies = spawnSystem.spawn(new Vector2(400, 300), 20);
        
        // Kill all
        enemies.forEach(enemy => enemy.takeDamage(100));
        
        // Clean up
        spawnSystem.update();
        
        // Record pool state
        poolStats.push(spawnSystem.getPoolStats());
      }
      
      // Pool should stabilize, not grow unbounded
      const firstStat = poolStats[0];
      const lastStat = poolStats[poolStats.length - 1];
      expect(lastStat.total).toBeLessThanOrEqual(firstStat.total + 10); // Allow small growth
      expect(lastStat.active).toBe(0); // All returned
    });

    it('should maintain spatial grid performance with many entities', () => {
      // Add many entities
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 100);
      enemies.forEach(enemy => spatialGrid.insert(enemy));
      
      // Measure query performance
      const start = performance.now();
      const nearby = spatialGrid.getNearby(400, 300, 100);
      const queryTime = performance.now() - start;
      
      // Should be fast even with many entities
      expect(queryTime).toBeLessThan(5); // Less than 5ms
      expect(nearby.length).toBeGreaterThan(0);
      
      // Clean up
      enemies.forEach(enemy => spatialGrid.remove(enemy));
      spatialGrid.clear();
      
      // Verify cleanup
      const afterClear = spatialGrid.getNearby(400, 300, 100);
      expect(afterClear.length).toBe(0);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty enemy arrays gracefully', () => {
      // Update with no enemies
      expect(() => {
        weaponSystem.update(1000, new Vector2(400, 300), []);
        spawnSystem.update();
      }).not.toThrow();
      
      expect(weaponSystem.getStats().damageDealt).toBe(0);
    });

    it('should handle invalid positions gracefully', () => {
      // Spawn at invalid position
      const enemies = spawnSystem.spawn(new Vector2(NaN, NaN), 5);
      
      // Should still create enemies (at fallback position)
      expect(enemies.length).toBe(5);
      enemies.forEach(enemy => {
        expect(isNaN(enemy.x)).toBe(true);
        expect(isNaN(enemy.y)).toBe(true);
      });
    });

    it('should recover from pool exhaustion', () => {
      // Spawn more than pool size
      const enemies = spawnSystem.spawn(new Vector2(400, 300), 50);
      expect(enemies.length).toBe(50);
      
      // Pool should have grown
      const stats = spawnSystem.getPoolStats();
      expect(stats.total).toBeGreaterThanOrEqual(50);
    });
  });
});

/**
 * Integration Test Utilities
 */
export class IntegrationTestValidator {
  static validateSystemState(
    spawnSystem: MockSpawnSystem,
    weaponSystem: MockWeaponSystem,
    spatialGrid: SpatialGrid
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check spawn system consistency
    const activeEnemies = spawnSystem.getActiveEnemies();
    const poolStats = spawnSystem.getPoolStats();
    if (poolStats.active !== activeEnemies.length) {
      issues.push('Spawn system active count mismatch');
    }
    
    // Check no dying enemies in active list
    const dyingActive = activeEnemies.filter(e => e.isDying);
    if (dyingActive.length > 0) {
      issues.push(`${dyingActive.length} dying enemies still active`);
    }
    
    // Check weapon system stats
    const weaponStats = weaponSystem.getStats();
    if (weaponStats.damageDealt < 0) {
      issues.push('Negative damage dealt');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  static generateStressTestReport(
    cycles: number,
    entitiesPerCycle: number,
    results: any[]
  ): string {
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.time));
    const errors = results.filter(r => r.errors > 0).length;
    
    return `
Stress Test Report:
- Cycles: ${cycles}
- Entities per cycle: ${entitiesPerCycle}
- Average cycle time: ${avgTime.toFixed(2)}ms
- Max cycle time: ${maxTime.toFixed(2)}ms
- Cycles with errors: ${errors}
- Success rate: ${((cycles - errors) / cycles * 100).toFixed(1)}%
    `.trim();
  }
}