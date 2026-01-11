/**
 * Generic Object Pool for Zero-Allocation Game Loop
 * 
 * Pre-allocates a fixed array of objects and reuses them instead of creating/destroying.
 * This eliminates garbage collection spikes during gameplay.
 * 
 * Usage:
 *   const pool = new ObjectPool<Triangle>(() => new Triangle(...), 200);
 *   const triangle = pool.acquire();
 *   // ... use triangle ...
 *   pool.release(triangle);
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: boolean[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  
  /**
   * @param factory Function that creates a new object instance
   * @param size Initial pool size (will grow if needed, but try to avoid)
   * @param reset Optional function to reset object state when released
   */
  constructor(factory: () => T, size: number = 200, reset?: (obj: T) => void) {
    this.factory = factory;
    this.reset = reset || (() => {});
    
    // Pre-allocate all objects
    for (let i = 0; i < size; i++) {
      this.pool.push(factory());
      this.active.push(false);
    }
  }
  
  /**
   * Acquire an inactive object from the pool
   * Returns null if pool is exhausted (should not happen in normal gameplay)
   */
  acquire(): T | null {
    // Find first inactive object
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.active[i]) {
        this.active[i] = true;
        return this.pool[i];
      }
    }
    
    // Pool exhausted - grow pool (should be rare)
    // In production, this indicates pool size is too small
    const newObj = this.factory();
    this.pool.push(newObj);
    this.active.push(true);
    return newObj;
  }
  
  /**
   * Release an object back to the pool
   * Resets the object state and marks it as inactive
   */
  release(obj: T): void {
    const index = this.pool.indexOf(obj);
    if (index === -1) {
      // Object not from this pool - ignore (defensive)
      return;
    }
    
    if (!this.active[index]) {
      // Already released - ignore (defensive)
      return;
    }
    
    // Reset object state
    this.reset(obj);
    
    // Mark as inactive
    this.active[index] = false;
  }
  
  /**
   * Get count of active objects
   */
  getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i]) count++;
    }
    return count;
  }
  
  /**
   * Get total pool size
   */
  getSize(): number {
    return this.pool.length;
  }
  
  /**
   * Clear all active objects (for game reset)
   */
  clear(): void {
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i]) {
        this.reset(this.pool[i]);
        this.active[i] = false;
      }
    }
  }
}
