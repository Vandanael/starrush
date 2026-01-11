/**
 * Particle Pool for Zero-Allocation Effects
 * 
 * Pre-allocates PIXI.Graphics particles and reuses them for effects.
 * This eliminates allocations during particle explosions.
 */
import * as PIXI from 'pixi.js';

export class ParticlePool {
  private pool: PIXI.Graphics[] = [];
  private active: boolean[] = [];
  
  constructor(size: number = 100) {
    
    // Pre-allocate particles
    for (let i = 0; i < size; i++) {
      const particle = new PIXI.Graphics();
      particle.visible = false;
      this.pool.push(particle);
      this.active.push(false);
    }
  }
  
  /**
   * Acquire an inactive particle from the pool
   */
  acquire(): PIXI.Graphics | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.active[i]) {
        this.active[i] = true;
        const particle = this.pool[i];
        particle.visible = true;
        particle.alpha = 1.0;
        particle.clear();
        return particle;
      }
    }
    
    // Pool exhausted - return null (should not happen in normal gameplay)
    return null;
  }
  
  /**
   * Release a particle back to the pool
   */
  release(particle: PIXI.Graphics): void {
    const index = this.pool.indexOf(particle);
    if (index === -1) return;
    
    if (!this.active[index]) return;
    
    // Reset particle
    particle.visible = false;
    particle.alpha = 0;
    particle.clear();
    
    // Remove from parent if attached
    if (particle.parent) {
      particle.parent.removeChild(particle);
    }
    
    this.active[index] = false;
  }
  
  /**
   * Clear all active particles
   */
  clear(): void {
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i]) {
        const particle = this.pool[i];
        particle.visible = false;
        particle.alpha = 0;
        particle.clear();
        if (particle.parent) {
          particle.parent.removeChild(particle);
        }
        this.active[i] = false;
      }
    }
  }
  
  getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i]) count++;
    }
    return count;
  }
}
