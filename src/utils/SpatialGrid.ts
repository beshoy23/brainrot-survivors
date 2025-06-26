export interface GridEntity {
  x: number;
  y: number;
  id: string;
  // Optional radius for entities that span multiple cells
  radius?: number;
}

export class SpatialGrid<T extends GridEntity> {
  private grid: Map<string, Set<T>> = new Map();
  private entityCells: Map<string, Set<string>> = new Map();

  constructor(
    private cellSize: number,
    private width: number,
    private height: number
  ) {}

  insert(entity: T): void {
    const cells = this.getCellsForEntity(entity);
    
    // Track which cells this entity is in
    this.entityCells.set(entity.id, new Set(cells));
    
    // Add entity to each cell
    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(entity);
    }
  }

  remove(entity: T): void {
    const cells = this.entityCells.get(entity.id);
    if (!cells) return;
    
    // Remove from all cells and clean up empty Sets
    for (const cell of cells) {
      const cellSet = this.grid.get(cell);
      if (cellSet) {
        cellSet.delete(entity);
        // Clean up empty Sets to prevent memory leak
        if (cellSet.size === 0) {
          this.grid.delete(cell);
        }
      }
    }
    
    this.entityCells.delete(entity.id);
  }

  update(entity: T): void {
    // Store current position to ensure consistency
    const currentX = entity.x;
    const currentY = entity.y;
    const currentRadius = entity.radius;
    
    // Remove from old position
    this.remove(entity);
    
    // Create a temporary entity snapshot to prevent position changes during insert
    const snapshot = {
      ...entity,
      x: currentX,
      y: currentY,
      radius: currentRadius
    };
    
    // Insert using the snapshot position
    this.insert(snapshot as T);
  }

  getNearby(x: number, y: number, radius: number): T[] {
    const nearby = new Set<T>();
    const cells = this.getCellsInRadius(x, y, radius);
    
    for (const cell of cells) {
      const entities = this.grid.get(cell);
      if (entities) {
        entities.forEach(e => nearby.add(e));
      }
    }
    
    return Array.from(nearby);
  }

  clear(): void {
    this.grid.clear();
    this.entityCells.clear();
  }

  private getCellsForEntity(entity: T): string[] {
    // If entity has a radius, it may span multiple cells
    const radius = entity.radius || 0;
    
    if (radius === 0) {
      // Point entity - single cell
      const x = Math.floor(entity.x / this.cellSize);
      const y = Math.floor(entity.y / this.cellSize);
      return [this.getCellKey(x, y)];
    }
    
    // Entity with radius - calculate all cells it overlaps
    const cells: string[] = [];
    const minX = Math.floor((entity.x - radius) / this.cellSize);
    const maxX = Math.floor((entity.x + radius) / this.cellSize);
    const minY = Math.floor((entity.y - radius) / this.cellSize);
    const maxY = Math.floor((entity.y + radius) / this.cellSize);
    
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        cells.push(this.getCellKey(cx, cy));
      }
    }
    
    return cells;
  }

  private getCellsInRadius(x: number, y: number, radius: number): string[] {
    const cells: string[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        cells.push(this.getCellKey(cx, cy));
      }
    }
    
    return cells;
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}