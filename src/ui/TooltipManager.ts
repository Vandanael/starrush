import * as PIXI from 'pixi.js';
import { Planet } from '../entities/Planet';
import { UI_CONSTANTS } from '../config/UIConstants';
import { GAME_CONFIG } from '../config/GameConfig';

export class TooltipManager {
  private container: PIXI.Container;
  private app: PIXI.Application;
  private currentTooltip: PIXI.Container | null = null;
  private isFirstTime: boolean = true;
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.zIndex = 1000; // Au-dessus de tout
    
    // Vérifier si c'est la première fois
    try {
      const hasPlayed = localStorage.getItem('starrush_has_played');
      this.isFirstTime = !hasPlayed;
    } catch {
      this.isFirstTime = true;
    }
  }
  
  public showCostExplanation(source: Planet, target: Planet, cost: number): void {
    // Supprimer tooltip précédent
    this.hideTooltip();
    
    const { COLORS, TYPOGRAPHY } = UI_CONSTANTS;
    
    // Calculer position (entre source et target)
    const sourcePos = source.getPosition();
    const targetPos = target.getPosition();
    let midX = (sourcePos.x + targetPos.x) / 2;
    let midY = (sourcePos.y + targetPos.y) / 2 - 30;
    
    // Vérification limites écran avec padding de sécurité (20px)
    const padding = 20;
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Ajuster position si trop proche des bords
    if (midX < padding) {
      midX = sourcePos.x + padding; // Positionner à droite de la source
    } else if (midX > screenWidth - padding) {
      midX = targetPos.x - padding; // Positionner à gauche de la cible
    }
    
    if (midY < padding) {
      midY = Math.min(sourcePos.y, targetPos.y) + padding + 30; // Positionner en dessous
    } else if (midY > screenHeight - padding) {
      midY = Math.max(sourcePos.y, targetPos.y) - padding - 30; // Positionner au-dessus
    }
    
    // Container tooltip
    const tooltip = new PIXI.Container();
    tooltip.x = midX;
    tooltip.y = midY;
    
    // Calculer détails du coût
    const baseCost = GAME_CONFIG.ATTACK_COST_BASE;
    const distance = Math.sqrt(
      Math.pow(targetPos.x - sourcePos.x, 2) + 
      Math.pow(targetPos.y - sourcePos.y, 2)
    );
    const distanceCost = Math.floor(distance * GAME_CONFIG.ATTACK_COST_DISTANCE_MULTIPLIER);
    const typeModifier = cost - baseCost - distanceCost;
    
    // Version courte par défaut
    const shortText = `Coût: ${cost}`;
    
    // Version détaillée (affichée après 1 seconde)
    let detailsText = '';
    if (distanceCost > 0 || typeModifier !== 0) {
      detailsText = `Base: ${baseCost}`;
      if (distanceCost > 0) detailsText += ` + Distance: ${distanceCost}`;
      if (typeModifier > 0) detailsText += ` + Type: +${typeModifier}`;
      if (typeModifier < 0) detailsText += ` + Type: ${typeModifier}`;
    }
    
    // Texte principal (version courte)
    const textStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: TYPOGRAPHY.NORMAL_SIZE,
      fill: COLORS.TEXT_PRIMARY,
      fontWeight: 'bold',
      align: 'center'
    });
    
    const text = new PIXI.Text(shortText, textStyle);
    text.anchor.set(0.5);
    text.y = 0;
    tooltip.addChild(text);
    
    // Texte détails (masqué initialement)
    let detailsTextElement: PIXI.Text | null = null;
    if (detailsText) {
      const detailsStyle = new PIXI.TextStyle({
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontSize: TYPOGRAPHY.SMALL_SIZE,
        fill: COLORS.TEXT_SECONDARY,
        align: 'center'
      });
      detailsTextElement = new PIXI.Text(detailsText, detailsStyle);
      detailsTextElement.anchor.set(0.5);
      detailsTextElement.y = text.height + 4;
      detailsTextElement.visible = false;
      tooltip.addChild(detailsTextElement);
    }
    
    // Background (ajusté selon contenu)
    const bgWidth = Math.max(160, text.width + 20);
    const bgHeight = detailsTextElement ? text.height + detailsTextElement.height + 16 : text.height + 16;
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.UI_BACKGROUND, 0.95);
    bg.drawRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    bg.endFill();
    bg.lineStyle(2, COLORS.PLAYER_PRIMARY, 1);
    bg.drawRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    tooltip.addChildAt(bg, 0); // Mettre en arrière-plan
    
    // Afficher détails après 1 seconde
    if (detailsTextElement) {
      setTimeout(() => {
        if (detailsTextElement && tooltip.parent) {
          detailsTextElement.visible = true;
        }
      }, 1000);
    }
    
    this.container.addChild(tooltip);
    this.currentTooltip = tooltip;
    
    // Auto-hide après 3 secondes
    setTimeout(() => {
      this.hideTooltip();
    }, 3000);
  }
  
  public showFirstTimeTutorial(): void {
    if (!this.isFirstTime) return;
    
    // Marquer comme joué
    try {
      localStorage.setItem('starrush_has_played', 'true');
    } catch {
      // Ignore
    }
    
    const { COLORS, TYPOGRAPHY } = UI_CONSTANTS;
    
    // Créer overlay tutoriel
    const tutorialOverlay = new PIXI.Graphics();
    tutorialOverlay.beginFill(0x000000, 0.7);
    tutorialOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    tutorialOverlay.endFill();
    tutorialOverlay.eventMode = 'static';
    tutorialOverlay.cursor = 'pointer';
    this.container.addChild(tutorialOverlay);
    
    // Container tutoriel
    const tutorial = new PIXI.Container();
    tutorial.x = this.app.screen.width / 2;
    tutorial.y = this.app.screen.height / 2;
    
    // Background responsive
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const tutorialWidth = Math.min(600, screenWidth - 40); // 40px padding
    const tutorialHeight = Math.min(300, screenHeight - 80); // 80px padding vertical
    
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.UI_BACKGROUND, 0.95);
    bg.drawRoundedRect(-tutorialWidth / 2, -tutorialHeight / 2, tutorialWidth, tutorialHeight, 12);
    bg.endFill();
    bg.lineStyle(3, COLORS.PLAYER_PRIMARY, 1);
    bg.drawRoundedRect(-tutorialWidth / 2, -tutorialHeight / 2, tutorialWidth, tutorialHeight, 12);
    tutorial.addChild(bg);
    
    // Titre
    const titleStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: TYPOGRAPHY.LARGE_SIZE,
      fill: COLORS.PLAYER_PRIMARY,
      fontWeight: 'bold'
    });
    
    const title = new PIXI.Text('Bienvenue dans STAR RUSH !', titleStyle);
    title.anchor.set(0.5);
    title.y = -120;
    tutorial.addChild(title);
    
    // Instructions - Responsive
    const instructionFontSize = TYPOGRAPHY.getMediumSize(screenWidth);
    const wordWrapWidth = tutorialWidth - 50; // Padding interne
    const instructionStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: instructionFontSize,
      fill: COLORS.TEXT_PRIMARY,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: wordWrapWidth
    });
    
    const instructions = new PIXI.Text(
      '• Clique sur une planète ennemie pour l\'attaquer\n' +
      '• Le jeu choisit automatiquement la meilleure planète\n' +
      '• Le coût dépend de la distance et du type de planète\n' +
      '• Avec 5+ planètes (4+ en mode Rapide), tu peux attaquer le Soleil\n' +
      '• Double-clic sur ta planète pour la défendre\n' +
      '• Premier à capturer le Soleil GAGNE !',
      instructionStyle
    );
    instructions.anchor.set(0.5);
    instructions.y = -20;
    tutorial.addChild(instructions);
    
    // Bouton "Commencer"
    const buttonBg = new PIXI.Graphics();
    buttonBg.beginFill(COLORS.PLAYER_PRIMARY);
    buttonBg.drawRoundedRect(-60, 80, 120, 40, 8);
    buttonBg.endFill();
    tutorial.addChild(buttonBg);
    
    const buttonText = new PIXI.Text('Commencer', {
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: TYPOGRAPHY.MEDIUM_SIZE,
      fill: COLORS.TEXT_PRIMARY,
      fontWeight: 'bold'
    });
    buttonText.anchor.set(0.5);
    buttonText.y = 100;
    tutorial.addChild(buttonText);
    
    buttonBg.eventMode = 'static';
    buttonBg.cursor = 'pointer';
    buttonBg.on('pointerdown', () => {
      this.container.removeChild(tutorialOverlay);
      this.container.removeChild(tutorial);
    });
    
    this.container.addChild(tutorial);
  }
  
  public hideTooltip(): void {
    if (this.currentTooltip) {
      this.container.removeChild(this.currentTooltip);
      this.currentTooltip = null;
    }
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
  
  public shouldShowTutorial(): boolean {
    return this.isFirstTime;
  }
}
