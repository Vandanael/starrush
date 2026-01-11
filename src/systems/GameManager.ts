import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { GameStateManager, GameState } from './GameState';
import { ScoreManager } from '../utils/ScoreManager';
import { Planet } from '../entities/Planet';
import { UI_CONSTANTS } from '../config/UIConstants';
import { TIME_ATTACK_MODES } from '../config/GameConfig';

/**
 * Manages game state, win/loss conditions, and end screen display.
 * Handles victory/defeat logic, score calculation, and game over UI.
 */
export class GameManager {
  private app: PIXI.Application;
  private gameOver: boolean = false;
  private endScreen: PIXI.Container | null = null;
  private gameStateManager: GameStateManager;
  private planets: Planet[] = [];
  
  constructor(app: PIXI.Application, gameStateManager: GameStateManager) {
    this.app = app;
    this.gameStateManager = gameStateManager;
  }
  
  /**
   * Sets the planets array for win condition checking.
   * @param planets - Array of all planets in the game
   */
  public setPlanets(planets: Planet[]) {
    this.planets = planets;
  }
  
  /**
   * Checks if the game has ended (victory, defeat, or timeout).
   * @returns true if the game is over, false otherwise
   */
  public checkWinCondition(): boolean {
    if (this.gameOver) return true;
    
    const state = useGameStore.getState();
    
    // Victoire joueur : Soleil capturé
    if (state.sunOwner === 'player') {
      // Enregistrer temps de capture pour Time Attack
      if (state.gameMode === 'timeattack' && state.timeAttackMode) {
        const elapsed = TIME_ATTACK_MODES[state.timeAttackMode] - state.timer;
        state.captureTime = elapsed;
      }
      this.showVictory();
      return true;
    }
    
    // Défaite : IA a capturé le Soleil
    if (state.sunOwner === 'ai') {
      this.showDefeat('ai_won');
      return true;
    }
    
    // Timer = 0 : celui avec le plus de planètes gagne
    if (state.timer <= 0) {
      const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
      const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
      
      if (playerPlanets > aiPlanets) {
        this.showVictory();
      } else {
        this.showDefeat('timer');
      }
      return true;
    }
    
    return false;
  }
  
  private showDefeat(reason: 'ai_won' | 'timer' = 'timer') {
    this.gameOver = true;
    this.showEndScreen(false, reason);
  }
  
  private showEndScreen(isVictory: boolean, defeatReason?: 'ai_won' | 'timer') {
    const { COLORS, TYPOGRAPHY, RESPONSIVE } = UI_CONSTANTS;
    
    // Nettoyer l'ancien écran si existe
    if (this.endScreen) {
      this.app.stage.removeChild(this.endScreen);
    }
    
    // Overlay avec fond semi-transparent plus sombre pour meilleure lisibilité
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.85); // Fond noir plus opaque
    overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    overlay.endFill();
    
    this.endScreen = new PIXI.Container();
    this.endScreen.addChild(overlay);
    
    // Container vertical centralisé pour tous les éléments
    const contentContainer = new PIXI.Container();
    contentContainer.x = this.app.screen.width / 2;
    contentContainer.y = this.app.screen.height / 2;
    this.endScreen.addChild(contentContainer);
    
    const state = useGameStore.getState();
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Espacements fixes pour la pile verticale
    const isMobile = RESPONSIVE.isMobile(this.app.screen.width);
    const LARGE_GAP = isMobile ? 40 : 50; // Espacement entre blocs principaux
    
    let currentY = 0; // Position courante dans le container vertical
    
    // BLOCK 1: Titre (Top)
    let titleText = isVictory ? '✅ VICTOIRE !' : '❌ DÉFAITE';
    if (!isVictory && defeatReason === 'ai_won') {
      titleText = '❌ L\'IA A GAGNÉ !';
    }
    const titleColor = isVictory ? COLORS.PLAYER_PRIMARY : COLORS.AI_PRIMARY;
    
    const title = new PIXI.Text(titleText, {
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: isMobile ? 48 : 64,
      fill: titleColor,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 10,
      dropShadowDistance: 2,
      align: 'center'
    });
    title.anchor.set(0.5, 0.5);
    title.y = currentY;
    contentContainer.addChild(title);
    currentY += title.height / 2 + LARGE_GAP; // Espacement après le titre
    
    // Compter les planètes
    const playerPlanets = this.planets.filter(p => p.owner === 'player').length;
    const aiPlanets = this.planets.filter(p => p.owner === 'ai').length;
    
    // Calculer le score (utiliser planètes au lieu de segments)
    const gameScore = ScoreManager.calculateScore(
      playerPlanets,
      state.timer,
      state.planetsConquered,
      state.attacksLaunched,
      isVictory
    );
    
    const isNewRecord = ScoreManager.saveBestScore(gameScore.total);
    const bestScore = ScoreManager.getBestScore();
    
    // BLOCK 2: Score principal
    const scoreStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: isMobile ? 28 : 36,
      fill: isNewRecord ? COLORS.TEXT_WARNING : COLORS.TEXT_PRIMARY,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 5,
      dropShadowDistance: 1
    });
    
    const scoreText = new PIXI.Text(
      `SCORE ${ScoreManager.formatScore(gameScore.total)}`,
      scoreStyle
    );
    scoreText.anchor.set(0.5, 0.5);
    scoreText.y = currentY;
    contentContainer.addChild(scoreText);
    currentY += scoreText.height / 2 + (isMobile ? 25 : 30);
    
    // Nouveau record ou meilleur score
    if (isNewRecord) {
      const recordStyle = new PIXI.TextStyle({
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontSize: isMobile ? TYPOGRAPHY.NORMAL_SIZE : TYPOGRAPHY.MEDIUM_SIZE,
        fill: COLORS.TEXT_WARNING,
        fontWeight: 'bold',
        align: 'center',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 3
      });
      
      const recordText = new PIXI.Text('⭐ NOUVEAU RECORD ! ⭐', recordStyle);
      recordText.anchor.set(0.5, 0.5);
      recordText.y = currentY;
      contentContainer.addChild(recordText);
      currentY += recordText.height / 2 + LARGE_GAP;
    } else if (bestScore > 0) {
      const bestStyle = new PIXI.TextStyle({
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontSize: TYPOGRAPHY.NORMAL_SIZE,
        fill: COLORS.TEXT_SECONDARY,
        align: 'center'
      });
      
      let bestTextContent = `Meilleur: ${ScoreManager.formatScore(bestScore)}`;
      if (!isVictory && bestScore > 0) {
        bestTextContent += ' | Continue à progresser ! 💪';
      }
      
      const bestText = new PIXI.Text(bestTextContent, bestStyle);
      bestText.anchor.set(0.5, 0.5);
      bestText.y = currentY;
      contentContainer.addChild(bestText);
      currentY += bestText.height / 2 + LARGE_GAP;
    } else {
      currentY += LARGE_GAP; // Espacement même sans meilleur score
    }
    
    // BLOCK 3: Stats détaillées (groupe)
    const statsStyle = new PIXI.TextStyle({
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: TYPOGRAPHY.NORMAL_SIZE,
      fill: COLORS.TEXT_SECONDARY,
      align: 'center'
    });
    
    // Planètes
    const planetsText = new PIXI.Text(
      `Planètes: ${playerPlanets} vs ${aiPlanets}`,
      statsStyle
    );
    planetsText.anchor.set(0.5, 0.5);
    planetsText.y = currentY;
    contentContainer.addChild(planetsText);
    currentY += planetsText.height / 2 + (isMobile ? 15 : 20);
    
    // Temps
    const timeTextElement = new PIXI.Text(
      `Temps: ${timeText}`,
      statsStyle
    );
    timeTextElement.anchor.set(0.5, 0.5);
    timeTextElement.y = currentY;
    contentContainer.addChild(timeTextElement);
    currentY += timeTextElement.height / 2 + (isMobile ? 15 : 20);
    
    // Actions (layout adaptatif)
    if (isMobile) {
      // Layout vertical sur mobile
      const attacksText = new PIXI.Text(`Attaques: ${state.attacksLaunched}`, statsStyle);
      attacksText.anchor.set(0.5, 0.5);
      attacksText.y = currentY;
      contentContainer.addChild(attacksText);
      currentY += attacksText.height / 2 + (isMobile ? 15 : 20);
      
      const conquestsText = new PIXI.Text(`Conquêtes: ${state.planetsConquered}`, statsStyle);
      conquestsText.anchor.set(0.5, 0.5);
      conquestsText.y = currentY;
      contentContainer.addChild(conquestsText);
      currentY += conquestsText.height / 2 + (isMobile ? 15 : 20);
    } else {
      // Layout horizontal sur desktop
      const actionsText = new PIXI.Text(
        `Attaques: ${state.attacksLaunched} | Conquêtes: ${state.planetsConquered}`,
        statsStyle
      );
      actionsText.anchor.set(0.5, 0.5);
      actionsText.y = currentY;
      contentContainer.addChild(actionsText);
      currentY += actionsText.height / 2 + (isMobile ? 15 : 20);
    }
    
    // Temps de capture Time Attack (si applicable)
    if (state.gameMode === 'timeattack' && isVictory && state.captureTime > 0) {
      const captureMinutes = Math.floor(state.captureTime / 60);
      const captureSeconds = state.captureTime % 60;
      const captureText = new PIXI.Text(
        `⏱️ Temps de capture: ${captureMinutes}:${captureSeconds.toString().padStart(2, '0')}`,
        statsStyle
      );
      captureText.anchor.set(0.5, 0.5);
      captureText.y = currentY;
      contentContainer.addChild(captureText);
      currentY += captureText.height / 2 + LARGE_GAP;
      this.updateTimeAttackLeaderboard(state.timeAttackMode!, state.captureTime);
    } else {
      currentY += LARGE_GAP; // Espacement avant le bouton
    }
    
    // BLOCK 4: Bouton Rejouer (Bottom)
    const replayButton = this.createReplayButton();
    replayButton.y = currentY;
    contentContainer.addChild(replayButton);
    
    // Ajuster le container pour centrer verticalement (basé sur la hauteur totale)
    const totalHeight = currentY + replayButton.height / 2;
    contentContainer.y = this.app.screen.height / 2 - totalHeight / 2 + (title.height / 2);
    
    // Animation cinématique d'entrée (améliorée)
    this.endScreen.alpha = 0;
    this.endScreen.scale.set(0.9);
    
    // Effet de particules pour victoire/défaite
    if (isVictory) {
      // Particules de victoire (étoiles dorées)
      for (let i = 0; i < 20; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xfbbf24, 0.8);
        particle.drawCircle(0, 0, 3);
        particle.endFill();
        particle.x = Math.random() * this.app.screen.width;
        particle.y = Math.random() * this.app.screen.height;
        this.endScreen.addChild(particle);
        
        // Animation de particule
        const animateParticle = () => {
          particle.y -= 2;
          particle.alpha -= 0.02;
          if (particle.alpha > 0) {
            requestAnimationFrame(animateParticle);
          } else {
            this.endScreen!.removeChild(particle);
          }
        };
        setTimeout(() => animateParticle(), i * 50);
      }
    }
    
    // Animation d'entrée fluide
    let alpha = 0;
    let scale = 0.9;
    const animateIn = () => {
      alpha += 0.1;
      scale += 0.01;
      this.endScreen!.alpha = Math.min(1, alpha);
      this.endScreen!.scale.set(Math.min(1, scale));
      if (alpha < 1 || scale < 1) {
        requestAnimationFrame(animateIn);
      }
    };
    animateIn();
    
    this.app.stage.addChild(this.endScreen);
    
    // Logger.log(isVictory ? '🎉 VICTOIRE !' : '💀 DÉFAITE'); // Géré par l'UI
  }
  
  private createReplayButton(): PIXI.Container {
    const buttonContainer = new PIXI.Container();
    // Le bouton sera positionné par le parent (contentContainer)
    
    const { COLORS, TYPOGRAPHY, SIZES } = UI_CONSTANTS;
    
    // Background
    const buttonBg = new PIXI.Graphics();
    buttonBg.beginFill(COLORS.PLAYER_SECONDARY);
    buttonBg.drawRoundedRect(-100, -SIZES.BUTTON_HEIGHT / 2, 200, SIZES.BUTTON_HEIGHT, SIZES.BUTTON_PADDING);
    buttonBg.endFill();
    buttonContainer.addChild(buttonBg);
    
    // Texte
    const buttonText = new PIXI.Text('Rejouer', {
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontSize: TYPOGRAPHY.MEDIUM_SIZE,
      fill: COLORS.TEXT_PRIMARY,
      fontWeight: 'bold'
    });
    buttonText.anchor.set(0.5);
    buttonContainer.addChild(buttonText);
    
    // Le bouton est centré par défaut (x=0, y=0 dans contentContainer)
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    // Hover
    buttonContainer.on('pointerenter', () => {
      buttonContainer.scale.set(1.05);
      buttonBg.clear();
      buttonBg.beginFill(COLORS.PLAYER_PRIMARY);
      buttonBg.drawRoundedRect(-100, -SIZES.BUTTON_HEIGHT / 2, 200, SIZES.BUTTON_HEIGHT, SIZES.BUTTON_PADDING);
      buttonBg.endFill();
    });
    
    buttonContainer.on('pointerleave', () => {
      buttonContainer.scale.set(1.0);
      buttonBg.clear();
      buttonBg.beginFill(COLORS.PLAYER_SECONDARY);
      buttonBg.drawRoundedRect(-100, -SIZES.BUTTON_HEIGHT / 2, 200, SIZES.BUTTON_HEIGHT, SIZES.BUTTON_PADDING);
      buttonBg.endFill();
    });
    
    // Press
    buttonContainer.on('pointerdown', () => {
      buttonContainer.scale.set(0.95);
    });
    
    // Rejouer
    buttonContainer.on('pointerup', () => {
      buttonContainer.scale.set(1.05);
      this.restartGame();
    });
    
    return buttonContainer;
  }
  
  private restartGame() {
    // Reset le store
    const state = useGameStore.getState();
    state.resetGame();
    
    // Retour à l'écran de start
    this.gameStateManager.setState(GameState.START_SCREEN);
    
    // Nettoyer l'écran de fin
    if (this.endScreen) {
      this.app.stage.removeChild(this.endScreen);
      this.endScreen = null;
    }
    
    this.gameOver = false;
  }
  
  private showVictory() {
    this.gameOver = true;
    this.showEndScreen(true);
  }
  
  public isGameOver(): boolean {
    return this.gameOver;
  }
  
  private updateTimeAttackLeaderboard(mode: string, time: number): void {
    try {
      const key = `starrush_timeattack_${mode}`;
      const stored = localStorage.getItem(key);
      const bestTime = stored ? parseInt(stored, 10) : Infinity;
      
      if (time < bestTime) {
        localStorage.setItem(key, time.toString());
      }
    } catch {
      // Ignore
    }
  }
  
  public static getTimeAttackBestTime(mode: string): number | null {
    try {
      const key = `starrush_timeattack_${mode}`;
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }
}
