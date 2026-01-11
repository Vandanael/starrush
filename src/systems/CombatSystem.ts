import { Triangle } from '../entities/Triangle';
import { Planet } from '../entities/Planet';
import { Sun } from '../entities/Sun';
import { AnimationHelper } from '../utils/AnimationHelper';
import { useGameStore } from '../store/gameStore';
import { Logger } from '../utils/Logger';
import { NarrativeSystem } from '../utils/NarrativeSystem';
import { ObjectPool } from '../utils/ObjectPool';
import { ParticlePool } from '../utils/ParticlePool';
import { GAME_CONFIG } from '../config/GameConfig';
import * as PIXI from 'pixi.js';

export interface IEffectsSystem {
  screenShake(intensity: number, duration: number): void;
  flash(color: number, duration: number): void;
}

/**
 * Handles all combat logic: triangle collisions with planets and the Sun,
 * ownership changes, and visual feedback (particles, effects).
 * Uses object pooling for performance optimization.
 */
export class CombatSystem {
  private planets: Planet[];
  private sun: Sun | null = null;
  private app: PIXI.Application;
  private onPlayerLostPlanet: (() => void) | null = null;
  private effectsSystem: IEffectsSystem | null = null;
  private trianglePool: ObjectPool<Triangle> | null = null;
  private particlePool: ParticlePool | null = null;
  
  constructor(planets: Planet[], app: PIXI.Application, sun?: Sun, trianglePool?: ObjectPool<Triangle> | null, particlePool?: ParticlePool | null) {
    this.planets = planets;
    this.app = app;
    this.sun = sun || null;
    this.trianglePool = trianglePool || null;
    this.particlePool = particlePool || null;
  }
  
  public setSun(sun: Sun) {
    this.sun = sun;
  }
  
  public setEffectsSystem(effectsSystem: IEffectsSystem) {
    this.effectsSystem = effectsSystem;
  }
  
  public setOnPlayerLostPlanet(callback: () => void) {
    this.onPlayerLostPlanet = callback;
  }
  
  public update(playerTriangles: Triangle[], aiTriangles: Triangle[]) {
    // Traiter les triangles joueur
    for (let i = playerTriangles.length - 1; i >= 0; i--) {
      const triangle = playerTriangles[i];
      if (triangle.hasReached) {
        // Vérifier si c'est une attaque sur le Soleil
        if (this.sun && this.checkSunHit(triangle)) {
          this.resolveSunAttack(triangle);
        } else {
          this.resolveAttack(triangle);
        }
        // OPTIMIZATION: Release triangle to pool instead of destroying (zero allocation)
        const container = triangle.getContainer();
        if (container.parent) {
          container.parent.removeChild(container);
        }
        // Release to pool instead of destroy
        if (this.trianglePool) {
          this.trianglePool.release(triangle);
        } else {
          container.destroy();
        }
        playerTriangles.splice(i, 1);
      }
    }
    
    // Traiter les triangles IA
    for (let i = aiTriangles.length - 1; i >= 0; i--) {
      const triangle = aiTriangles[i];
      if (triangle.hasReached) {
        // Vérifier si c'est une attaque sur le Soleil
        if (this.sun && this.checkSunHit(triangle)) {
          this.resolveSunAttack(triangle);
        } else {
          this.resolveAttack(triangle);
        }
        // OPTIMIZATION: Release triangle to pool instead of destroying (zero allocation)
        const container = triangle.getContainer();
        if (container.parent) {
          container.parent.removeChild(container);
        }
        // Release to pool instead of destroy
        if (this.trianglePool) {
          this.trianglePool.release(triangle);
        } else {
          container.destroy();
        }
        aiTriangles.splice(i, 1);
      }
    }
  }
  
  private checkSunHit(triangle: Triangle): boolean {
    if (!this.sun || this.sun.owner !== null) return false;
    
    const triangleContainer = triangle.getContainer();
    const sunPos = this.sun.getPosition();
    const dx = sunPos.x - triangleContainer.x;
    const dy = sunPos.y - triangleContainer.y;
    // OPTIMIZATION: Use squared distance (avoid Math.sqrt)
    const distanceSquared = dx * dx + dy * dy;
    const thresholdSquared = GAME_CONFIG.SUN_HIT_THRESHOLD * GAME_CONFIG.SUN_HIT_THRESHOLD;
    return distanceSquared < thresholdSquared;
  }
  
  private resolveSunAttack(triangle: Triangle) {
    if (!this.sun) return;
    
    const triangleContainer = triangle.getContainer();
    const attacker = triangle.owner;
    
    // Message narratif avant attaque (seulement si player ou ai)
    if (attacker === 'player' || attacker === 'ai') {
      const message = NarrativeSystem.getAttackMessage(attacker, this.sun.hp);
      Logger.log(`📖 ${message}`);
    }
    
    // Infliger des dégâts au Soleil
    const captured = this.sun.takeDamage(attacker);
    
    // Particules (OPTIMIZATION: Use particle pool)
    const color = attacker === 'player' ? 0x3b82f6 : 0xef4444;
    AnimationHelper.createParticles(
      this.app,
      triangleContainer.x,
      triangleContainer.y,
      color,
      20,
      this.particlePool
    );
    
    // Screen shake si dégâts
    if (!captured) {
      // Animation de pulse sur le soleil
      AnimationHelper.pulseScale(this.sun.getContainer(), 1.2, 0.2);
      // Screen shake
      if (this.effectsSystem) {
        this.effectsSystem.screenShake(10, 0.3);
      }
    } else {
      // Explosion si capturé (OPTIMIZATION: Use particle pool)
      AnimationHelper.createParticles(
        this.app,
        this.sun.getPosition().x,
        this.sun.getPosition().y,
        color,
        30,
        this.particlePool
      );
      AnimationHelper.pulseScale(this.sun.getContainer(), 1.5, 0.5);
    }
    
    Logger.log(`☀️ Soleil attaqué par ${attacker} ! HP: ${this.sun.hp}/3`);
  }
  
  private resolveAttack(triangle: Triangle) {
    const triangleContainer = triangle.getContainer();
    let closestPlanet: Planet | null = null;
    let minDistanceSquared = Infinity;
    
    // OPTIMIZATION: Use squared distance for comparison (avoid Math.sqrt in loop)
    const thresholdSquared = 50 * 50; // 50 * 50 = 2500
    
    this.planets.forEach(planet => {
      const pos = planet.getPosition();
      const dx = pos.x - triangleContainer.x;
      const dy = pos.y - triangleContainer.y;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared < minDistanceSquared) {
        minDistanceSquared = distanceSquared;
        closestPlanet = planet;
      }
    });
    
    if (closestPlanet !== null && minDistanceSquared < thresholdSquared) {
      const targetPlanet: Planet = closestPlanet;
      const oldOwner = targetPlanet.owner;
      const newOwner = triangle.owner;
      
      // Ne rien faire si même propriétaire
      if (oldOwner === newOwner) {
        // Le triangle sera détruit par le système appelant
        return;
      }
      
      // Vérifier défense
      if (targetPlanet.hasDefense() && oldOwner !== 'neutral') {
        // La défense bloque l'attaque
        targetPlanet.consumeDefense();
        Logger.log(`🛡️ Défense activée sur planète ${targetPlanet.id}`);
        
        // Particules de blocage (OPTIMIZATION: Use particle pool)
        AnimationHelper.createParticles(
          this.app,
          triangleContainer.x,
          triangleContainer.y,
          0x22c55e,
          8,
          this.particlePool
        );
        // Le triangle sera détruit par le système appelant
        return;
      }
      
      Logger.log(`💥 Planète ${targetPlanet.id} conquise par ${newOwner}`);
      
      // Couleurs
      const oldColor = oldOwner === 'player' ? 0x3b82f6 : oldOwner === 'ai' ? 0xef4444 : 0x6b7280;
      const newColor = newOwner === 'player' ? 0x3b82f6 : 0xef4444;
      
      // Particules à l'arrivée (plus visibles) (OPTIMIZATION: Use particle pool)
      AnimationHelper.createParticles(
        this.app,
        triangleContainer.x,
        triangleContainer.y,
        newColor,
        20, // Plus de particules pour meilleur feedback
        this.particlePool
      );
      
      // Animation de transition de couleur
      AnimationHelper.animateColorTransition(
        targetPlanet,
        oldColor,
        newColor,
        0.3,
        () => {
          targetPlanet.setOwner(newOwner);
        }
      );
      
      // Pulse sur la planète (plus fort pour meilleur feedback)
      AnimationHelper.pulseScale(targetPlanet.getContainer(), 1.4, 0.3);
      
      // Stats : conquête joueur
      if (newOwner === 'player') {
        useGameStore.getState().incrementConquests();
      }
      
      // Callback : joueur perd une planète
      if (oldOwner === 'player' && this.onPlayerLostPlanet) {
        this.onPlayerLostPlanet();
      }
      
      // Le triangle sera détruit par le système appelant
    }
  }
}
