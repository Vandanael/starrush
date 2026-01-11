import * as PIXI from 'pixi.js';
import { Owner } from './Planet';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';
import { GAME_CONFIG } from '../config/GameConfig';
import { lerpAngle } from '../utils/AnimationMath';

export class Triangle {
  private graphics: PIXI.Graphics;
  private container: PIXI.Container;
  private trail: PIXI.Graphics;
  // OPTIMIZATION: Pre-allocated array for trail points (no push/shift allocations)
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  private trailPointCount: number = 0; // Track active points instead of using array length
  private targetX: number = 0;
  private targetY: number = 0;
  private baseSpeed: number = GAME_CONFIG.TRIANGLE_BASE_SPEED;
  private speedMultiplier: number = 1;
  public owner: Owner = 'player';
  public hasReached: boolean = false;
  private totalDistanceSquared: number = 0; // OPTIMIZATION: Store squared distance
  private traveledDistance: number = 0;
  private isRageMode: boolean = false;
  private currentRotation: number = 0; // For smooth banking rotation
  private active: boolean = false; // Pool flag
  
  constructor() {
    // Container pour triangle + trail (created once, reused)
    this.container = new PIXI.Container();
    
    // Trail
    this.trail = new PIXI.Graphics();
    this.container.addChild(this.trail);
    
    // Triangle
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
    
    // Pre-allocate trail points array (max 12 points for rage mode)
    for (let i = 0; i < 12; i++) {
      this.trailPoints.push({ x: 0, y: 0, alpha: 0 });
    }
  }
  
  /**
   * Initialize triangle from pool (called by ObjectPool)
   * OPTIMIZATION: Uses squared distance to avoid Math.sqrt()
   */
  init(startX: number, startY: number, targetX: number, targetY: number, owner: Owner, speedMultiplier: number = 1): void {
    this.targetX = targetX;
    this.targetY = targetY;
    this.owner = owner;
    this.speedMultiplier = speedMultiplier;
    this.isRageMode = speedMultiplier > 1;
    this.hasReached = false;
    this.traveledDistance = 0;
    this.trailPointCount = 0;
    this.active = true;
    
    // OPTIMIZATION: Calculate squared distance (avoid Math.sqrt)
    const dx = targetX - startX;
    const dy = targetY - startY;
    this.totalDistanceSquared = dx * dx + dy * dy;
    
    // Set position
    this.container.x = startX;
    this.container.y = startY;
    this.container.visible = true;
    
    // Initialize rotation
    this.currentRotation = Math.atan2(dy, dx) * (180 / Math.PI); // Initialize in degrees
    this.graphics.rotation = this.currentRotation * (Math.PI / 180); // Convert to radians
    
    // Clear and redraw
    this.trail.clear();
    this.draw();
  }
  
  /**
   * Reset triangle for pool reuse (called by ObjectPool)
   */
  reset(): void {
    this.active = false;
    this.hasReached = true;
    this.container.visible = false;
    
    // Remove from parent if attached
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    
    // Clear graphics
    this.trail.clear();
    this.graphics.clear();
    
    // Reset trail points
    this.trailPointCount = 0;
    for (let i = 0; i < this.trailPoints.length; i++) {
      this.trailPoints[i].alpha = 0;
    }
  }
  
  public isActive(): boolean {
    return this.active;
  }
  
  private draw() {
    // LUMINOUS ABSTRACT: Luminous colors for active units
    let color = this.owner === 'player' 
      ? LUMINOUS_STYLE.COLORS.PLAYER  // Electric Mint
      : LUMINOUS_STYLE.COLORS.AI;     // Magenta
    
    // Couleur plus vive en rage mode (orange warning)
    if (this.isRageMode && this.owner === 'player') {
      color = LUMINOUS_STYLE.COLORS.SUN_CORE; // Warning Orange
    }
    
    this.graphics.clear();
    this.graphics.beginFill(color, 1.0); // Opacité complète pour luminosité
    this.graphics.moveTo(20, 0);
    this.graphics.lineTo(-8, -8);
    this.graphics.lineTo(-8, 8);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Pas de glow en rage mode - radical minimalism (on garde juste la couleur)
  }
  
  private calculateRotation() {
    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const targetRotation = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees
    
    // GAME FEEL: Smooth banking rotation (not instant snap)
    const rotationSpeed = 0.15; // Lerp factor (0-1), higher = faster rotation
    this.currentRotation = lerpAngle(this.currentRotation, targetRotation, rotationSpeed);
    
    // Convert back to radians for PIXI
    this.graphics.rotation = this.currentRotation * (Math.PI / 180);
  }
  
  public update(delta: number) {
    if (this.hasReached || !this.active) return;
    
    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    // OPTIMIZATION: Use squared distance for comparison (avoid Math.sqrt)
    const distanceSquared = dx * dx + dy * dy;
    const arrivalThresholdSquared = 25; // 5 * 5
    
    if (distanceSquared < arrivalThresholdSquared) {
      this.hasReached = true;
      return;
    }
    
    // OPTIMIZATION: Only calculate actual distance when needed for movement
    const distance = Math.sqrt(distanceSquared);
    
    // Vitesse avec multiplier (rage mode)
    const speed = this.baseSpeed * this.speedMultiplier;
    
    // Easing (ease-out) : ralentit en approchant de la cible
    // OPTIMIZATION: Use squared distance for progress calculation
    const totalDistance = Math.sqrt(this.totalDistanceSquared);
    const progress = this.traveledDistance / totalDistance;
    const easedSpeed = speed * (1 - progress * 0.3);
    
    const moveDistance = easedSpeed * delta / 60;
    const ratio = moveDistance / distance;
    
    // OPTIMIZATION: Use bitwise floor for micro-optimization (if needed)
    this.container.x += dx * ratio;
    this.container.y += dy * ratio;
    this.traveledDistance += moveDistance;
    
    // Mettre à jour la rotation
    this.calculateRotation();
    
    // Trail effect
    this.updateTrail();
  }
  
  private updateTrail() {
    // OPTIMIZATION: Reuse array instead of push/shift (zero allocation)
    const maxPoints = this.isRageMode ? 12 : 8;
    
    // Shift all points to make room for new one
    if (this.trailPointCount >= maxPoints) {
      // Move all points one position back
      for (let i = 0; i < maxPoints - 1; i++) {
        this.trailPoints[i] = this.trailPoints[i + 1];
      }
      this.trailPointCount = maxPoints - 1;
    }
    
    // Add new point at the end
    const newIndex = this.trailPointCount;
    this.trailPoints[newIndex].x = this.container.x;
    this.trailPoints[newIndex].y = this.container.y;
    this.trailPoints[newIndex].alpha = 1.0;
    this.trailPointCount++;
    
    // Dessiner le trail
    this.trail.clear();
    if (this.trailPointCount > 1) {
      // LUMINOUS ABSTRACT: Luminous colors for trail
      let color = this.owner === 'player' 
        ? LUMINOUS_STYLE.COLORS.PLAYER 
        : LUMINOUS_STYLE.COLORS.AI;
      if (this.isRageMode && this.owner === 'player') {
        color = LUMINOUS_STYLE.COLORS.SUN_CORE; // Warning Orange
      }
      
      for (let i = 0; i < this.trailPointCount - 1; i++) {
        const point = this.trailPoints[i];
        const nextPoint = this.trailPoints[i + 1];
        
        // Alpha décroît avec l'âge (réduit pour moins de bruit visuel)
        const alpha = point.alpha * (this.isRageMode ? 0.3 : 0.2);
        const lineWidth = this.isRageMode ? 3 : 2;
        
        this.trail.lineStyle(lineWidth, color, alpha);
        this.trail.moveTo(point.x - this.container.x, point.y - this.container.y);
        this.trail.lineTo(nextPoint.x - this.container.x, nextPoint.y - this.container.y);
      }
    }
    
    // Faire vieillir les points (only active ones)
    for (let i = 0; i < this.trailPointCount; i++) {
      this.trailPoints[i].alpha = Math.max(0, this.trailPoints[i].alpha - 0.08);
    }
  }
  
  public getGraphics(): PIXI.Graphics {
    return this.graphics;
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
}
