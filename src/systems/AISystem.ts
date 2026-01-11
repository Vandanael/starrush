import { Planet } from '../entities/Planet';
import { Triangle } from '../entities/Triangle';
import { DefenseTriangle } from '../entities/DefenseTriangle';
import { Sun } from '../entities/Sun';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIG, getMajorityThreshold } from '../config/GameConfig';
import { Logger } from '../utils/Logger';
import { ObjectPool } from '../utils/ObjectPool';
import * as PIXI from 'pixi.js';

/**
 * Controls the AI opponent's behavior. Makes strategic decisions every second:
 * - Attacks planets or the Sun based on current strategy (aggressive, balanced, defensive)
 * - Defends owned planets with defensive units
 * - Adapts strategy based on game state
 */
export class AISystem {
  private planets: Planet[];
  private sun: Sun | null = null;
  private triangles: Triangle[] = [];
  private decisionTimer: number = 0;
  private aiStrategy: 'aggressive' | 'balanced' | 'defensive' = 'balanced';
  private trianglePool: ObjectPool<Triangle> | null = null;
  
  constructor(planets: Planet[], sun?: Sun, trianglePool?: ObjectPool<Triangle> | null) {
    this.planets = planets;
    this.sun = sun || null;
    this.trianglePool = trianglePool || null;
    // Choisir stratégie initiale aléatoirement
    this.chooseStrategy();
  }
  
  public setSun(sun: Sun) {
    this.sun = sun;
  }
  
  private chooseStrategy() {
    const rand = Math.random();
    if (rand < 0.3) {
      this.aiStrategy = 'aggressive';
    } else if (rand < 0.7) {
      this.aiStrategy = 'balanced';
    } else {
      this.aiStrategy = 'defensive';
    }
    Logger.log(`🤖 IA stratégie: ${this.aiStrategy}`);
  }
  
  public update(delta: number) {
    // Décision toutes les 1 secondes (au lieu de 2)
    this.decisionTimer += delta;
    if (this.decisionTimer >= 60) {
      this.decisionTimer = 0;
      this.makeDecision();
    }
    
    // Update triangles IA
    for (let i = this.triangles.length - 1; i >= 0; i--) {
      const triangle = this.triangles[i];
      triangle.update(delta);
      
      if (triangle.hasReached) {
        this.triangles.splice(i, 1);
      }
    }
  }
  
  private makeDecision() {
    const aiPlanets = this.planets.filter(p => p.owner === 'ai');
    const playerPlanets = this.planets.filter(p => p.owner === 'player');
    const neutralPlanets = this.planets.filter(p => p.owner === 'neutral');
    
    // Si pas de planète, game over pour l'IA
    if (aiPlanets.length === 0) return;
    
    // DÉFENSE PROACTIVE: Si joueur a 4+ planètes, défendre planètes stratégiques
    if (playerPlanets.length >= 4 && this.aiStrategy !== 'aggressive') {
      const strategicPlanet = this.findStrategicPlanetToDefend(aiPlanets);
      if (strategicPlanet && !strategicPlanet.hasDefense() && strategicPlanet.ships >= GAME_CONFIG.ATTACK_COST_BASE) {
        this.defendPlanet(strategicPlanet);
        return;
      }
    }
    
    // PRIORITÉ 1: Si j'ai la majorité ET le soleil est attaquable -> RUSH SOLEIL
    const state = useGameStore.getState();
    const majorityThreshold = getMajorityThreshold(state.gameMode);
    if (aiPlanets.length >= majorityThreshold && 
        this.sun && 
        this.sun.owner === null && 
        this.sun.isAttackable) {
      const bestPlanet = this.findBestPlanetForSunAttack(aiPlanets);
      if (bestPlanet) {
        this.attackSun(bestPlanet);
        return;
      }
    }
    
    // PRIORITÉ 2: Stratégie selon type
    if (this.aiStrategy === 'aggressive') {
      // Stratégie agressive: expansion rapide
      if (neutralPlanets.length > 0) {
        const target = neutralPlanets[0];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
      // Si pas de neutres, attaquer joueur
      if (playerPlanets.length > 0) {
        const target = playerPlanets[Math.floor(Math.random() * playerPlanets.length)];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
    } else if (this.aiStrategy === 'defensive') {
      // Stratégie défensive: bloquer joueur prioritairement
      if (playerPlanets.length >= 3) {
        // Cibler planètes proches du Soleil ou générateurs
        const priorityTargets = playerPlanets.filter(p => 
          p.type === 'generator' || this.isPlanetNearSun(p)
        );
        const target = priorityTargets.length > 0 
          ? priorityTargets[Math.floor(Math.random() * priorityTargets.length)]
          : playerPlanets[Math.floor(Math.random() * playerPlanets.length)];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
      // Sinon conquérir neutres
      if (neutralPlanets.length > 0) {
        const target = neutralPlanets[0];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
    } else {
      // Stratégie équilibrée (comportement original)
      if (playerPlanets.length >= 4) {
        const target = playerPlanets[Math.floor(Math.random() * playerPlanets.length)];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
      
      if (neutralPlanets.length > 0) {
        const target = neutralPlanets[0];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      } else if (playerPlanets.length > 0) {
        const target = playerPlanets[Math.floor(Math.random() * playerPlanets.length)];
        const source = this.findBestPlanetForAttack(aiPlanets, target);
        if (source) {
          this.attackPlanet(source, target);
          return;
        }
      }
    }
  }
  
  private findStrategicPlanetToDefend(aiPlanets: Planet[]): Planet | null {
    // Défendre planètes proches du Soleil ou générateurs
    let bestPlanet: Planet | null = null;
    let bestScore = -1;
    
    aiPlanets.forEach(planet => {
      if (planet.hasDefense()) return;
      
      let score = 0;
      
      // Bonus si générateur (production importante)
      if (planet.type === 'generator') score += 3;
      
      // Bonus si proche du Soleil
      if (this.sun && this.isPlanetNearSun(planet)) score += 2;
      
      // Bonus si beaucoup de vaisseaux
      score += planet.ships / 10;
      
      if (score > bestScore) {
        bestScore = score;
        bestPlanet = planet;
      }
    });
    
    return bestPlanet;
  }
  
  private isPlanetNearSun(planet: Planet): boolean {
    if (!this.sun) return false;
    const sunPos = this.sun.getPosition();
    const planetPos = planet.getPosition();
    const dx = sunPos.x - planetPos.x;
    const dy = sunPos.y - planetPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 300; // Proche du Soleil
  }
  
  private defendPlanet(planet: Planet) {
    if (planet.hasDefense() || planet.ships < GAME_CONFIG.ATTACK_COST_BASE) return;
    
    planet.removeShips(GAME_CONFIG.ATTACK_COST_BASE);
    
    // Créer triangle défensif (nécessite app pour stage)
    // Note: L'IA n'a pas accès direct à app, on devra passer par un callback
    // Pour l'instant, on utilise la méthode de Planet directement
    const defense = new DefenseTriangle(planet.getContainer(), 'ai');
    planet.addDefense(defense);
    
    Logger.log(`🛡️ IA défend planète ${planet.id}`);
  }
  
  public setApp(_app: PIXI.Application) {
    // App is stored but not directly used (defenses are added via Planet methods)
    // Kept for potential future use
  }
  
  private findBestPlanetForSunAttack(aiPlanets: Planet[]): Planet | null {
    if (!this.sun) return null;
    
    const state = useGameStore.getState();
    const attackCost = state.getSunAttackCost();
    const sunPos = this.sun.getPosition();
    let bestPlanet: Planet | null = null;
    let minDistance = Infinity;
    
    aiPlanets.forEach(planet => {
      if (planet.ships >= attackCost) {
        const pos = planet.getPosition();
        const dx = pos.x - sunPos.x;
        const dy = pos.y - sunPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestPlanet = planet;
        }
      }
    });
    
    return bestPlanet;
  }
  
  private findBestPlanetForAttack(sources: Planet[], target: Planet): Planet | null {
    let bestPlanet: Planet | null = null;
    let bestScore = -1;
    
    const targetPos = target.getPosition();
    
    sources.forEach(planet => {
      const pos = planet.getPosition();
      const attackCost = this.calculateAttackCost(pos, targetPos, planet);
      
      if (planet.ships >= attackCost) {
        const dx = pos.x - targetPos.x;
        const dy = pos.y - targetPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Score = vaisseaux disponibles / (distance + coût) (préfère planètes avec beaucoup de vaisseaux et proches)
        const score = planet.ships / (distance + attackCost + 1);
        
        if (score > bestScore) {
          bestScore = score;
          bestPlanet = planet;
        }
      }
    });
    
    return bestPlanet;
  }
  
  private calculateAttackCost(sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, sourcePlanet?: Planet): number {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const baseCost = GAME_CONFIG.ATTACK_COST_BASE;
    const distanceCost = distance * GAME_CONFIG.ATTACK_COST_DISTANCE_MULTIPLIER;
    
    // Modificateur selon type de planète source
    let typeModifier = 0;
    if (sourcePlanet) {
      const planetType = GAME_CONFIG.PLANET_TYPES[sourcePlanet.type.toUpperCase() as keyof typeof GAME_CONFIG.PLANET_TYPES];
      typeModifier = planetType?.attackCostModifier || 0;
    }
    
    const totalCost = baseCost + distanceCost + typeModifier;
    
    return Math.max(
      GAME_CONFIG.ATTACK_COST_MIN,
      Math.min(GAME_CONFIG.ATTACK_COST_MAX, Math.floor(totalCost))
    );
  }
  
  private attackSun(source: Planet) {
    if (!this.sun) return;
    
    const state = useGameStore.getState();
    
    // Vérifier cooldown
    if (!state.canAttackSun('ai')) return;
    
    const attackCost = state.getSunAttackCost();
    if (source.ships < attackCost) return;
    
    // Enregistrer l'attaque (cooldown + overcharge)
    state.registerSunAttack('ai');
    
    // Retirer les vaisseaux
    source.removeShips(attackCost);
    
    // Créer le triangle
    const sourcePos = source.getPosition();
    const sunPos = this.sun.getPosition();
    
    // Bonus vitesse si planète Lanceur
    let speedMultiplier = 1;
    if (source.type === 'launcher') {
      const launcherConfig = GAME_CONFIG.PLANET_TYPES.LAUNCHER;
      speedMultiplier = launcherConfig.speedBonus || 1;
    }
    
    // OPTIMIZATION: Acquire triangle from pool (zero allocation)
    const triangle = this.trianglePool ? this.trianglePool.acquire() : null;
    if (!triangle) {
      Logger.log('⚠️ Triangle pool exhausted!');
      return;
    }
    
    triangle.init(
      sourcePos.x,
      sourcePos.y,
      sunPos.x,
      sunPos.y,
      'ai',
      speedMultiplier
    );
    
    this.triangles.push(triangle);
    state.incrementAttacks();
    
    Logger.log(`🤖 IA attaque le Soleil depuis planète ${source.id} (coût: ${attackCost})`);
  }
  
  private attackPlanet(source: Planet, target: Planet) {
    const sourcePos = source.getPosition();
    const targetPos = target.getPosition();
    const attackCost = this.calculateAttackCost(sourcePos, targetPos, source);
    
    if (source.ships < attackCost) return;
    
    // Retirer les vaisseaux
    source.removeShips(attackCost);
    
    // Bonus vitesse si planète Lanceur
    let speedMultiplier = 1;
    if (source.type === 'launcher') {
      const launcherConfig = GAME_CONFIG.PLANET_TYPES.LAUNCHER;
      speedMultiplier = launcherConfig.speedBonus || 1;
    }
    
    // OPTIMIZATION: Acquire triangle from pool (zero allocation)
    const triangle = this.trianglePool ? this.trianglePool.acquire() : null;
    if (!triangle) {
      Logger.log('⚠️ Triangle pool exhausted!');
      return;
    }
    
    triangle.init(
      sourcePos.x,
      sourcePos.y,
      targetPos.x,
      targetPos.y,
      'ai',
      speedMultiplier
    );
    
    this.triangles.push(triangle);
    useGameStore.getState().incrementAttacks();
    
    Logger.log(`🤖 IA attaque : Planète ${source.id} → Planète ${target.id} (coût: ${attackCost})`);
  }
  
  public getTriangles(): Triangle[] {
    return this.triangles;
  }
  
  public updateDefenses(delta: number) {
    // Mettre à jour les défenses de l'IA
    this.planets.forEach(planet => {
      if (planet.owner === 'ai' && planet.hasDefense()) {
        const defense = planet.getDefenseTriangle();
        if (defense) {
          defense.update(delta);
        }
      }
    });
  }
}
