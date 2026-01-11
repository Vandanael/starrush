import * as PIXI from 'pixi.js';
import { useGameStore, Owner } from '../store/gameStore';
import { GAME_CONFIG } from '../config/GameConfig';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';

/**
 * Represents the central Sun that players must capture to win.
 * The Sun has HP that decreases when attacked. When HP reaches 0, ownership changes.
 * The Sun features a breathing animation that speeds up as the timer approaches zero.
 */
export class Sun {
  private container: PIXI.Container;
  private core: PIXI.Graphics;
  private glow: PIXI.Graphics;
  private attackableRing: PIXI.Graphics | null = null;
  private hpBar: PIXI.Graphics | null = null;
  private hpText: PIXI.Text | null = null;
  private pulsePhase: number = 0;
  private currentScale: number = 1.0; // For smooth breathing animation
  public hp: number = GAME_CONFIG.SUN_MAX_HP;
  public owner: Owner | null = null;
  public isAttackable: boolean = false;
  
  constructor(x: number, y: number) {
    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;
    
    // Glow (derrière)
    this.glow = new PIXI.Graphics();
    this.container.addChild(this.glow);
    
    // Core (devant)
    this.core = new PIXI.Graphics();
    this.container.addChild(this.core);
    
    // Anneau attaquable
    this.attackableRing = new PIXI.Graphics();
    this.attackableRing.visible = false;
    this.container.addChild(this.attackableRing);
    
    // Barre HP
    this.hpBar = new PIXI.Graphics();
    this.container.addChild(this.hpBar);
    
    // Texte HP - LUMINOUS ABSTRACT: Floating text, no stroke
    this.hpText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif',
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL, // 18px
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT, // Blanc pur
      fontWeight: 'bold',
      // Pas de stroke - radical minimalism
    });
    this.hpText.anchor.set(0.5);
    this.hpText.y = 110; // Plus bas
    this.container.addChild(this.hpText);
    
    this.draw();
  }
  
  private draw() {
    const gameState = useGameStore.getState();
    const timer = gameState.timer;
    
    // LUMINOUS ABSTRACT: Sun = Symbolic Source, flat circle
    let coreColor = LUMINOUS_STYLE.COLORS.SUN_CORE; // Warning Orange
    let glowColor = LUMINOUS_STYLE.COLORS.SUN_GLOW;
    
    // Si capturé, couleur du vainqueur (luminous)
    if (this.owner === 'player') {
      coreColor = LUMINOUS_STYLE.COLORS.PLAYER; // Electric Mint
      glowColor = LUMINOUS_STYLE.COLORS.PLAYER_BRIGHT;
    } else if (this.owner === 'ai') {
      coreColor = LUMINOUS_STYLE.COLORS.AI; // Magenta
      glowColor = LUMINOUS_STYLE.COLORS.AI_BRIGHT;
    } else {
      // Couleur selon HP (soleil mourant)
      if (this.hp === 1) {
        coreColor = LUMINOUS_STYLE.COLORS.SUN_DYING; // Rouge
        glowColor = 0xff2222;
      } else if (this.hp === 2) {
        coreColor = 0xff6600; // Orange plus foncé
        glowColor = 0xff4400;
      }
    }
    
    const baseRadius = LUMINOUS_STYLE.RENDERING.SUN_RADIUS; // 90px - symbolique
    
    // GAME FEEL: Breathing Sun - Dynamic pulse speed based on timer
    // As timer approaches 0, pulse faster (heartbeat effect)
    const maxTimer = 120; // 2 minutes default
    const timerProgress = Math.max(0, Math.min(1, (maxTimer - timer) / maxTimer)); // 0-1
    const basePulseSpeed = 0.02; // Slow breathing
    const urgentPulseSpeed = 0.08; // Fast heartbeat when urgent
    const pulseSpeed = basePulseSpeed + (urgentPulseSpeed - basePulseSpeed) * timerProgress;
    
    // Update pulse phase
    this.pulsePhase += pulseSpeed;
    
    // Breathing scale: 1.0 to 1.05 (subtle)
    const breathingScale = 1.0 + Math.sin(this.pulsePhase) * 0.05;
    this.currentScale = breathingScale;
    
    // Apply scale to container
    this.container.scale.set(this.currentScale);
    
    // Glow très subtil - LUMINOUS ABSTRACT: minimal glow (scaled with breathing)
    this.glow.clear();
    if (LUMINOUS_STYLE.RENDERING.SUN_NO_GLOW === false) {
      this.glow.beginFill(glowColor, LUMINOUS_STYLE.RENDERING.GLOW_INTENSITY); // 0.15 - très subtil
      this.glow.drawCircle(0, 0, baseRadius * 1.3 * this.currentScale); // Scaled with breathing
      this.glow.endFill();
    }
    
    // Core - LUMINOUS ABSTRACT: Perfect flat circle, no gradient, symbolic
    // Scale is applied to container, so baseRadius stays constant
    this.core.clear();
    this.core.beginFill(coreColor, 1.0); // Opacité complète pour luminosité maximale
    this.core.drawCircle(0, 0, baseRadius); // Base radius (scale applied to container)
    this.core.endFill();
    // Pas de stroke, pas de gradient - radical minimalism
    
    // LUMINOUS ABSTRACT: Minimal ring only if attackable (pas d'anneau lumineux complexe)
    if (this.attackableRing) {
      this.attackableRing.clear();
      if (this.isAttackable && this.owner === null) {
        // Ring très subtil - radical minimalism
        const ringAlpha = 0.4 + Math.sin(this.pulsePhase * 2) * 0.2; // Réduit
        this.attackableRing.lineStyle(2, LUMINOUS_STYLE.COLORS.SUN_CORE, ringAlpha); // Warning Orange
        this.attackableRing.drawCircle(0, 0, baseRadius * 1.15); // Plus proche du core
        this.attackableRing.visible = true;
      } else {
        this.attackableRing.visible = false;
      }
    }
    
    // Pas d'animation de régénération - radical minimalism
    
    // Barre HP
    if (this.hpBar && this.owner === null) {
      this.hpBar.clear();
      const barWidth = 200; // Plus large
      const barHeight = 12; // Plus haut
      const barX = -barWidth / 2;
      const barY = 90; // Plus bas pour éviter chevauchement
      
      // Background
      this.hpBar.beginFill(0x333333, 0.8);
      this.hpBar.drawRoundedRect(barX, barY, barWidth, barHeight, 4);
      this.hpBar.endFill();
      
      // HP fill
      const hpPercent = this.hp / GAME_CONFIG.SUN_MAX_HP;
      const fillWidth = barWidth * hpPercent;
      const hpColor = this.hp === 1 ? 0xef4444 : (this.hp === 2 ? 0xfbbf24 : 0x22c55e);
      this.hpBar.beginFill(hpColor);
      this.hpBar.drawRoundedRect(barX, barY, fillWidth, barHeight, 4);
      this.hpBar.endFill();
    }
    
    // Texte HP
    if (this.hpText) {
      if (this.owner === null) {
        this.hpText.text = `HP: ${this.hp}/${GAME_CONFIG.SUN_MAX_HP}`;
        this.hpText.visible = true;
      } else {
        this.hpText.visible = false;
      }
    }
  }
  
  public takeDamage(attacker: Owner): boolean {
    if (this.hp > 0 && this.owner === null) {
      this.hp--;
      useGameStore.getState().damageSun(attacker);
      
      if (this.hp === 0) {
        this.owner = attacker;
        useGameStore.getState().captureSun(attacker);
        return true; // Capturé
      }
      this.draw();
      return false; // Encore des HP
    }
    return false;
  }
  
  public setAttackable(canAttack: boolean) {
    this.isAttackable = canAttack;
    this.draw();
  }
  
  public getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }
  
  public update(_delta: number) {
    const storeState = useGameStore.getState();
    
    // Synchroniser HP avec le store
    this.hp = storeState.sunHP;
    this.owner = storeState.sunOwner;
    
    // GAME FEEL: Breathing Sun - pulse speed is handled in draw() based on timer
    // Update is called every frame, draw() handles the breathing animation
    this.draw();
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
}
