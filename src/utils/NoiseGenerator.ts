// Simple 2D noise generator for terrain generation
// Based on simplex noise principles but simplified for our needs

export class NoiseGenerator {
  private perm: number[] = [];
  private gradients: { x: number; y: number }[] = [];
  
  constructor(seed: number = Math.random() * 1000) {
    // Initialize permutation table
    this.initPermutationTable(seed);
    
    // Pre-calculate gradients
    this.initGradients();
  }
  
  private initPermutationTable(seed: number): void {
    // Create a pseudo-random permutation table
    const rng = this.mulberry32(seed);
    
    // Fill with values 0-255
    for (let i = 0; i < 256; i++) {
      this.perm[i] = i;
    }
    
    // Shuffle using Fisher-Yates
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
    
    // Duplicate for wrapping
    for (let i = 0; i < 256; i++) {
      this.perm[i + 256] = this.perm[i];
    }
  }
  
  private initGradients(): void {
    // 8 cardinal + diagonal directions
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
    ];
    
    // Normalize and store
    for (const dir of dirs) {
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      this.gradients.push({ x: dir.x / len, y: dir.y / len });
    }
  }
  
  // Simple seeded random number generator
  private mulberry32(seed: number): () => number {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  // Smooth interpolation function
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  // Linear interpolation
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  // Get gradient based on hash
  private getGradient(x: number, y: number): { x: number; y: number } {
    const hash = this.perm[(this.perm[x & 255] + y) & 255];
    return this.gradients[hash & 7];
  }
  
  // Dot product for gradient and distance vector
  private dot(grad: { x: number; y: number }, dx: number, dy: number): number {
    return grad.x * dx + grad.y * dy;
  }
  
  // Main noise function
  noise(x: number, y: number): number {
    // Grid cell coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    // Relative positions within cell
    const dx = x - x0;
    const dy = y - y0;
    
    // Gradient contributions from corners
    const g00 = this.getGradient(x0, y0);
    const g10 = this.getGradient(x1, y0);
    const g01 = this.getGradient(x0, y1);
    const g11 = this.getGradient(x1, y1);
    
    // Dot products
    const n00 = this.dot(g00, dx, dy);
    const n10 = this.dot(g10, dx - 1, dy);
    const n01 = this.dot(g01, dx, dy - 1);
    const n11 = this.dot(g11, dx - 1, dy - 1);
    
    // Interpolate
    const fx = this.fade(dx);
    const fy = this.fade(dy);
    
    const nx0 = this.lerp(n00, n10, fx);
    const nx1 = this.lerp(n01, n11, fx);
    const n = this.lerp(nx0, nx1, fy);
    
    // Return in range [-1, 1]
    return n;
  }
  
  // Octave noise for more interesting patterns
  octaveNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5, scale: number = 0.01): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    // Normalize to [0, 1]
    return (value / maxValue + 1) * 0.5;
  }
}