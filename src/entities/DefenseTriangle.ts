import * as PIXI from 'pixi.js';
import { Owner } from './Planet';

export class DefenseTriangle {
  private graphics: PIXI.Graphics;
  private container: PIXI.Container;
  private planetContainer: PIXI.Container;
  private orbitRadius: number = 50;
  private orbitAngle: number = 0;
  private orbitSpeed: number = 0.05;
  public owner: Owner;
  public isActive: boolean = true;
  
  constructor(planetContainer: PIXI.Container, owner: Owner) {
    this.planetContainer = planetContainer;
    this.owner = owner;
    
    this.container = new PIXI.Container();
    this.container.x = planetContainer.x;
    this.container.y = planetContainer.y;
    
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
    
    this.draw();
  }
  
  private draw() {
    const color = this.owner === 'player' ? 0x3b82f6 : 0xef4444;
    
    this.graphics.clear();
    
    // Triangle défensif (bouclier)
    this.graphics.beginFill(color, 0.6);
    this.graphics.lineStyle(2, color, 1.0);
    
    // Position sur orbite
    const x = Math.cos(this.orbitAngle) * this.orbitRadius;
    const y = Math.sin(this.orbitAngle) * this.orbitRadius;
    
    // Triangle pointant vers l'extérieur
    const size = 12;
    this.graphics.moveTo(x, y - size);
    this.graphics.lineTo(x - size * 0.7, y + size * 0.5);
    this.graphics.lineTo(x + size * 0.7, y + size * 0.5);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Glow
    this.graphics.beginFill(color, 0.2);
    this.graphics.drawCircle(x, y, size * 1.5);
    this.graphics.endFill();
  }
  
  public update(delta: number) {
    if (!this.isActive) return;
    
    // Orbite autour de la planète
    this.orbitAngle += delta * this.orbitSpeed;
    
    // Suivre la planète
    this.container.x = this.planetContainer.x;
    this.container.y = this.planetContainer.y;
    
    this.draw();
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
  
  public consume() {
    // Consommer la défense (bloquer une attaque)
    this.isActive = false;
    this.graphics.visible = false;
  }
}
