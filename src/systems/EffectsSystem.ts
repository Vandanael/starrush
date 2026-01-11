import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';

export class EffectsSystem {
  private app: PIXI.Application;
  private vignette: PIXI.Graphics;
  private flashOverlay: PIXI.Graphics;
  private isFlashing: boolean = false;
  
  constructor(app: PIXI.Application) {
    this.app = app;
    
    // Vignette rouge pour urgence
    this.vignette = new PIXI.Graphics();
    this.vignette.visible = false;
    this.drawVignette(0);
    app.stage.addChild(this.vignette);
    
    // Flash overlay
    this.flashOverlay = new PIXI.Graphics();
    this.flashOverlay.visible = false;
    app.stage.addChild(this.flashOverlay);
  }
  
  private drawVignette(intensity: number) {
    this.vignette.clear();
    
    if (intensity <= 0) {
      this.vignette.visible = false;
      return;
    }
    
    this.vignette.visible = true;
    
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    
    // Gradient circulaire simulé avec plusieurs rectangles
    for (let i = 0; i < 20; i++) {
      const alpha = (intensity * 0.02) * (i / 20);
      this.vignette.beginFill(0xff0000, alpha);
      this.vignette.drawRect(0, 0, width, height);
      this.vignette.endFill();
    }
    
    // Bordures plus intenses
    const borderSize = 50;
    this.vignette.beginFill(0xff0000, intensity * 0.15);
    this.vignette.drawRect(0, 0, width, borderSize); // Top
    this.vignette.drawRect(0, height - borderSize, width, borderSize); // Bottom
    this.vignette.drawRect(0, 0, borderSize, height); // Left
    this.vignette.drawRect(width - borderSize, 0, borderSize, height); // Right
    this.vignette.endFill();
  }
  
  public update() {
    const state = useGameStore.getState();
    const timer = state.timer;
    
    // Vignette rouge si timer < 30s
    if (timer <= 30 && timer > 0) {
      const intensity = 1 - (timer / 30);
      this.drawVignette(intensity);
    } else {
      this.vignette.visible = false;
    }
  }
  
  public screenShake(intensity: number = 10, duration: number = 0.3) {
    const stage = this.app.stage;
    const originalX = stage.x;
    const originalY = stage.y;
    
    const startTime = Date.now();
    
    const shake = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (elapsed < duration) {
        const factor = 1 - (elapsed / duration); // Diminue avec le temps
        stage.x = originalX + (Math.random() - 0.5) * intensity * factor;
        stage.y = originalY + (Math.random() - 0.5) * intensity * factor;
        requestAnimationFrame(shake);
      } else {
        stage.x = originalX;
        stage.y = originalY;
      }
    };
    
    shake();
  }
  
  public flash(color: number = 0xffffff, _duration: number = 0.2) {
    if (this.isFlashing) return;
    
    this.isFlashing = true;
    this.flashOverlay.clear();
    this.flashOverlay.beginFill(color, 0.5);
    this.flashOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.flashOverlay.endFill();
    this.flashOverlay.visible = true;
    
    let alpha = 0.5;
    const fadeOut = () => {
      alpha -= 0.05;
      this.flashOverlay.alpha = alpha;
      
      if (alpha > 0) {
        requestAnimationFrame(fadeOut);
      } else {
        this.flashOverlay.visible = false;
        this.flashOverlay.alpha = 1;
        this.isFlashing = false;
      }
    };
    
    fadeOut();
  }
  
  public bringToFront() {
    // S'assurer que les overlays sont au-dessus
    this.app.stage.setChildIndex(this.vignette, this.app.stage.children.length - 1);
    this.app.stage.setChildIndex(this.flashOverlay, this.app.stage.children.length - 1);
  }
}
