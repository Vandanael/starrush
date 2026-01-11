import { Planet } from '../entities/Planet';
import { Triangle } from '../entities/Triangle';
import { DefenseTriangle } from '../entities/DefenseTriangle';
import { Sun } from '../entities/Sun';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIG, getMajorityThreshold } from '../config/GameConfig';
import { AnimationHelper } from '../utils/AnimationHelper';
import { Logger } from '../utils/Logger';
import { IUIManager } from '../ui/UIManager';
import { ObjectPool } from '../utils/ObjectPool';
// TooltipManager retiré - tutoriel utilisé à la place
import * as PIXI from 'pixi.js';

/**
 * Manages all player input: planet clicks, Sun attacks, and smart auto-attack logic.
 * Handles energy cost calculation based on distance and planet type.
 * Uses object pooling for triangle creation.
 */
export class InputManager {
  private planets: Planet[];
  private sun: Sun | null = null;
  private triangles: Triangle[] = [];
  private selectedPlanet: Planet | null = null;
  private uiManager: IUIManager | null = null;
  private defenseTriangles: DefenseTriangle[] = [];
  private app: PIXI.Application;
  private lastClickTime: number = 0;
  private lastClickedPlanet: Planet | null = null;
  private trianglePool: ObjectPool<Triangle> | null = null;
  
  constructor(planets: Planet[], uiManager: IUIManager | null = null, app?: PIXI.Application, sun?: Sun, trianglePool?: ObjectPool<Triangle> | null) {
    this.planets = planets;
    this.uiManager = uiManager;
    this.app = app!;
    this.sun = sun || null;
    this.trianglePool = trianglePool || null;
    this.setupPlanetClicks();
    if (this.sun) {
      this.setupSunClick();
    }
  }
  
  public setSun(sun: Sun) {
    this.sun = sun;
    this.setupSunClick();
  }
  
  public setUIManager(uiManager: IUIManager) {
    this.uiManager = uiManager;
  }
  
  private setupPlanetClicks() {
    this.planets.forEach(planet => {
      const graphics = planet.getContainer().children[1]; // Body
      
      graphics.on('pointerdown', () => {
        this.handlePlanetClick(planet);
      });
    });
  }
  
  private setupSunClick() {
    if (!this.sun) return;
    const sunContainer = this.sun.getContainer();
    sunContainer.eventMode = 'static';
    sunContainer.cursor = 'pointer';
    
    sunContainer.on('pointerdown', () => {
      this.handleSunClick();
    });
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
  
  private handleSunClick() {
    if (!this.sun || this.sun.owner !== null) return;
    
    const state = useGameStore.getState();
    
    // Vérifier cooldown
    if (!state.canAttackSun('player')) {
      const cooldownSeconds = Math.ceil(state.sunAttackCooldown / 60);
      if (this.uiManager) {
        this.uiManager.showAlert(`⏱️ Cooldown: ${cooldownSeconds}s`);
      }
      return;
    }
    
    const playerPlanets = this.planets.filter(p => p.owner === 'player');
    const majorityThreshold = getMajorityThreshold(state.gameMode);
    if (playerPlanets.length < majorityThreshold) {
      if (this.uiManager) {
        this.uiManager.showAlert(`❌ Besoin de ${majorityThreshold}+ planètes pour attaquer le Soleil !`);
      }
      return;
    }
    
    // Trouver la planète la plus proche avec assez de vaisseaux
    const sunPos = this.sun.getPosition();
    let bestPlanet: Planet | null = null;
    let minDistance = Infinity;
    const attackCost = state.getSunAttackCost();
    
    playerPlanets.forEach(planet => {
      const pos = planet.getPosition();
      const dx = pos.x - sunPos.x;
      const dy = pos.y - sunPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (planet.ships >= attackCost && distance < minDistance) {
        minDistance = distance;
        bestPlanet = planet;
      }
    });
    
    if (bestPlanet) {
      this.attackSun(bestPlanet);
    } else {
      if (this.uiManager) {
        this.uiManager.showAlert(`❌ Besoin de ${attackCost} vaisseaux pour attaquer !`);
      }
    }
  }
  
  private attackSun(source: Planet): boolean {
    if (!this.sun) return false;
    
    const state = useGameStore.getState();
    const attackCost = state.getSunAttackCost();
    
    if (source.ships < attackCost) {
      return false;
    }
    
    // Enregistrer l'attaque (cooldown + overcharge)
    state.registerSunAttack('player');
    
    // Retirer les vaisseaux
    source.removeShips(attackCost);
    
    // OPTIMIZATION: Acquire triangle from pool (zero allocation)
    const sourcePos = source.getPosition();
    const sunPos = this.sun!.getPosition();
    
    const triangle = this.trianglePool ? this.trianglePool.acquire() : null;
    if (!triangle) {
      Logger.log('⚠️ Triangle pool exhausted!');
      return false;
    }
    
    triangle.init(
      sourcePos.x,
      sourcePos.y,
      sunPos.x,
      sunPos.y,
      'player',
      1
    );
    
    this.triangles.push(triangle);
    state.incrementAttacks();
    
    AnimationHelper.pulseScale(source.getContainer(), 1.2, 0.15);
    Logger.log(`🚀 Attaque Soleil depuis planète ${source.id} (coût: ${attackCost})`);
    
    // Feedback visuel sur le coût
    if (this.uiManager && attackCost > GAME_CONFIG.ATTACK_COST_BASE) {
      const overcharge = attackCost - GAME_CONFIG.ATTACK_COST_BASE;
      this.uiManager.showAlert(`⚡ Overcharge: +${overcharge} vaisseaux`);
    }
    
    return true;
  }
  
  /**
   * Trouve la meilleure planète joueur pour attaquer une cible
   * Optimise : distance + coût (préfère planète proche avec assez de vaisseaux)
   */
  private findBestPlayerPlanetForAttack(target: Planet): Planet | null {
    const playerPlanets = this.planets.filter(p => p.owner === 'player');
    if (playerPlanets.length === 0) return null;
    
    const targetPos = target.getPosition();
    let bestPlanet: Planet | null = null;
    let bestScore = Infinity;
    
    playerPlanets.forEach(planet => {
      const sourcePos = planet.getPosition();
      const attackCost = this.calculateAttackCost(sourcePos, targetPos, planet);
      
      // Vérifier que la planète a assez de vaisseaux
      if (planet.ships >= attackCost) {
        // Score = distance + coût (optimiser pour le moins cher et le plus proche)
        const dx = sourcePos.x - targetPos.x;
        const dy = sourcePos.y - targetPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Score combiné : distance (poids 0.5) + coût (poids 1.0)
        // On privilégie légèrement le coût pour favoriser les planètes avec bonus (Forteresse -1 coût)
        const score = distance * 0.5 + attackCost;
        
        if (score < bestScore) {
          bestScore = score;
          bestPlanet = planet;
        }
      }
    });
    
    return bestPlanet;
  }
  
  private handlePlanetClick(planet: Planet) {
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime < 300) && (this.lastClickedPlanet === planet);
    this.lastClickTime = now;
    this.lastClickedPlanet = planet;
    
    // Double-clic sur planète joueur = défendre
    if (isDoubleClick && planet.owner === 'player') {
      this.defendPlanet(planet);
      return;
    }
    
    const state = useGameStore.getState();
    
    // Si on clique sur une planète joueur → sélectionner (mode manuel)
    if (planet.owner === 'player') {
      // Si déjà sélectionnée, désélectionner
      if (this.selectedPlanet === planet) {
        this.deselectPlanet();
        return;
      }
      
      // Sinon, sélectionner
      this.selectPlanet(planet);
      return;
    }
    
    // Si on clique sur une cible (neutre ou IA)
    // Mode automatique : trouver la meilleure planète joueur (Smart Auto)
    const sourcePlanet = this.findBestPlayerPlanetForAttack(planet);
    
    if (sourcePlanet) {
      // Attaquer directement depuis la meilleure planète
      const success = this.attack(sourcePlanet, planet);
      
      // Si attaque réussie, tracker
      if (success) {
        state.incrementAttacks();
        // Flash visuel sur la planète source utilisée
        AnimationHelper.pulseScale(sourcePlanet.getContainer(), 1.2, 0.15);
      }
      
      // Désélectionner si on avait une sélection
      if (this.selectedPlanet) {
        this.deselectPlanet();
      }
    } else {
      // Aucune planète joueur n'a assez de vaisseaux
      const sourcePos = this.planets.find(p => p.owner === 'player')?.getPosition();
      const targetPos = planet.getPosition();
      if (sourcePos) {
        const minCost = this.calculateAttackCost(sourcePos, targetPos);
        if (this.uiManager) {
          this.uiManager.showAlert(`❌ Besoin de ${minCost} vaisseaux minimum !`);
        }
      } else {
        if (this.uiManager) {
          this.uiManager.showAlert('❌ Aucune planète joueur disponible !');
        }
      }
    }
  }
  
  private defendPlanet(planet: Planet) {
    // Vérifier les vaisseaux (coût fixe pour défense)
    const defenseCost = GAME_CONFIG.ATTACK_COST_BASE;
    if (planet.ships < defenseCost) {
      AnimationHelper.shake(planet.getContainer(), 5, 0.3);
      if (this.uiManager) {
        this.uiManager.showAlert(`❌ Besoin de ${defenseCost} vaisseaux !`);
      }
      return;
    }
    
    // Vérifier si déjà défendue
    if (planet.hasDefense()) {
      if (this.uiManager) {
        this.uiManager.showAlert('Planète déjà défendue !');
      }
      return;
    }
    
    // Retirer les vaisseaux
    planet.removeShips(defenseCost);
    
    // Créer triangle défensif
    const defense = new DefenseTriangle(planet.getContainer(), 'player');
    planet.addDefense(defense);
    this.defenseTriangles.push(defense);
    this.app.stage.addChild(defense.getContainer());
    
    Logger.log(`🛡️ Planète ${planet.id} défendue`);
    
    if (this.uiManager) {
      this.uiManager.showAlert('🛡️ Défense activée !');
    }
  }
  
  private selectPlanet(planet: Planet) {
    this.selectedPlanet = planet;
    planet.setSelected(true);
    
    // Highlight les cibles possibles
    const sourcePos = planet.getPosition();
    
    this.planets.forEach(p => {
      if (p.owner !== 'player') {
        const targetPos = p.getPosition();
        const attackCost = this.calculateAttackCost(sourcePos, targetPos);
        const hasEnoughShips = planet.ships >= attackCost;
        p.setTargetable(true, hasEnoughShips, sourcePos, attackCost);
      }
    });
    
    Logger.log(`✅ Planète ${planet.id} sélectionnée`);
  }
  
  private deselectPlanet() {
    if (this.selectedPlanet) {
      this.selectedPlanet.setSelected(false);
      this.selectedPlanet = null;
    }
    
    // Retirer le highlight des cibles
    this.planets.forEach(p => {
      p.setTargetable(false);
    });
  }
  
  private attack(source: Planet, target: Planet): boolean {
    // Calculer le coût basé sur la distance et le type de planète
    const sourcePos = source.getPosition();
    const targetPos = target.getPosition();
    const attackCost = this.calculateAttackCost(sourcePos, targetPos, source);
    
    // Vérifier les vaisseaux
    if (source.ships < attackCost) {
      Logger.log(`❌ Pas assez de vaisseaux (besoin: ${attackCost})`);
      
      AnimationHelper.shake(source.getContainer(), 5, 0.3);
      if (this.uiManager) {
        this.uiManager.showAlert(`❌ Besoin de ${attackCost} vaisseaux !`);
      }
      return false;
    }
    
    // Bonus vitesse si planète Lanceur
    let speedMultiplier = 1;
    if (source.type === 'launcher') {
      const launcherConfig = GAME_CONFIG.PLANET_TYPES.LAUNCHER;
      speedMultiplier = launcherConfig.speedBonus || 1;
    }
    
    // Retirer les vaisseaux
    source.removeShips(attackCost);
    
    // OPTIMIZATION: Acquire triangle from pool (zero allocation)
    const triangle = this.trianglePool ? this.trianglePool.acquire() : null;
    if (!triangle) {
      Logger.log('⚠️ Triangle pool exhausted!');
      return false;
    }
    
    triangle.init(
      sourcePos.x,
      sourcePos.y,
      targetPos.x,
      targetPos.y,
      'player',
      speedMultiplier
    );
    
    this.triangles.push(triangle);
    useGameStore.getState().incrementAttacks();
    
    Logger.log(`🚀 Attaque: Planète ${source.id} → Planète ${target.id} (coût: ${attackCost})`);
    
    return true;
  }
  
  public update() {
    // Mettre à jour les indicateurs de vaisseaux sur les cibles
    if (this.selectedPlanet) {
      const sourcePos = this.selectedPlanet.getPosition();
      
      this.planets.forEach(p => {
        if (p.owner !== 'player') {
          const targetPos = p.getPosition();
          const attackCost = this.calculateAttackCost(sourcePos, targetPos, this.selectedPlanet!);
          const hasEnoughShips = this.selectedPlanet!.ships >= attackCost;
          p.setTargetable(true, hasEnoughShips, sourcePos, attackCost);
        }
      });
    }
    
    // Vérifier si le Soleil peut être attaqué
    if (this.sun) {
      const gameState = useGameStore.getState();
      const playerPlanets = this.planets.filter(p => p.owner === 'player');
      const majorityThreshold = getMajorityThreshold(gameState.gameMode);
      const canAttackSun = playerPlanets.length >= majorityThreshold;
      this.sun.setAttackable(canAttackSun);
    }
    
    // Update défenses
    for (let i = this.defenseTriangles.length - 1; i >= 0; i--) {
      const defense = this.defenseTriangles[i];
      if (!defense.isActive) {
        this.defenseTriangles.splice(i, 1);
        if (defense.getContainer().parent) {
          this.app.stage.removeChild(defense.getContainer());
        }
      } else {
        defense.update(1); // delta = 1 frame
      }
    }
  }
  
  public getTriangles(): Triangle[] {
    return this.triangles;
  }
}
