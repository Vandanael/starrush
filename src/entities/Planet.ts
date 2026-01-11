import * as PIXI from 'pixi.js';
import { DefenseTriangle } from './DefenseTriangle';
import { GAME_CONFIG } from '../config/GameConfig';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';
import { easeElastic } from '../utils/AnimationMath';

export type Owner = 'player' | 'ai' | 'neutral';
export type PlanetType = 'generator' | 'fortress' | 'launcher' | 'standard';

/**
 * Represents a planet in the game. Planets can be owned by the player, AI, or neutral.
 * Planets produce ships over time and can be attacked to change ownership.
 * Different planet types have different production rates and special abilities.
 */
export class Planet {
  private container: PIXI.Container;
  private glow: PIXI.Graphics;
  private body: PIXI.Graphics;
  private selectionOutline: PIXI.Graphics | null = null;
  private targetIndicator: PIXI.Container | null = null;
  private defenseTriangle: DefenseTriangle | null = null;
  private radius: number = LUMINOUS_STYLE.RENDERING.PLANET_RADIUS; // Mobile first: 45px
  public owner: Owner;
  public id: number;
  public type: PlanetType;
  public ships: number = 0;
  private shipsText: PIXI.Container | null = null;
  private typeIndicator: PIXI.Graphics | null = null;
  private isSelected: boolean = false;
  private isTargetable: boolean = false;
  private hasEnoughShips: boolean = true;
  private pulsePhase: number = 0;
  private sourcePosition: { x: number; y: number } | null = null;
  private attackCost: number = 5;
  
  // GAME FEEL: Elastic pop animation on capture
  private captureAnimation: {
    active: boolean;
    progress: number;
    startScale: number;
    targetScale: number;
  } = {
    active: false,
    progress: 0,
    startScale: 1.0,
    targetScale: 1.0
  };
  
  constructor(x: number, y: number, owner: Owner, id: number, type: PlanetType = 'standard') {
    this.owner = owner;
    this.id = id;
    this.type = type;
    
    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;
    
    // Glow
    this.glow = new PIXI.Graphics();
    this.container.addChild(this.glow);
    
    // Body
    this.body = new PIXI.Graphics();
    this.body.eventMode = 'static';
    this.body.cursor = 'pointer';
    
    // IMPORTANT: Pour les planètes neutres (ring only), on doit définir une hitArea
    // pour que toute la zone du cercle soit cliquable, pas seulement le contour
    this.body.hitArea = new PIXI.Circle(0, 0, this.radius);
    
    this.container.addChild(this.body);
    
    this.setupInteraction();
    this.draw();
  }
  
  private getColor(): number {
    switch (this.owner) {
      case 'player': return LUMINOUS_STYLE.COLORS.PLAYER; // Electric Mint/Cyan
      case 'ai': return LUMINOUS_STYLE.COLORS.AI; // Magenta/Coral Red
      case 'neutral': return LUMINOUS_STYLE.COLORS.NEUTRAL; // Subtle gray
    }
  }
  
  private draw() {
    const color = this.getColor();
    
    // LUMINOUS ABSTRACT: Radical minimalism - glow seulement si vraiment nécessaire
    this.glow.clear();
    let glowIntensity = 0;
    let glowColor = color;
    
    // Glow très subtil seulement pour sélection (pas pour targetable)
    if (this.isSelected) {
      glowIntensity = LUMINOUS_STYLE.RENDERING.GLOW_INTENSITY; // 0.15 - très subtil
      glowColor = this.owner === 'player' 
        ? LUMINOUS_STYLE.COLORS.PLAYER_BRIGHT 
        : LUMINOUS_STYLE.COLORS.AI_BRIGHT;
      
      this.glow.beginFill(glowColor, glowIntensity);
      this.glow.drawCircle(0, 0, this.radius * 1.5); // Plus petit glow
      this.glow.endFill();
    }
    
    // Body - LUMINOUS ABSTRACT: Change form based on ownership
    this.body.clear();
    const scale = this.isSelected ? 1.1 : 1.0; // Scale minimal
    
    if (this.owner === 'neutral') {
      // NEUTRAL = Outlined ring (no fill) - radical minimalism
      this.body.lineStyle(
        LUMINOUS_STYLE.RENDERING.PLANET_NEUTRAL_STROKE, 
        color, 
        LUMINOUS_STYLE.RENDERING.PLANET_NEUTRAL_ALPHA
      );
      this.body.drawCircle(0, 0, this.radius * scale);
      // Pas de fill pour neutral
    } else {
      // OWNED = Filled circle (no stroke) - luminous
      this.body.beginFill(color, 1.0); // Opacité complète pour luminosité
      this.body.drawCircle(0, 0, this.radius * scale);
      this.body.endFill();
    }
    
    // Pas de bordure blanche - radical minimalism
    
    // Afficher nombre de vaisseaux (en premier pour z-order)
    this.drawShipsCount();
    
    // Indicateur de type (icône/bordure)
    this.drawTypeIndicator();
    
    // Indicateur défense
    if (this.defenseTriangle && this.defenseTriangle.isActive) {
      this.body.lineStyle(3, 0x22c55e, 0.8);
      this.body.drawCircle(0, 0, this.radius * 1.2);
    }
    
    // Selection outline (simple, non pulsant pour moins de distraction)
    if (this.isSelected) {
      if (!this.selectionOutline) {
        this.selectionOutline = new PIXI.Graphics();
        this.container.addChild(this.selectionOutline);
      }
      this.selectionOutline.clear();
      this.selectionOutline.lineStyle(2, 0xffffff, 0.8); // Ligne simple
      this.selectionOutline.drawCircle(0, 0, this.radius * 1.25);
    } else {
      if (this.selectionOutline) {
        this.container.removeChild(this.selectionOutline);
        this.selectionOutline = null;
      }
    }
    
    // Indicateur de coût si ciblable
    this.updateTargetIndicator();
  }
  
  private updateTargetIndicator() {
    if (this.isTargetable && this.hasEnoughShips) {
      // Créer le container si nécessaire
      if (!this.targetIndicator) {
        this.targetIndicator = new PIXI.Container();
        this.targetIndicator.y = -this.radius - 25; // Au-dessus de la planète (vaisseaux sont maintenant au centre)
        this.container.addChild(this.targetIndicator);
      }
      
      // Recalculer le badge avec temps de trajet (toujours recréer pour mettre à jour)
      this.targetIndicator.removeChildren();
      
      // Calculer distance et temps de trajet
      let travelTime = 0;
      if (this.sourcePosition) {
        const dx = this.container.x - this.sourcePosition.x;
        const dy = this.container.y - this.sourcePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Vitesse triangle = 200 pixels/sec
        travelTime = Math.ceil(distance / 200);
      }
      
      // Texte avec temps et coût
      let displayText = `${this.attackCost}🚀`;
      
      if (travelTime > 0) {
        displayText = `~${travelTime}s | ${displayText}`;
      }
      
      // Couleur du badge
      const badgeColor = 0x22c55e; // Vert
      
      // Largeur du badge selon le contenu (plus grand)
      const badgeWidth = travelTime > 0 ? 110 : 70;
      const badgeHeight = 28; // Plus haut
      const badge = new PIXI.Graphics();
      badge.beginFill(badgeColor, 0.9); // Plus opaque
      badge.drawRoundedRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 8);
      badge.endFill();
      this.targetIndicator.addChild(badge);
      
      const costText = new PIXI.Text(displayText, {
        fontFamily: 'Arial, sans-serif',
        fontSize: travelTime > 0 ? 13 : 15, // Plus grand
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: 0x000000,
        strokeThickness: 2
      });
      costText.anchor.set(0.5);
      this.targetIndicator.addChild(costText);
    } else {
      if (this.targetIndicator) {
        this.container.removeChild(this.targetIndicator);
        this.targetIndicator = null;
      }
    }
  }
  
  public update(delta: number) {
    this.pulsePhase += delta * 0.1;
    
    // GAME FEEL: Update capture animation (elastic pop)
    if (this.captureAnimation.active) {
      const animationSpeed = 0.15; // Speed of animation (frames per progress unit)
      this.captureAnimation.progress += delta * animationSpeed / 60; // Normalize to seconds
      
      if (this.captureAnimation.progress >= 1.0) {
        // Animation complete
        this.captureAnimation.active = false;
        this.captureAnimation.progress = 1.0;
        this.container.scale.set(1.0);
      } else {
        // Elastic easing with overshoot
        const eased = easeElastic(this.captureAnimation.progress, 0.3, 0.3);
        const currentScale = this.captureAnimation.startScale + 
          (this.captureAnimation.targetScale - this.captureAnimation.startScale) * eased;
        this.container.scale.set(currentScale);
      }
    }
    
    if (this.defenseTriangle) {
      this.defenseTriangle.update(delta);
    }
    
    if (this.isSelected || this.isTargetable || this.captureAnimation.active) {
      this.draw();
    }
  }
  
  private setupInteraction() {
    this.body.on('pointerdown', () => {
      // Logger.log(`🪐 Planète ${this.id} cliquée (${this.owner})`); // Désactivé pour réduire le bruit
      this.body.scale.set(1.1);
    });
    
    this.body.on('pointerup', () => {
      this.body.scale.set(1.0);
    });
  }
  
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.pulsePhase = 0;
    this.draw();
  }
  
  public setTargetable(targetable: boolean, hasShips: boolean = true, sourcePosition?: { x: number; y: number }, attackCost: number = 5) {
    this.isTargetable = targetable;
    this.hasEnoughShips = hasShips;
    this.sourcePosition = sourcePosition || null;
    this.attackCost = attackCost;
    this.draw();
  }
  
  public getProduction(): number {
    const typeConfig = GAME_CONFIG.PLANET_TYPES[this.type.toUpperCase() as keyof typeof GAME_CONFIG.PLANET_TYPES];
    return typeConfig?.production || 1;
  }
  
  public hasDefensePassive(): boolean {
    return this.type === 'fortress';
  }
  
  private drawTypeIndicator() {
    // Supprimer l'ancien indicateur
    if (this.typeIndicator && this.typeIndicator.parent) {
      this.container.removeChild(this.typeIndicator);
    }
    
    // Créer nouvel indicateur selon le type
    this.typeIndicator = new PIXI.Graphics();
    const indicatorY = this.radius + 12;
    
    switch (this.type) {
      case 'generator':
        // LUMINOUS ABSTRACT: Simple circle, luminous color
        this.typeIndicator.beginFill(LUMINOUS_STYLE.COLORS.UI_WARNING, 1.0); // Warning Orange
        this.typeIndicator.drawCircle(0, indicatorY, 6);
        this.typeIndicator.endFill();
        break;
      case 'fortress':
        // LUMINOUS ABSTRACT: Subtle ring (déjà géré dans draw() pour défense)
        // Pas besoin de double indicateur - radical minimalism
        break;
      case 'launcher':
        // LUMINOUS ABSTRACT: Simple triangle, luminous color
        this.typeIndicator.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 1.0); // Electric Mint
        this.typeIndicator.moveTo(0, indicatorY - 4);
        this.typeIndicator.lineTo(-4, indicatorY + 4);
        this.typeIndicator.lineTo(4, indicatorY + 4);
        this.typeIndicator.closePath();
        this.typeIndicator.endFill();
        break;
      default:
        // Standard : pas d'indicateur
        break;
    }
    
    if (this.typeIndicator && this.type !== 'standard') {
      this.container.addChild(this.typeIndicator);
    }
  }
  
  private drawShipsCount() {
    // Supprimer l'ancien badge
    if (this.shipsText && this.shipsText.parent) {
      this.container.removeChild(this.shipsText);
    }
    
    // Afficher seulement si la planète appartient à quelqu'un
    // Mettre les chiffres DANS le cercle de la planète (au centre)
    if (this.owner !== 'neutral' && this.ships > 0) {
      const badgeContainer = new PIXI.Container();
      badgeContainer.y = 0; // Au centre de la planète
      
      // LUMINOUS ABSTRACT: No badge background - just floating text
      // Pas de badgeBg - radical minimalism
      
      // Texte (taille adaptée pour mobile)
      const fontSize = LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL; // 18px
      const shipsTextElement = new PIXI.Text(`${Math.floor(this.ships)}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: fontSize,
        fill: LUMINOUS_STYLE.COLORS.UI_TEXT, // Blanc pur
        fontWeight: 'bold',
        // Pas de stroke - radical minimalism
      });
      shipsTextElement.anchor.set(0.5);
      badgeContainer.addChild(shipsTextElement);
      
      this.container.addChild(badgeContainer);
      this.shipsText = badgeContainer; // Stocker le container
    }
  }
  
  public addShips(amount: number) {
    this.ships += amount;
    this.drawShipsCount();
  }
  
  public removeShips(amount: number): boolean {
    if (this.ships >= amount) {
      this.ships -= amount;
      this.drawShipsCount();
      return true;
    }
    return false;
  }
  
  public setOwner(owner: Owner) {
    const previousOwner = this.owner;
    this.owner = owner;
    
    // GAME FEEL: Elastic pop animation on capture
    if (previousOwner !== owner && owner !== 'neutral') {
      // Trigger elastic pop: scale to 130%, then bounce back to 100%
      this.captureAnimation.active = true;
      this.captureAnimation.progress = 0;
      this.captureAnimation.startScale = 1.0;
      this.captureAnimation.targetScale = 1.3; // 130%
    }
    
    this.draw();
  }
  
  public addDefense(defenseTriangle: DefenseTriangle) {
    this.defenseTriangle = defenseTriangle;
    this.draw();
  }
  
  public hasDefense(): boolean {
    return this.defenseTriangle !== null && this.defenseTriangle.isActive;
  }
  
  public getDefenseTriangle(): DefenseTriangle | null {
    return this.defenseTriangle;
  }
  
  public consumeDefense() {
    if (this.defenseTriangle) {
      this.defenseTriangle.consume();
      this.defenseTriangle = null;
      this.draw();
    }
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
  
  public getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }
}
