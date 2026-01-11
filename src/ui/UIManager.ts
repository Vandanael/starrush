import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIG, getMajorityThreshold } from '../config/GameConfig';
import { UI_CONSTANTS } from '../config/UIConstants';
import { AnimationHelper } from '../utils/AnimationHelper';
import { Planet } from '../entities/Planet';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';

export interface IUIManager {
  setPlanets(planets: Planet[]): void;
  update(): void;
  showAlert(message: string): void;
  getContainer(): PIXI.Container;
}

/**
 * Manages all in-game UI elements: timer, Sun HP bar, planet counts, contextual messages, and alerts.
 * Updates UI elements every frame based on game state.
 * Provides visual feedback for player actions and game events.
 */
export class UIManager implements IUIManager {
  private container: PIXI.Container;
  private app: PIXI.Application;
  private planets: Planet[] = [];
  
  public setPlanets(planets: Planet[]) {
    this.planets = planets;
  }
  
  private getPlayerPlanetsCount(): number {
    return this.planets.filter(p => p.owner === 'player').length;
  }
  
  private getAIPlanetsCount(): number {
    return this.planets.filter(p => p.owner === 'ai').length;
  }
  
  // Top bar
  private topBar!: PIXI.Graphics;
  private planetsText!: PIXI.Text;
  private timerText!: PIXI.Text;
  
  // Sun HP display
  private sunHPContainer!: PIXI.Container;
  private sunHPBar!: PIXI.Graphics;
  private sunHPText!: PIXI.Text;
  
  // Contextual message
  private contextMessage!: PIXI.Text;
  
  // Alerts
  private alertText!: PIXI.Text;
  private alertTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Internal references (for dynamic updates)
  private planetsContainer!: PIXI.Container;
  private hpBarWidth!: number;
  private sunSecondaryText!: PIXI.Text | null;
  
  // State
  private lastPlayerPlanets: number = 0;
  private lastMajorityAlert: boolean = false;
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    
    this.createTopBar();
    this.createSunHPDisplay();
    this.createContextMessage();
    this.createAlert();
  }
  
  private createTopBar() {
    const { COLORS, TYPOGRAPHY, SIZES, SPACING, RESPONSIVE } = UI_CONSTANTS;
    const screenWidth = this.app.screen.width;
    
    // Background bar (plus opaque pour meilleur contraste)
    this.topBar = new PIXI.Graphics();
    this.topBar.beginFill(COLORS.UI_BACKGROUND, 0.95); // Plus opaque pour meilleur contraste
    this.topBar.drawRect(0, 0, this.app.screen.width, SIZES.TOP_BAR_HEIGHT);
    this.topBar.endFill();
    this.container.addChild(this.topBar);
    
    // Planets count - LUMINOUS ABSTRACT: Floating text, no boxes
    const planetsFontSize = LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_LARGE; // 32px - mobile first
    const planetsStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: planetsFontSize,
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT, // Blanc pur
      fontWeight: 'bold',
      // Pas de dropShadow - radical minimalism
    });
    
    // Créer un container pour planètes avec formes
    const planetsContainer = new PIXI.Container();
    planetsContainer.x = SPACING.MEDIUM;
    planetsContainer.y = SPACING.MEDIUM;
    
    // LUMINOUS ABSTRACT: Luminous shapes, no borders
    const shapeRadius = RESPONSIVE.getValue(8, 9, 10, screenWidth);
    const playerShape = new PIXI.Graphics();
    playerShape.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 1.0); // Electric Mint, opacité complète
    playerShape.drawCircle(0, 0, shapeRadius);
    playerShape.endFill();
    // Pas de bordure - radical minimalism
    playerShape.x = 0;
    playerShape.y = 0;
    planetsContainer.addChild(playerShape);
    
    // Texte planètes
    this.planetsText = new PIXI.Text('1 | 1', planetsStyle);
    this.planetsText.x = 20;
    this.planetsText.y = -16;
    planetsContainer.addChild(this.planetsText);
    
    // Forme IA - Luminous
    const aiShape = new PIXI.Graphics();
    aiShape.beginFill(LUMINOUS_STYLE.COLORS.AI, 1.0); // Magenta, opacité complète
    aiShape.drawCircle(0, 0, shapeRadius);
    aiShape.endFill();
    // Pas de bordure - radical minimalism
    aiShape.x = this.planetsText.x + this.planetsText.width + 10;
    aiShape.y = 0;
    planetsContainer.addChild(aiShape);
    
    this.container.addChild(planetsContainer);
    // Stocker la référence pour mise à jour
    this.planetsContainer = planetsContainer;
    
    // Timer - TOP of vertical stack (centered)
    const timerFontSize = LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_LARGE + 4; // 36px - très visible
    const timerStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: timerFontSize,
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT, // Blanc pur
      fontWeight: 'bold',
      // Pas de stroke, pas de dropShadow - radical minimalism
    });
    
    this.timerText = new PIXI.Text('2:00', timerStyle);
    this.timerText.x = this.app.screen.width / 2;
    this.timerText.y = SPACING.SMALL + 5; // Top of stack with small padding
    this.timerText.anchor.set(0.5, 0);
    this.container.addChild(this.timerText);
  }
  
  private createSunHPDisplay() {
    const { COLORS, TYPOGRAPHY, SPACING, RESPONSIVE } = UI_CONSTANTS;
    const screenWidth = this.app.screen.width;
    const isMobile = RESPONSIVE.isMobile(screenWidth);
    
    this.sunHPContainer = new PIXI.Container();
    this.sunHPContainer.x = this.app.screen.width / 2;
    // MIDDLE of vertical stack: Position below Timer with fixed spacing
    const timerBottom = this.timerText.y + this.timerText.height;
    const verticalGap = isMobile ? 15 : 20; // Fixed spacing between Timer and Sun HP
    this.sunHPContainer.y = timerBottom + verticalGap;
    this.container.addChild(this.sunHPContainer);
    
    // LUMINOUS ABSTRACT: No background box - just the bar itself
    const hpBarWidth = RESPONSIVE.getValue(150, 165, 180, screenWidth);
    // Pas de background - radical minimalism
    // Stocker largeur pour update()
    this.hpBarWidth = hpBarWidth;
    
    // HP Bar
    this.sunHPBar = new PIXI.Graphics();
    this.sunHPContainer.addChild(this.sunHPBar);
    
    // HP Text - Ligne principale (HP)
    const hpFontSize = TYPOGRAPHY.getLargeSize(screenWidth);
    this.sunHPText = new PIXI.Text('Soleil HP: 3/3', {
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: hpFontSize, // Responsive
      fill: COLORS.TEXT_PRIMARY,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 2
    });
    this.sunHPText.anchor.set(0.5);
    this.sunHPText.y = SPACING.SMALL;
    this.sunHPContainer.addChild(this.sunHPText);
    
    // Texte secondaire (coût/cooldown) - créé dans update() si nécessaire
    this.sunSecondaryText = null;
  }
  
  private createContextMessage() {
    const { TYPOGRAPHY } = UI_CONSTANTS;
    
    // LUMINOUS ABSTRACT: No background box - floating text only
    // Pas de messageBg - radical minimalism
    
    this.contextMessage = new PIXI.Text('', {
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL, // 18px
      fill: LUMINOUS_STYLE.COLORS.UI_WARNING, // Orange pour warnings
      fontWeight: 'bold',
      // Pas de dropShadow - radical minimalism
    });
    this.contextMessage.x = this.app.screen.width / 2;
    // BOTTOM of vertical stack: Position below Sun HP with fixed spacing
    // Will be calculated dynamically in update() based on actual Sun HP container height
    this.contextMessage.y = 0; // Will be set in update()
    this.contextMessage.anchor.set(0.5, 0);
    this.contextMessage.visible = false;
    this.container.addChild(this.contextMessage);
  }
  
  private createAlert() {
    const { TYPOGRAPHY } = UI_CONSTANTS;
    
    // LUMINOUS ABSTRACT: Floating text, no dropShadow
    const alertStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_LARGE, // 32px
      fill: LUMINOUS_STYLE.COLORS.UI_DANGER, // Red/Magenta for errors
      fontWeight: 'bold',
      // Pas de dropShadow - radical minimalism
    });
    
    this.alertText = new PIXI.Text('', alertStyle);
    this.alertText.x = this.app.screen.width / 2;
    // Position calculée dynamiquement dans update() - below context message with fixed spacing
    this.alertText.y = 0; // Sera calculé dynamiquement dans update()
    this.alertText.anchor.set(0.5, 0);
    this.alertText.visible = false;
    this.container.addChild(this.alertText);
  }
  
  public update() {
    const state = useGameStore.getState();
    const playerPlanets = this.getPlayerPlanetsCount();
    const aiPlanets = this.getAIPlanetsCount();
    
    // Update planets count
    if (this.planetsContainer && this.planetsText) {
      this.planetsText.text = `${playerPlanets} | ${aiPlanets}`;
      // Repositionner la forme IA
      const aiShape = this.planetsContainer.children[2] as PIXI.Graphics;
      if (aiShape) {
        aiShape.x = this.planetsText.x + this.planetsText.width + 10;
      }
    }
    
    // Pulse si planètes augmentent
    if (playerPlanets > this.lastPlayerPlanets) {
      if (this.planetsContainer) {
        AnimationHelper.pulseScale(this.planetsContainer, 1.15, 0.1);
      }
    }
    this.lastPlayerPlanets = playerPlanets;
    
    // Timer
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    this.timerText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const { COLORS, SIZES, SPACING } = UI_CONSTANTS;
    if (state.timer <= 30) {
      this.timerText.style.fill = COLORS.TEXT_DANGER;
    } else if (state.timer <= 60) {
      this.timerText.style.fill = COLORS.TEXT_WARNING;
    } else {
      this.timerText.style.fill = COLORS.TEXT_PRIMARY;
    }
    
    // Sun HP - Vertical stack layout: Text on top, Bar below
    const hpPercent = state.sunHP / GAME_CONFIG.SUN_MAX_HP;
    const hpBarWidth = this.hpBarWidth || SIZES.HP_BAR_WIDTH;
    const barHeight = SIZES.HP_BAR_HEIGHT;
    const screenWidth = this.app.screen.width;
    const { TYPOGRAPHY, RESPONSIVE } = UI_CONSTANTS;
    const isMobile = RESPONSIVE.isMobile(screenWidth);
    
    // Ligne 1 : HP Text (top of Sun HP container)
    const hpFontSize = TYPOGRAPHY.getLargeSize(screenWidth);
    this.sunHPText.style.fontSize = hpFontSize;
    this.sunHPText.text = `Soleil HP: ${state.sunHP}/${GAME_CONFIG.SUN_MAX_HP}`;
    this.sunHPText.y = 0; // Top of container
    
    // Ligne 2 : HP Bar (below text with fixed spacing)
    const textToBarGap = isMobile ? 8 : 10; // Fixed spacing between text and bar
    const barX = -hpBarWidth / 2;
    const barY = hpFontSize + textToBarGap;
    
    this.sunHPBar.clear();
    this.sunHPBar.beginFill(0x374151, 0.6);
    this.sunHPBar.drawRoundedRect(barX, barY, hpBarWidth, barHeight, SPACING.SMALL);
    this.sunHPBar.endFill();
    
    if (hpPercent > 0) {
      const hpColor = state.sunHP === 1 
        ? COLORS.HP_LOW 
        : (state.sunHP === 2 ? COLORS.HP_MEDIUM : COLORS.HP_FULL);
      this.sunHPBar.beginFill(hpColor);
      this.sunHPBar.drawRoundedRect(barX, barY, hpBarWidth * hpPercent, barHeight, SPACING.SMALL);
      this.sunHPBar.endFill();
    }
    
    // Ligne 3 : Coût/Cooldown (below bar, smaller)
    const majorityThreshold = getMajorityThreshold(state.gameMode);
    let secondaryText = '';
    let secondaryColor = COLORS.TEXT_SECONDARY;
    
    if (state.sunOwner === null && playerPlanets >= majorityThreshold) {
      const attackCost = state.getSunAttackCost();
      const cooldownSeconds = Math.ceil(state.sunAttackCooldown / 60);
      
      if (cooldownSeconds > 0) {
        secondaryText = `⏳ ${cooldownSeconds}s`;
        secondaryColor = COLORS.TEXT_WARNING;
      } else {
        secondaryText = `Coût: ${attackCost}`;
        if (attackCost > GAME_CONFIG.ATTACK_COST_BASE) {
          const overcharge = attackCost - GAME_CONFIG.ATTACK_COST_BASE;
          secondaryText += ` (+${overcharge}⚡)`;
        }
        secondaryColor = COLORS.TEXT_PRIMARY;
      }
    }
    
    // Créer ou mettre à jour texte secondaire
    const barToSecondaryGap = isMobile ? 5 : 6;
    if (!this.sunSecondaryText && secondaryText) {
      const secondaryStyle = new PIXI.TextStyle({
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontSize: TYPOGRAPHY.getSmallSize(screenWidth), // 14px sur desktop
        fill: secondaryColor,
        fontWeight: 'normal',
      });
      this.sunSecondaryText = new PIXI.Text(secondaryText, secondaryStyle);
      this.sunSecondaryText.anchor.set(0.5);
      this.sunSecondaryText.y = barY + barHeight + barToSecondaryGap;
      this.sunHPContainer.addChild(this.sunSecondaryText);
    } else if (this.sunSecondaryText) {
      if (secondaryText) {
        this.sunSecondaryText.text = secondaryText;
        this.sunSecondaryText.style.fill = secondaryColor;
        this.sunSecondaryText.y = barY + barHeight + barToSecondaryGap;
        this.sunSecondaryText.visible = true;
      } else {
        this.sunSecondaryText.visible = false;
      }
    }
    
    // Update Context Message position (below Sun HP container)
    const sunHPContainerBottom = this.sunHPContainer.y + (
      this.sunSecondaryText && this.sunSecondaryText.visible
        ? this.sunSecondaryText.y + this.sunSecondaryText.height
        : this.sunHPBar.y + SIZES.HP_BAR_HEIGHT
    );
    const contextMessageGap = isMobile ? 15 : 20; // Fixed spacing below Sun HP
    this.contextMessage.y = sunHPContainerBottom + contextMessageGap;
    
    // Contextual message - Version courte (max 40 caractères)
    if (playerPlanets >= majorityThreshold && state.sunOwner === null) {
      const cooldownSeconds = Math.ceil(state.sunAttackCooldown / 60);
      if (cooldownSeconds > 0) {
        this.contextMessage.text = `⏳ Cooldown: ${cooldownSeconds}s`;
      } else {
        this.contextMessage.text = '🌟 Attaque le Soleil !';
      }
      this.contextMessage.visible = true;
      this.contextMessage.style.fill = LUMINOUS_STYLE.COLORS.UI_WARNING;
      if (!this.lastMajorityAlert && cooldownSeconds === 0) {
        this.showAlert('✅ Majorité atteinte !');
        this.lastMajorityAlert = true;
      }
    } else if (aiPlanets >= majorityThreshold && state.sunOwner === null) {
      this.contextMessage.text = '⚠️ IA peut attaquer';
      this.contextMessage.visible = true;
      this.contextMessage.style.fill = LUMINOUS_STYLE.COLORS.UI_DANGER; // Magenta pour danger
    } else {
      // Messages courts uniquement si important
      if (state.sunHP === 1 && state.timer <= 30) {
        this.contextMessage.text = '⚠️ Dernière chance !';
        this.contextMessage.visible = true;
        this.contextMessage.style.fill = LUMINOUS_STYLE.COLORS.UI_DANGER;
      } else {
        this.contextMessage.visible = false;
      }
      this.lastMajorityAlert = false;
    }
    
    // Timer alerts
    if (state.timer === 60) {
      this.showAlert('⚠️ Plus que 60 secondes !');
    } else if (state.timer === 30) {
      this.showAlert('⚠️ DERNIÈRE LIGNE DROITE !');
    }
    
    // Positionner alerte dynamiquement - BOTTOM of vertical stack
    if (this.alertText.visible) {
      const alertGap = isMobile ? 15 : 20; // Fixed spacing below context message
      const alertY = this.contextMessage.visible 
        ? this.contextMessage.y + this.contextMessage.height + alertGap
        : sunHPContainerBottom + contextMessageGap + alertGap;
      
      // Vérifier qu'on ne dépasse pas l'écran
      const maxY = this.app.screen.height - 100; // Laisser espace pour footer
      this.alertText.y = Math.min(alertY, maxY);
    }
  }
  
  public showAlert(message: string) {
    this.alertText.text = message;
    this.alertText.visible = true;
    this.alertText.alpha = 1;
    
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    
    const ALERT_DURATION_MS = 2000; // 2 seconds
    this.alertTimeout = setTimeout(() => {
      let alpha = 1;
      const { ANIMATIONS } = UI_CONSTANTS;
      const fadeOut = () => {
        alpha -= ANIMATIONS.FADE_SPEED;
        this.alertText.alpha = alpha;
        if (alpha > 0) {
          requestAnimationFrame(fadeOut);
        } else {
          this.alertText.visible = false;
        }
      };
      fadeOut();
    }, ALERT_DURATION_MS);
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
}
