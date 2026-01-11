import { Planet } from '../entities/Planet';
import { AnimationHelper } from '../utils/AnimationHelper';
import { ParticlePool } from '../utils/ParticlePool';
import * as PIXI from 'pixi.js';

/**
 * Manages ship production for all owned planets.
 * Generates ships every second based on planet type and production rate.
 * Provides visual feedback with particles when ships are produced.
 */
export class ProductionSystem {
  private planets: Planet[];
  private accumulator: number = 0;
  private app: PIXI.Application | null = null;
  private particlePool: ParticlePool | null = null;
  
  constructor(planets: Planet[], app?: PIXI.Application, particlePool?: ParticlePool | null) {
    this.planets = planets;
    this.app = app || null;
    this.particlePool = particlePool || null;
  }
  
  public setApp(app: PIXI.Application) {
    this.app = app;
  }
  
  public update(delta: number) {
    // Accumuler le temps (delta en frames, 60 frames = 1 sec)
    this.accumulator += delta;
    
    // Chaque seconde (60 frames à 60 FPS)
    if (this.accumulator >= 60) {
      this.accumulator -= 60;
      this.generateShips();
    }
  }
  
  private generateShips() {
    this.planets.forEach(planet => {
      if (planet.owner !== 'neutral') {
        const production = planet.getProduction();
        planet.addShips(production);
        
        // Feedback visuel : petite pulsation si vaisseau produit
        if (production > 0 && this.app) {
          const pos = planet.getPosition();
          // Petite particule qui monte depuis la planète (OPTIMIZATION: Use particle pool)
          AnimationHelper.createParticles(
            this.app,
            pos.x,
            pos.y - 40, // Au-dessus de la planète
            planet.owner === 'player' ? 0x3b82f6 : 0xef4444,
            3,
            this.particlePool
          );
          // Légère pulsation de la planète
          AnimationHelper.pulseScale(planet.getContainer(), 1.05, 0.1);
        }
      }
    });
  }
}
