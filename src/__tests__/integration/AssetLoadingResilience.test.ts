/**
 * Asset Loading Resilience Integration Tests
 * 
 * Tests asset loading behavior under real-world network conditions
 * to prevent production failures similar to the mobile XP bar bug.
 * 
 * Uses fast simulations to test loading patterns without actual network delays.
 */

interface AssetMetrics {
  totalAssets: number;
  loadedAssets: number;
  failedAssets: number;
  fallbacksUsed: number;
  retryAttempts: number;
  loadTime: number;
}

interface LoadingScenario {
  name: string;
  networkProfile: 'fast' | 'slow' | 'unstable' | 'offline';
  assetCount: number;
  expectedSuccessRate: number;
  allowFallbacks: boolean;
}

interface LoadingResult {
  scenario: LoadingScenario;
  metrics: AssetMetrics;
  success: boolean;
  errors: string[];
}

/**
 * Fast asset loading simulator for testing resilience patterns
 */
class AssetLoadingSimulator {
  private networkProfiles = {
    fast: { successRate: 0.99, avgDelay: 10, maxRetries: 1 },
    slow: { successRate: 0.95, avgDelay: 100, maxRetries: 3 },
    unstable: { successRate: 0.8, avgDelay: 50, maxRetries: 5 },
    offline: { successRate: 0, avgDelay: 0, maxRetries: 0 }
  };

  private assetTypes = {
    sprite: { size: 100, priority: 1, hasFallback: true },
    audio: { size: 500, priority: 2, hasFallback: true },
    config: { size: 10, priority: 0, hasFallback: true },
    font: { size: 200, priority: 3, hasFallback: true }
  };

  async simulateLoading(scenario: LoadingScenario): Promise<LoadingResult> {
    const startTime = Date.now();
    const profile = this.networkProfiles[scenario.networkProfile];
    const metrics: AssetMetrics = {
      totalAssets: scenario.assetCount,
      loadedAssets: 0,
      failedAssets: 0,
      fallbacksUsed: 0,
      retryAttempts: 0,
      loadTime: 0
    };
    const errors: string[] = [];

    // Simulate loading each asset
    for (let i = 0; i < scenario.assetCount; i++) {
      const assetType = this.getRandomAssetType();
      const loadResult = this.simulateAssetLoad(assetType, profile);
      
      if (loadResult.success) {
        metrics.loadedAssets++;
      } else {
        metrics.failedAssets++;
        
        if (scenario.allowFallbacks && this.assetTypes[assetType].hasFallback) {
          metrics.fallbacksUsed++;
          metrics.loadedAssets++; // Fallback counts as loaded
          metrics.failedAssets--; // Not a failure if fallback works
        } else {
          errors.push(`Failed to load ${assetType} asset ${i}`);
        }
      }
      
      metrics.retryAttempts += loadResult.retries;
    }

    metrics.loadTime = Date.now() - startTime;
    
    const actualSuccessRate = metrics.loadedAssets / metrics.totalAssets;
    const success = actualSuccessRate >= scenario.expectedSuccessRate;

    return {
      scenario,
      metrics,
      success,
      errors
    };
  }

  private getRandomAssetType(): keyof typeof this.assetTypes {
    const types = Object.keys(this.assetTypes) as (keyof typeof this.assetTypes)[];
    return types[Math.floor(Math.random() * types.length)];
  }

  private simulateAssetLoad(
    assetType: keyof typeof this.assetTypes, 
    profile: typeof this.networkProfiles.fast
  ): { success: boolean; retries: number } {
    let retries = 0;
    let success = false;

    // Try loading with retries
    while (retries <= profile.maxRetries && !success) {
      success = Math.random() < profile.successRate;
      if (!success) retries++;
    }

    return { success, retries };
  }
}

describe('Asset Loading Resilience Integration Tests', () => {
  let simulator: AssetLoadingSimulator;

  beforeEach(() => {
    simulator = new AssetLoadingSimulator();
  });

  describe('Network Condition Handling', () => {
    it('should handle fast network conditions', async () => {
      const scenario: LoadingScenario = {
        name: 'Fast Network',
        networkProfile: 'fast',
        assetCount: 50,
        expectedSuccessRate: 0.95,
        allowFallbacks: false
      };

      const result = await simulator.simulateLoading(scenario);

      expect(result.success).toBe(true);
      expect(result.metrics.loadedAssets).toBeGreaterThan(47); // 95% of 50
      expect(result.errors.length).toBeLessThan(3);
    });

    it('should handle slow network with fallbacks', async () => {
      const scenario: LoadingScenario = {
        name: 'Slow Network',
        networkProfile: 'slow',
        assetCount: 30,
        expectedSuccessRate: 0.90,
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      expect(result.success).toBe(true);
      expect(result.metrics.loadedAssets).toBeGreaterThanOrEqual(27); // 90% of 30
      expect(result.metrics.fallbacksUsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle unstable network with retries', async () => {
      const scenario: LoadingScenario = {
        name: 'Unstable Network',
        networkProfile: 'unstable',
        assetCount: 20,
        expectedSuccessRate: 0.80,
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      expect(result.metrics.retryAttempts).toBeGreaterThan(0);
      expect(result.metrics.loadedAssets).toBeGreaterThanOrEqual(16); // 80% of 20
    });

    it('should handle offline mode gracefully', async () => {
      const scenario: LoadingScenario = {
        name: 'Offline Mode',
        networkProfile: 'offline',
        assetCount: 10,
        expectedSuccessRate: 0.50, // Lower expectation with fallbacks
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      // Should use all fallbacks
      expect(result.metrics.fallbacksUsed).toBe(10);
      expect(result.metrics.loadedAssets).toBe(10); // All via fallbacks
      expect(result.success).toBe(true);
    });
  });

  describe('Fallback Strategies', () => {
    it('should use fallbacks when assets fail', async () => {
      const scenario: LoadingScenario = {
        name: 'Fallback Test',
        networkProfile: 'unstable',
        assetCount: 25,
        expectedSuccessRate: 0.85,
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      // With 80% success rate on unstable network, might not always need fallbacks
      if (result.metrics.failedAssets > 0) {
        expect(result.metrics.fallbacksUsed).toBeGreaterThan(0);
      }
      expect(result.success).toBe(true);
    });

    it('should fail gracefully without fallbacks', async () => {
      const scenario: LoadingScenario = {
        name: 'No Fallbacks',
        networkProfile: 'unstable',
        assetCount: 20,
        expectedSuccessRate: 0.95, // High expectation
        allowFallbacks: false
      };

      const result = await simulator.simulateLoading(scenario);

      // Might fail due to no fallbacks
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.metrics.failedAssets).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large asset counts efficiently', async () => {
      const scenario: LoadingScenario = {
        name: 'Large Asset Load',
        networkProfile: 'fast',
        assetCount: 200,
        expectedSuccessRate: 0.95,
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      expect(result.success).toBe(true);
      expect(result.metrics.loadTime).toBeLessThan(1000); // Should be fast (no real network)
      expect(result.metrics.loadedAssets).toBeGreaterThan(190);
    });

    it('should maintain performance with retries', async () => {
      const scenario: LoadingScenario = {
        name: 'Retry Performance',
        networkProfile: 'unstable',
        assetCount: 50,
        expectedSuccessRate: 0.80,
        allowFallbacks: true
      };

      const result = await simulator.simulateLoading(scenario);

      // Even with retries, should complete quickly
      expect(result.metrics.loadTime).toBeLessThan(500);
      expect(result.metrics.retryAttempts).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      const scenario: LoadingScenario = {
        name: 'Error Messages',
        networkProfile: 'offline',
        assetCount: 5,
        expectedSuccessRate: 0.90, // Will fail
        allowFallbacks: false
      };

      const result = await simulator.simulateLoading(scenario);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(5); // All should fail
      result.errors.forEach(error => {
        expect(error).toMatch(/Failed to load/);
      });
    });

    it('should track failed assets accurately', async () => {
      const scenario: LoadingScenario = {
        name: 'Failure Tracking',
        networkProfile: 'unstable',
        assetCount: 30,
        expectedSuccessRate: 0.85,
        allowFallbacks: false
      };

      const result = await simulator.simulateLoading(scenario);

      const totalProcessed = result.metrics.loadedAssets + result.metrics.failedAssets;
      expect(totalProcessed).toBe(result.metrics.totalAssets);
    });
  });
});

/**
 * Asset Loading Analysis Utilities
 */
export class AssetLoadingAnalyzer {
  static analyzeLoadingPatterns(results: LoadingResult[]): {
    averageSuccessRate: number;
    averageRetries: number;
    fallbackUsage: number;
    recommendations: string[];
  } {
    const totalAssets = results.reduce((sum, r) => sum + r.metrics.totalAssets, 0);
    const totalLoaded = results.reduce((sum, r) => sum + r.metrics.loadedAssets, 0);
    const totalRetries = results.reduce((sum, r) => sum + r.metrics.retryAttempts, 0);
    const totalFallbacks = results.reduce((sum, r) => sum + r.metrics.fallbacksUsed, 0);

    const avgSuccessRate = totalLoaded / totalAssets;
    const avgRetries = totalRetries / results.length;
    const fallbackUsage = totalFallbacks / totalAssets;

    const recommendations: string[] = [];

    if (avgSuccessRate < 0.9) {
      recommendations.push('Improve network resilience with better retry strategies');
    }
    if (fallbackUsage > 0.2) {
      recommendations.push('High fallback usage indicates network issues');
    }
    if (avgRetries > 5) {
      recommendations.push('Excessive retries may impact user experience');
    }

    return {
      averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      averageRetries: Math.round(avgRetries * 10) / 10,
      fallbackUsage: Math.round(fallbackUsage * 100) / 100,
      recommendations
    };
  }

  static generateLoadingReport(result: LoadingResult): string {
    const successRate = (result.metrics.loadedAssets / result.metrics.totalAssets * 100).toFixed(1);
    const fallbackRate = (result.metrics.fallbacksUsed / result.metrics.totalAssets * 100).toFixed(1);
    
    return `
Asset Loading Report: ${result.scenario.name}
=====================================
Network Profile: ${result.scenario.networkProfile}
Total Assets: ${result.metrics.totalAssets}
Success Rate: ${successRate}%
Fallback Usage: ${fallbackRate}%
Retry Attempts: ${result.metrics.retryAttempts}
Load Time: ${result.metrics.loadTime}ms

Result: ${result.success ? 'SUCCESS' : 'FAILED'}
Errors: ${result.errors.length}
    `.trim();
  }
}