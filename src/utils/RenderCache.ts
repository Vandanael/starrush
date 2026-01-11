/**
 * Render Cache for Static/Semi-Static Assets
 * 
 * Pre-renders complex graphics to RenderTextures to avoid redrawing every frame.
 * This significantly improves performance on mobile devices.
 * 
 * Usage:
 *   const cache = new RenderCache(app);
 *   const planetTexture = cache.getPlanetTexture('player', radius);
 *   // Use texture in sprite instead of drawing graphics every frame
 */
import * as PIXI from 'pixi.js';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';

export class RenderCache {
  private app: PIXI.Application;
  private planetTextures: Map<string, PIXI.RenderTexture> = new Map();
  private sunTextures: Map<string, PIXI.RenderTexture> = new Map();
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.preRenderPlanets();
    this.preRenderSun();
  }
  
  /**
   * Pre-render planet textures for different states
   * OPTIMIZATION: Render once, reuse many times
   */
  private preRenderPlanets() {
    const radius = LUMINOUS_STYLE.RENDERING.PLANET_RADIUS;
    const size = radius * 2 + 20; // Add padding for glow
    
    // Neutral planet (outlined ring)
    const neutralKey = `planet_neutral_${radius}`;
    if (!this.planetTextures.has(neutralKey)) {
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(
        LUMINOUS_STYLE.RENDERING.PLANET_NEUTRAL_STROKE,
        LUMINOUS_STYLE.COLORS.NEUTRAL,
        LUMINOUS_STYLE.RENDERING.PLANET_NEUTRAL_ALPHA
      );
      graphics.drawCircle(size / 2, size / 2, radius);
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.planetTextures.set(neutralKey, texture);
      graphics.destroy();
    }
    
    // Player planet (filled circle)
    const playerKey = `planet_player_${radius}`;
    if (!this.planetTextures.has(playerKey)) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 1.0);
      graphics.drawCircle(size / 2, size / 2, radius);
      graphics.endFill();
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.planetTextures.set(playerKey, texture);
      graphics.destroy();
    }
    
    // AI planet (filled circle)
    const aiKey = `planet_ai_${radius}`;
    if (!this.planetTextures.has(aiKey)) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(LUMINOUS_STYLE.COLORS.AI, 1.0);
      graphics.drawCircle(size / 2, size / 2, radius);
      graphics.endFill();
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.planetTextures.set(aiKey, texture);
      graphics.destroy();
    }
  }
  
  /**
   * Pre-render sun textures for different states
   * OPTIMIZATION: Render once, reuse many times
   */
  private preRenderSun() {
    const baseRadius = LUMINOUS_STYLE.RENDERING.SUN_RADIUS;
    const size = baseRadius * 2 + 40; // Add padding for glow
    
    // Sun core (warning orange)
    const sunKey = `sun_core_${baseRadius}`;
    if (!this.sunTextures.has(sunKey)) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(LUMINOUS_STYLE.COLORS.SUN_CORE, 1.0);
      graphics.drawCircle(size / 2, size / 2, baseRadius);
      graphics.endFill();
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.sunTextures.set(sunKey, texture);
      graphics.destroy();
    }
    
    // Player sun (captured)
    const playerSunKey = `sun_player_${baseRadius}`;
    if (!this.sunTextures.has(playerSunKey)) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 1.0);
      graphics.drawCircle(size / 2, size / 2, baseRadius);
      graphics.endFill();
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.sunTextures.set(playerSunKey, texture);
      graphics.destroy();
    }
    
    // AI sun (captured)
    const aiSunKey = `sun_ai_${baseRadius}`;
    if (!this.sunTextures.has(aiSunKey)) {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(LUMINOUS_STYLE.COLORS.AI, 1.0);
      graphics.drawCircle(size / 2, size / 2, baseRadius);
      graphics.endFill();
      
      const texture = this.app.renderer.generateTexture(graphics, {
        resolution: 1,
        scaleMode: PIXI.SCALE_MODES.LINEAR
      });
      this.sunTextures.set(aiSunKey, texture);
      graphics.destroy();
    }
  }
  
  /**
   * Get cached planet texture
   */
  getPlanetTexture(owner: 'player' | 'ai' | 'neutral'): PIXI.RenderTexture | null {
    const radius = LUMINOUS_STYLE.RENDERING.PLANET_RADIUS;
    let key: string;
    
    if (owner === 'neutral') {
      key = `planet_neutral_${radius}`;
    } else if (owner === 'player') {
      key = `planet_player_${radius}`;
    } else {
      key = `planet_ai_${radius}`;
    }
    
    return this.planetTextures.get(key) || null;
  }
  
  /**
   * Get cached sun texture
   */
  getSunTexture(owner: 'player' | 'ai' | null): PIXI.RenderTexture | null {
    const baseRadius = LUMINOUS_STYLE.RENDERING.SUN_RADIUS;
    let key: string;
    
    if (owner === 'player') {
      key = `sun_player_${baseRadius}`;
    } else if (owner === 'ai') {
      key = `sun_ai_${baseRadius}`;
    } else {
      key = `sun_core_${baseRadius}`;
    }
    
    return this.sunTextures.get(key) || null;
  }
  
  /**
   * Clear all cached textures (for cleanup)
   */
  clear(): void {
    this.planetTextures.forEach(texture => texture.destroy(true));
    this.sunTextures.forEach(texture => texture.destroy(true));
    this.planetTextures.clear();
    this.sunTextures.clear();
  }
}
