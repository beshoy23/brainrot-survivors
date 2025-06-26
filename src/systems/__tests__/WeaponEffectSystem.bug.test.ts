import { WeaponEffectSystem } from '../WeaponEffectSystem';
import { Scene } from 'phaser';
import { Player } from '../../entities/Player';
import { Vector2 } from '../../utils/Vector2';

describe('WeaponEffectSystem - Whip Persistence Bug', () => {
  let weaponEffectSystem: WeaponEffectSystem;
  let mockScene: jest.Mocked<Scene>;
  let mockPlayer: jest.Mocked<Player>;
  
  beforeEach(() => {
    // Mock scene
    const mockGraphics = {
      setDepth: jest.fn(),
      clear: jest.fn(),
      lineStyle: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      strokePath: jest.fn(),
      fillStyle: jest.fn(),
      fillCircle: jest.fn(),
      destroy: jest.fn(),
      alpha: 1
    };
    
    mockScene = {
      add: {
        graphics: jest.fn().mockReturnValue(mockGraphics)
      }
    } as any;
    
    // Mock player
    mockPlayer = {
      getPosition: jest.fn().mockReturnValue(new Vector2(100, 100))
    } as any;
    
    weaponEffectSystem = new WeaponEffectSystem(mockScene);
  });
  
  describe('whip slash cleanup', () => {
    it('BUG: multiple whip slashes can accumulate if fired rapidly', () => {
      // Fire multiple whips quickly
      const slashIds = [];
      for (let i = 0; i < 5; i++) {
        slashIds.push(weaponEffectSystem.createWhipSlash(mockPlayer, 1));
      }
      
      // All 5 effects exist
      expect(weaponEffectSystem['effects'].size).toBe(5);
      
      // Update once - none should be removed yet (< 150ms)
      weaponEffectSystem.update(50, mockPlayer);
      expect(weaponEffectSystem['effects'].size).toBe(5);
      
      // Update past lifetime - all should be removed
      weaponEffectSystem.update(200, mockPlayer);
      expect(weaponEffectSystem['effects'].size).toBe(0);
    });

    it('BUG: whip effects persist if update is not called', () => {
      const slashId = weaponEffectSystem.createWhipSlash(mockPlayer, 1);
      
      // Effect created
      expect(weaponEffectSystem['effects'].has(slashId)).toBe(true);
      
      // If update is never called, effect persists forever
      // This simulates game pause or frame skip
      expect(weaponEffectSystem['effects'].size).toBe(1);
      
      // Even after "10 seconds" without update
      // The effect is still there!
    });

    it('BUG: removeEffect during iteration can cause skipped updates', () => {
      // Create multiple effects
      const slashIds = [];
      for (let i = 0; i < 3; i++) {
        slashIds.push(weaponEffectSystem.createWhipSlash(mockPlayer, 1));
      }
      
      // Mock the update to track calls
      let updateCalls = 0;
      weaponEffectSystem['effects'].forEach(effect => {
        const originalUpdate = effect.update;
        effect.update = jest.fn((delta) => {
          updateCalls++;
          originalUpdate(delta, mockPlayer);
        });
      });
      
      // Update with enough time to remove all
      weaponEffectSystem.update(200, mockPlayer);
      
      // Due to forEach + delete, some updates might be skipped
      expect(updateCalls).toBe(3); // All should be called
    });

    it('FIXED: effect IDs no longer collide with rapid firing', () => {
      // Create two whips rapidly
      const id1 = weaponEffectSystem.createWhipSlash(mockPlayer, 1);
      const id2 = weaponEffectSystem.createWhipSlash(mockPlayer, -1);
      
      // IDs should be different now!
      expect(id1).not.toBe(id2);
      expect(id1).toBe('whip_slash_1');
      expect(id2).toBe('whip_slash_2');
      
      // Both effects should exist
      expect(weaponEffectSystem['effects'].size).toBe(2);
    });

    it('POTENTIAL FIX: use incrementing counter for unique IDs', () => {
      // Better approach: use counter
      let effectCounter = 0;
      const createUniqueId = () => `whip_slash_${++effectCounter}`;
      
      const ids = [];
      for (let i = 0; i < 100; i++) {
        ids.push(createUniqueId());
      }
      
      // All IDs are unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });
  });
});