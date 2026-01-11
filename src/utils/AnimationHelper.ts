import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { ParticlePool } from './ParticlePool';

export class AnimationHelper {
  /**
   * Anime la transition de couleur d'une planète
   */
  static animateColorTransition(
    planet: { getContainer: () => PIXI.Container },
    fromColor: number,
    toColor: number,
    duration: number = 0.3,
    onComplete?: () => void
  ) {
    const container = planet.getContainer();
    const graphics = container.children[1] as PIXI.Graphics; // Body
    
    // Extraire les composantes RGB
    const fromR = (fromColor >> 16) & 0xff;
    const fromG = (fromColor >> 8) & 0xff;
    const fromB = fromColor & 0xff;
    
    const toR = (toColor >> 16) & 0xff;
    const toG = (toColor >> 8) & 0xff;
    const toB = toColor & 0xff;
    
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const r = Math.floor(fromR + (toR - fromR) * eased);
      const g = Math.floor(fromG + (toG - fromG) * eased);
      const b = Math.floor(fromB + (toB - fromB) * eased);
      
      const currentColor = (r << 16) | (g << 8) | b;
      
      // Redessiner avec la nouvelle couleur
      graphics.clear();
      graphics.beginFill(currentColor);
      graphics.drawCircle(0, 0, 30);
      graphics.endFill();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };
    
    animate();
  }
  
  /**
   * Crée un effet de particules à une position
   * OPTIMIZATION: Uses particle pool and requestAnimationFrame instead of GSAP
   */
  static createParticles(
    app: PIXI.Application,
    x: number,
    y: number,
    color: number,
    count: number = 8,
    particlePool?: ParticlePool | null
  ) {
    const particles: PIXI.Graphics[] = [];
    
    // OPTIMIZATION: Pre-calculate angles and speeds (avoid Math.cos/sin in loop if possible)
    const angleStep = (Math.PI * 2) / count;
    
    for (let i = 0; i < count; i++) {
      // OPTIMIZATION: Acquire from pool if available
      let particle: PIXI.Graphics | null = null;
      if (particlePool) {
        particle = particlePool.acquire();
      }
      
      if (!particle) {
        // Fallback: create new particle (should not happen if pool is sized correctly)
        particle = new PIXI.Graphics();
      }
      
      particle.beginFill(color);
      particle.drawCircle(0, 0, 3);
      particle.endFill();
      
      particle.x = x;
      particle.y = y;
      
      const angle = angleStep * i;
      const speed = 50 + Math.random() * 50;
      
      if (!particle.parent) {
        app.stage.addChild(particle);
      }
      particles.push(particle);
      
      // OPTIMIZATION: Use requestAnimationFrame instead of GSAP (zero external dependency)
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;
      const startX = x;
      const startY = y;
      const startTime = performance.now();
      const duration = 500; // 0.5 seconds
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Ease out (power2.out approximation: 1 - (1-t)^2)
        const eased = 1 - Math.pow(1 - progress, 2);
        
        particle.x = startX + (targetX - startX) * eased;
        particle.y = startY + (targetY - startY) * eased;
        particle.alpha = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Release to pool instead of destroy
          if (particlePool) {
            particlePool.release(particle);
          } else {
            particle.destroy();
          }
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    return particles;
  }
  
  /**
   * Animation de pulse (scale)
   */
  static pulseScale(
    target: PIXI.DisplayObject,
    scale: number = 1.2,
    duration: number = 0.2
  ) {
    const originalScale = target.scale.x;
    
    gsap.to(target.scale, {
      x: scale,
      y: scale,
      duration: duration / 2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        target.scale.set(originalScale);
      }
    });
  }
  
  /**
   * Animation de shake
   */
  static shake(target: PIXI.DisplayObject, intensity: number = 5, duration: number = 0.3) {
    const originalX = target.x;
    const originalY = target.y;
    
    const shake = () => {
      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      target.x = originalX + offsetX;
      target.y = originalY + offsetY;
    };
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < duration) {
        shake();
        requestAnimationFrame(animate);
      } else {
        target.x = originalX;
        target.y = originalY;
      }
    };
    
    animate();
  }
}
