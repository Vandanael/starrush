import * as PIXI from 'pixi.js';
import { GameStateManager, GameState } from '../systems/GameState';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';
import { useGameStore } from '../store/gameStore';
import { GameMode, GAME_MODES, TimeAttackMode } from '../config/GameConfig';
import { easeInOut } from '../utils/AnimationMath';

/**
 * Start Screen - Hypnotic Title Scene
 * Features:
 * - Breathing Sun with rotating Dyson Sphere segments
 * - Minimalist micro-tutorial
 * - Pulsing play button in sync with sun
 */
/**
 * Extended PIXI Container with button metadata
 */
interface ButtonContainer extends PIXI.Container {
  buttonWidth?: number;
  buttonHeight?: number;
  textElement?: PIXI.Text;
}

export class StartScreen {
  private container: PIXI.Container;
  private gameStateManager: GameStateManager;
  private appInstance: PIXI.Application;
  
  // Hero animation elements
  private sunContainer!: PIXI.Container;
  private sunCore!: PIXI.Graphics;
  private dysonRings: PIXI.Graphics[] = [];
  private dysonSegments: PIXI.Graphics[] = [];
  private sunPulsePhase: number = 0;
  private ringRotationPhases: number[] = [];
  private segmentDashOffsets: number[] = [];
  
  // UI elements
  private title!: PIXI.Text;
  private subtitle!: PIXI.Text;
  private playButton!: PIXI.Container;
  private playButtonBg!: PIXI.Graphics;
  private modeButtons: { classic: PIXI.Container; quick: PIXI.Container; timeattack: PIXI.Container | null } | null = null;
  private timeAttackButtons: { '30s': PIXI.Container; '60s': PIXI.Container; '90s': PIXI.Container; '120s': PIXI.Container } | null = null;
  private selectedMode: GameMode = 'classic';
  private selectedTimeAttackMode: TimeAttackMode | null = null;
  
  // Animation state
  private animationTime: number = 0;
  private stars: PIXI.Graphics[] = [];
  private backgroundGradient!: PIXI.Graphics;
  
  constructor(app: PIXI.Application, gameStateManager: GameStateManager) {
    this.gameStateManager = gameStateManager;
    this.appInstance = app;
    this.container = new PIXI.Container();
    
    // Background - Radial Gradient with Vignette Effect
    this.createBackground(app);
    
    // Subtle starfield texture
    this.createStarfield(app);
    
    // Create title (must be first to calculate subtitle position)
    this.createTitle(app);
    
    // Create subtitle (positioned relative to title)
    this.createSubtitle(app);
    
    // Create hero animation (sun + dyson sphere) - after text elements
    this.createHeroAnimation(app);
    
    // Create play button and mode selection (side by side)
    this.createPlayButtonAndModes(app);
    
    // Create footer
    this.createFooter(app);
    
    // Start animation loop
    this.startAnimationLoop();
    
    // Fade in
    this.container.alpha = 0;
    this.animateIn();
  }
  
  /**
   * Background: Radial Gradient with Vignette
   */
  private createBackground(app: PIXI.Application) {
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    const maxRadius = Math.max(app.screen.width, app.screen.height) * 0.8;
    
    // Create radial gradient effect using multiple circles
    this.backgroundGradient = new PIXI.Graphics();
    
    // Center: Deep Indigo (current background color)
    const centerColor = LUMINOUS_STYLE.COLORS.BACKGROUND;
    // Edge: Near black (0x000000 with slight tint)
    const edgeColor = 0x000000;
    
    // Draw multiple concentric circles for gradient effect
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const radius = maxRadius * progress;
      const alpha = 1.0 - (progress * 0.3); // Fade to darker at edges
      
      // Interpolate color
      const r1 = (centerColor >> 16) & 0xFF;
      const g1 = (centerColor >> 8) & 0xFF;
      const b1 = centerColor & 0xFF;
      const r2 = (edgeColor >> 16) & 0xFF;
      const g2 = (edgeColor >> 8) & 0xFF;
      const b2 = edgeColor & 0xFF;
      
      const r = Math.floor(r1 + (r2 - r1) * progress);
      const g = Math.floor(g1 + (g2 - g1) * progress);
      const b = Math.floor(b1 + (b2 - b1) * progress);
      const color = (r << 16) | (g << 8) | b;
      
      this.backgroundGradient.beginFill(color, alpha);
      this.backgroundGradient.drawCircle(centerX, centerY, radius);
      this.backgroundGradient.endFill();
    }
    
    this.container.addChildAt(this.backgroundGradient, 0);
  }
  
  /**
   * Subtle Starfield Texture
   */
  private createStarfield(app: PIXI.Application) {
    const numStars = Math.floor((app.screen.width * app.screen.height) / 15000); // Density based on screen size
    
    for (let i = 0; i < numStars; i++) {
      const star = new PIXI.Graphics();
      const x = Math.random() * app.screen.width;
      const y = Math.random() * app.screen.height;
      const size = Math.random() * 1.5 + 0.5; // 0.5 to 2px
      const opacity = Math.random() * 0.4 + 0.1; // 0.1 to 0.5
      
      star.beginFill(0xffffff, opacity);
      star.drawCircle(x, y, size);
      star.endFill();
      
      this.stars.push(star);
      this.container.addChild(star);
    }
  }
  
  /**
   * Hero Animation: Breathing Sun + Rotating Dyson Sphere
   * Responsive: Scales down on mobile, positioned between subtitle and buttons
   */
  private createHeroAnimation(app: PIXI.Application) {
    const centerX = app.screen.width / 2;
    const isMobile = app.screen.width < 480;
    
    // Responsive scale: smaller on mobile to fit viewport
    const mobileScale = isMobile ? 0.5 : 0.7; // Smaller to leave room for buttons
    // Position between subtitle and buttons
    const subtitleBottom = this.subtitle ? this.subtitle.y + (this.subtitle.height / 2) : app.screen.height * 0.3;
    const buttonsTop = app.screen.height - 120; // Approximate buttons position
    const heroY = subtitleBottom + ((buttonsTop - subtitleBottom) / 2); // Center between subtitle and buttons
    
    this.sunContainer = new PIXI.Container();
    this.sunContainer.x = centerX;
    this.sunContainer.y = heroY;
    this.sunContainer.scale.set(mobileScale);
    this.container.addChild(this.sunContainer);
    
    // Breathing Sun (Orange)
    const sunRadius = LUMINOUS_STYLE.RENDERING.SUN_RADIUS;
    this.sunCore = new PIXI.Graphics();
    this.sunCore.beginFill(LUMINOUS_STYLE.COLORS.SUN_CORE, 1.0);
    this.sunCore.drawCircle(0, 0, sunRadius);
    this.sunCore.endFill();
    this.sunContainer.addChild(this.sunCore);
    
    // Subtle glow around sun
    const sunGlow = new PIXI.Graphics();
    sunGlow.beginFill(LUMINOUS_STYLE.COLORS.SUN_GLOW, 0.1);
    sunGlow.drawCircle(0, 0, sunRadius * 1.3);
    sunGlow.endFill();
    this.sunContainer.addChildAt(sunGlow, 0);
    
    // Create multiple concentric rings (Dyson Sphere metaphor)
    const numRings = 4;
    const baseRadius = sunRadius + 20;
    
    for (let i = 0; i < numRings; i++) {
      const ring = new PIXI.Graphics();
      const radius = baseRadius + i * 40;
      const ringThickness = 2;
      
      // Cyan color with varying opacity
      const alpha = 0.3 - (i * 0.05);
      ring.lineStyle(ringThickness, LUMINOUS_STYLE.COLORS.PLAYER, alpha);
      
      // Draw dashed circle (will be animated with stroke-dashoffset)
      const dashLength = 20;
      const gapLength = 10;
      const circumference = 2 * Math.PI * radius;
      const numDashes = Math.floor(circumference / (dashLength + gapLength));
      
      for (let j = 0; j < numDashes; j++) {
        const startAngle = (j * (dashLength + gapLength) / radius);
        const endAngle = ((j * (dashLength + gapLength) + dashLength) / radius);
        
        ring.arc(0, 0, radius, startAngle, endAngle);
      }
      
      this.dysonRings.push(ring);
      this.ringRotationPhases.push(Math.random() * Math.PI * 2); // Random starting phase
      this.sunContainer.addChild(ring);
    }
    
    // Create sphere segments (arcs that form/unform)
    const numSegments = 6;
    for (let i = 0; i < numSegments; i++) {
      const segment = new PIXI.Graphics();
      const segmentRadius = baseRadius + 60 + (i % 3) * 30;
      const segmentThickness = 3;
      
      segment.lineStyle(segmentThickness, LUMINOUS_STYLE.COLORS.PLAYER, 0.6);
      
      // Arc segment (will animate with rotation and sliding)
      const startAngle = (i * Math.PI * 2 / numSegments);
      const arcLength = Math.PI / 3; // 60 degrees
      
      segment.arc(0, 0, segmentRadius, startAngle, startAngle + arcLength);
      
      this.dysonSegments.push(segment);
      this.segmentDashOffsets.push(i * 50); // Staggered offsets for sliding effect
      this.sunContainer.addChild(segment);
    }
  }
  
  /**
   * Title: "STAR RUSH" with cyan glow
   * Reduced spacing below title
   */
  private createTitle(app: PIXI.Application) {
    const centerX = app.screen.width / 2;
    const isMobile = app.screen.width < 480;
    // Position plus proche du bord sur mobile pour effet "bord à bord"
    const titleY = isMobile ? app.screen.height * 0.08 : app.screen.height * 0.15; // Top area, closer to edge on mobile
    
    // Title style - responsive size for mobile
    const baseFontSize = isMobile ? 48 : LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_LARGE * 2.5; // 48px mobile, 80px desktop
    const letterSpacing = isMobile ? 4 : 8; // Réduit sur mobile pour éviter débordement
    
    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: baseFontSize,
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT,
      fontWeight: 'bold',
      letterSpacing: letterSpacing,
    });
    
    this.title = new PIXI.Text('STAR RUSH', titleStyle);
    this.title.x = centerX;
    this.title.y = titleY;
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);
    
    // Cyan glow effect (using filter or duplicate with blur)
    const glowText = new PIXI.Text('STAR RUSH', titleStyle);
    glowText.style.fill = LUMINOUS_STYLE.COLORS.PLAYER;
    glowText.x = centerX;
    glowText.y = titleY;
    glowText.anchor.set(0.5);
    glowText.alpha = 0.4;
    this.container.addChildAt(glowText, this.container.children.indexOf(this.title));
  }
  
  /**
   * Subtitle: "3 Minutes to Capture the Sun"
   * Positioned directly below title with minimal spacing
   */
  private createSubtitle(app: PIXI.Application) {
    const centerX = app.screen.width / 2;
    // Position directly below title with minimal spacing
    const titleBottom = this.title.y + (this.title.height / 2);
    const subtitleY = titleBottom + 15; // Minimal spacing (15px) - reduced from 20px
    
    const subtitleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL,
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT_SECONDARY,
      align: 'center',
    });
    
    this.subtitle = new PIXI.Text('3 Minutes to Capture the Sun', subtitleStyle);
    this.subtitle.x = centerX;
    this.subtitle.y = subtitleY;
    this.subtitle.anchor.set(0.5);
    this.container.addChild(this.subtitle);
  }
  
  /**
   * Play Button and Mode Selection: Separated layout
   * Mode buttons in a row above, Start button standalone below
   */
  private createPlayButtonAndModes(app: PIXI.Application) {
    const isMobile = app.screen.width < 480;
    const centerX = app.screen.width / 2;
    const safeAreaBottom = isMobile ? 20 : 0;
    
    // Mode buttons dimensions
    const modeButtonWidth = isMobile ? 90 : 110;
    const modeButtonHeight = Math.max(48, isMobile ? 52 : 50);
    const modeSpacing = isMobile ? 10 : 15; // Horizontal gap between mode buttons
    
    // Calculate mode buttons row position (above Start button)
    const startButtonHeight = Math.max(48, isMobile ? 52 : 50);
    const verticalGap = isMobile ? 20 : 25; // Vertical spacing between modes and Start
    const startButtonY = app.screen.height - 60 - safeAreaBottom; // Start button at bottom
    const modeY = startButtonY - startButtonHeight - verticalGap; // Mode buttons above Start
    
    // Create mode buttons row (centered horizontally)
    this.modeButtons = this.createModeButtons(
      app,
      centerX,
      modeY,
      modeButtonWidth,
      modeButtonHeight,
      modeSpacing
    );
    
    this.container.addChild(this.modeButtons.classic);
    this.container.addChild(this.modeButtons.quick);
    if (this.modeButtons.timeattack) {
      this.container.addChild(this.modeButtons.timeattack);
    }
    
    // Create Start button (standalone, full-width or centered)
    const startButtonWidth = isMobile ? 200 : 240; // Wider, standalone button
    this.createPlayButton(app, centerX, startButtonY, startButtonWidth, startButtonHeight);
  }
  
  private createModeButtons(
    _app: PIXI.Application,
    centerX: number,
    y: number,
    buttonWidth: number,
    buttonHeight: number,
    spacing: number
  ): { classic: PIXI.Container; quick: PIXI.Container; timeattack: PIXI.Container | null } {
    // Calculate positions for 3 buttons side by side
    const totalWidth = (buttonWidth * 3) + (spacing * 2);
    const startX = centerX - (totalWidth / 2) + (buttonWidth / 2);
    
    const classicButton = this.createModeButton(
      GAME_MODES.CLASSIC.name,
      'classic',
      startX,
      y,
      buttonWidth,
      buttonHeight
    );
    
    const quickButton = this.createModeButton(
      GAME_MODES.QUICK.name,
      'quick',
      startX + buttonWidth + spacing,
      y,
      buttonWidth,
      buttonHeight
    );
    
    const timeAttackButton = this.createModeButton(
      'Time Attack',
      'timeattack',
      startX + (buttonWidth + spacing) * 2,
      y,
      buttonWidth,
      buttonHeight
    );
    
    this.selectMode('classic', classicButton, quickButton, timeAttackButton);
    
    return { classic: classicButton, quick: quickButton, timeattack: timeAttackButton };
  }
  
  private createModeButton(name: string, mode: GameMode | 'timeattack', x: number, y: number, width: number, height: number): PIXI.Container {
    const buttonContainer = new PIXI.Container();
    buttonContainer.x = x;
    buttonContainer.y = y;
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    const bg = new PIXI.Graphics();
    bg.beginFill(LUMINOUS_STYLE.COLORS.BACKGROUND_SECONDARY, 0.6);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.endFill();
    buttonContainer.addChild(bg);
    
    // Store button dimensions and text reference for later use in selectMode
    const buttonMeta = buttonContainer as ButtonContainer;
    buttonMeta.buttonWidth = width;
    buttonMeta.buttonHeight = height;
    
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL,
      fill: 0x000000, // BLACK text for contrast on cyan button (when selected)
      fontWeight: 'bold',
      align: 'center',
    });
    
    const text = new PIXI.Text(name, textStyle);
    text.anchor.set(0.5);
    text.y = -8;
    buttonContainer.addChild(text);
    
    // Store text reference for color updates
    buttonMeta.textElement = text;
    
    if (mode !== 'timeattack') {
      const modeConfig = mode === 'classic' ? GAME_MODES.CLASSIC : GAME_MODES.QUICK;
      if (modeConfig) {
        const descStyle = new PIXI.TextStyle({
          fontFamily: 'Arial, sans-serif',
          fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL - 6,
          fill: LUMINOUS_STYLE.COLORS.UI_TEXT_SECONDARY,
          align: 'center',
        });
        const descText = new PIXI.Text(`${modeConfig.duration}s`, descStyle);
        descText.anchor.set(0.5);
        descText.y = 15;
        buttonContainer.addChild(descText);
      }
    }
    
    buttonContainer.on('pointerdown', () => {
      if (mode === 'timeattack') {
        if (this.modeButtons) {
          this.selectMode('timeattack', this.modeButtons.classic, this.modeButtons.quick, this.modeButtons.timeattack);
        }
      } else {
        if (this.modeButtons) {
          this.selectMode(mode, this.modeButtons.classic, this.modeButtons.quick, this.modeButtons.timeattack);
        }
      }
    });
    
    return buttonContainer;
  }
  
  private selectMode(mode: GameMode | 'timeattack', classicButton: PIXI.Container, quickButton: PIXI.Container, timeAttackButton: PIXI.Container | null) {
    if (mode === 'timeattack') {
      this.selectedMode = 'timeattack';
    } else {
      this.selectedMode = mode;
    }
    
    // Update button visuals
    [classicButton, quickButton, timeAttackButton].forEach((btn, idx) => {
      if (!btn) return;
      const bg = btn.children[0] as PIXI.Graphics;
      bg.clear();
      
      const isSelected = (mode === 'classic' && idx === 0) || 
                        (mode === 'quick' && idx === 1) || 
                        (mode === 'timeattack' && idx === 2);
      
      const buttonMeta = btn as ButtonContainer;
      if (isSelected) {
        bg.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 0.8);
        bg.lineStyle(2, LUMINOUS_STYLE.COLORS.PLAYER_BRIGHT, 1.0);
        // Update text color to black for selected (cyan) button
        if (buttonMeta.textElement) {
          buttonMeta.textElement.style.fill = 0x000000; // Black on cyan
        }
      } else {
        bg.beginFill(LUMINOUS_STYLE.COLORS.BACKGROUND_SECONDARY, 0.6);
        // Update text color to white for unselected button
        if (buttonMeta.textElement) {
          buttonMeta.textElement.style.fill = LUMINOUS_STYLE.COLORS.UI_TEXT; // White on dark
        }
      }
      // Use actual button dimensions from the button container
      const actualButtonWidth = buttonMeta.buttonWidth || 140;
      const actualButtonHeight = buttonMeta.buttonHeight || 50;
      bg.drawRoundedRect(-actualButtonWidth / 2, -actualButtonHeight / 2, actualButtonWidth, actualButtonHeight, 8);
      bg.endFill();
    });
    
    // Show/hide Time Attack buttons
    if (mode === 'timeattack' && !this.timeAttackButtons) {
      // Position below Time Attack button with safe margin
      const timeAttackY = timeAttackButton ? timeAttackButton.y + 60 : this.appInstance.screen.height * 0.72 + 180;
      const centerX = this.appInstance.screen.width / 2;
      this.timeAttackButtons = this.createTimeAttackButtons(this.appInstance, centerX, timeAttackY);
      Object.values(this.timeAttackButtons).forEach(btn => {
        this.container.addChild(btn);
      });
    } else if (mode !== 'timeattack' && this.timeAttackButtons) {
      Object.values(this.timeAttackButtons).forEach(btn => {
        if (btn.parent) {
          this.container.removeChild(btn);
        }
      });
      this.timeAttackButtons = null;
      this.selectedTimeAttackMode = null;
    }
  }
  
  private createTimeAttackButtons(app: PIXI.Application, centerX: number, y: number): Record<TimeAttackMode, PIXI.Container> {
    const durations: TimeAttackMode[] = ['30s', '60s', '90s', '120s'];
    const buttons: Partial<Record<TimeAttackMode, PIXI.Container>> = {};
    const isMobile = app.screen.width < 480;
    const buttonSize = 60;
    const spacing = 15;
    
    if (isMobile) {
      // 2x2 grid on mobile
      durations.forEach((duration, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const btn = this.createTimeAttackButton(duration, centerX + (col - 0.5) * (buttonSize + spacing), y + row * (buttonSize + spacing), buttonSize);
        buttons[duration] = btn;
      });
    } else {
      // Horizontal on desktop
      const startX = centerX - (durations.length - 1) * (buttonSize + spacing) / 2;
      durations.forEach((duration, idx) => {
        const btn = this.createTimeAttackButton(duration, startX + idx * (buttonSize + spacing), y, buttonSize);
        buttons[duration] = btn;
      });
    }
    
    // All buttons are guaranteed to be created in the loop above
    return buttons as Record<TimeAttackMode, PIXI.Container>;
  }
  
  private createTimeAttackButton(duration: TimeAttackMode, x: number, y: number, size: number): PIXI.Container {
    const buttonContainer = new PIXI.Container();
    buttonContainer.x = x;
    buttonContainer.y = y;
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    const bg = new PIXI.Graphics();
    bg.beginFill(LUMINOUS_STYLE.COLORS.BACKGROUND_SECONDARY, 0.6);
    bg.drawRoundedRect(-size / 2, -size / 2, size, size, 8);
    bg.endFill();
    buttonContainer.addChild(bg);
    
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL - 4,
      fill: LUMINOUS_STYLE.COLORS.UI_TEXT,
      fontWeight: 'bold',
      align: 'center',
    });
    
    const text = new PIXI.Text(duration, textStyle);
    text.anchor.set(0.5);
    buttonContainer.addChild(text);
    
    buttonContainer.on('pointerdown', () => {
      this.selectedTimeAttackMode = duration;
      // Update visual
      bg.clear();
      bg.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 0.8);
      bg.lineStyle(2, LUMINOUS_STYLE.COLORS.PLAYER_BRIGHT, 1.0);
      bg.drawRoundedRect(-size / 2, -size / 2, size, size, 8);
      bg.endFill();
      
      // Deselect others
      if (this.timeAttackButtons) {
        Object.entries(this.timeAttackButtons).forEach(([key, btn]) => {
          if (key !== duration) {
            const otherBg = btn.children[0] as PIXI.Graphics;
            otherBg.clear();
            otherBg.beginFill(LUMINOUS_STYLE.COLORS.BACKGROUND_SECONDARY, 0.6);
            otherBg.drawRoundedRect(-size / 2, -size / 2, size, size, 8);
            otherBg.endFill();
          }
        });
      }
    });
    
    return buttonContainer;
  }
  
  /**
   * Footer: "made by Vandanael" - Clickable link to GitHub
   */
  private createFooter(app: PIXI.Application) {
    const centerX = app.screen.width / 2;
    const isMobile = app.screen.width < 480;
    const safeAreaBottom = isMobile ? 20 : 0;
    const footerY = app.screen.height - 20 - safeAreaBottom; // 20px from bottom + safe area
    
    // Smaller font size
    const footerStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: isMobile ? LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL - 6 : LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL - 4,
      fill: LUMINOUS_STYLE.COLORS.PLAYER, // Cyan color
      align: 'center',
    });
    
    const footerText = new PIXI.Text('made by Vandanael', footerStyle);
    footerText.x = centerX;
    footerText.y = footerY;
    footerText.anchor.set(0.5, 1); // Bottom-center anchor
    footerText.eventMode = 'static';
    footerText.cursor = 'pointer';
    
    // Underline graphics (shown on hover)
    const underline = new PIXI.Graphics();
    underline.lineStyle(1, LUMINOUS_STYLE.COLORS.PLAYER, 0);
    underline.visible = false;
    footerText.addChild(underline);
    
    // Update underline position and visibility
    const updateUnderline = () => {
      underline.clear();
      if (underline.visible) {
        const textWidth = footerText.width;
        const textHeight = footerText.height;
        underline.lineStyle(1, LUMINOUS_STYLE.COLORS.PLAYER, 1.0);
        underline.moveTo(-textWidth / 2, textHeight / 2 + 2);
        underline.lineTo(textWidth / 2, textHeight / 2 + 2);
      }
    };
    
    // Hover effects
    footerText.on('pointerenter', () => {
      underline.visible = true;
      updateUnderline();
    });
    
    footerText.on('pointerleave', () => {
      underline.visible = false;
      underline.clear();
    });
    
    // Click to open GitHub
    footerText.on('pointerdown', () => {
      window.open('https://github.com/Vandanael', '_blank');
    });
    
    this.container.addChild(footerText);
  }
  
  /**
   * Play Button: "Start" - pulses in sync with sun
   * Positioned next to mode buttons
   */
  private createPlayButton(app: PIXI.Application, x: number, y: number, width: number, height: number) {
    this.playButton = new PIXI.Container();
    this.playButton.x = x;
    this.playButton.y = y;
    this.playButton.eventMode = 'static';
    this.playButton.cursor = 'pointer';
    
    // Button background
    this.playButtonBg = new PIXI.Graphics();
    this.playButtonBg.beginFill(LUMINOUS_STYLE.COLORS.PLAYER, 0.8);
    this.playButtonBg.drawRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.playButtonBg.endFill();
    this.playButton.addChild(this.playButtonBg);
    
    // Button text - "Start" only
    const isMobile = app.screen.width < 480;
    const buttonStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: isMobile ? LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_NORMAL : LUMINOUS_STYLE.RENDERING.UI_FONT_SIZE_MEDIUM,
      fill: LUMINOUS_STYLE.COLORS.BACKGROUND, // Dark text on bright button
      fontWeight: 'bold',
    });
    
    const buttonText = new PIXI.Text('Start', buttonStyle);
    buttonText.anchor.set(0.5);
    this.playButton.addChild(buttonText);
    
    // Click handler
    this.playButton.on('pointerdown', () => {
      this.playButton.scale.set(0.95);
    });
    
    this.playButton.on('pointerup', () => {
      this.playButton.scale.set(1.0);
      
      // Set game mode based on selection
      const state = useGameStore.getState();
      if (this.selectedMode === 'timeattack' && this.selectedTimeAttackMode) {
        // Time Attack mode with duration
        state.setTimeAttackMode(this.selectedTimeAttackMode);
      } else if (this.selectedMode !== 'timeattack') {
        // Classic or Quick mode
        state.setGameMode(this.selectedMode);
      } else {
        // Fallback to classic if timeattack selected but no duration chosen
        state.setGameMode('classic');
      }
      
      this.gameStateManager.setState(GameState.PLAYING);
    });
    
    this.container.addChild(this.playButton);
  }
  
  /**
   * Animation loop - updates all procedural animations
   */
  private startAnimationLoop() {
    const ticker = this.appInstance.ticker;
    
    ticker.add(() => {
      if (this.container.visible && this.container.alpha > 0) {
        this.updateAnimations(ticker.deltaMS / 16.67); // Normalize to 60fps delta
      }
    });
  }
  
  /**
   * Update all animations
   */
  private updateAnimations(delta: number) {
    this.animationTime += delta * 0.016; // Convert to seconds
    
    // Subtle starfield animation (very slow twinkle)
    this.stars.forEach((star, index) => {
      const twinklePhase = (this.animationTime * 0.5 + index * 0.1) % (Math.PI * 2);
      const twinkle = 0.1 + Math.sin(twinklePhase) * 0.15; // Opacity variation
      star.alpha = Math.max(0.1, Math.min(0.5, twinkle));
    });
    
    // Subtle background gradient breathing (very slow)
    const gradientPulse = 1.0 + Math.sin(this.animationTime * 0.1) * 0.02; // Very subtle
    this.backgroundGradient.scale.set(gradientPulse);
    
    // Breathing Sun - pulse scale
    this.sunPulsePhase += delta * 0.02; // Slow breathing
    const breathingScale = 1.0 + Math.sin(this.sunPulsePhase) * 0.05; // 1.0 to 1.05
    this.sunContainer.scale.set(breathingScale);
    
    // Rotate rings at different speeds
    for (let i = 0; i < this.dysonRings.length; i++) {
      const rotationSpeed = 0.01 + (i * 0.005); // Different speeds
      this.ringRotationPhases[i] += delta * rotationSpeed;
      this.dysonRings[i].rotation = this.ringRotationPhases[i];
    }
    
    // Animate segment dash offsets (sliding effect)
    for (let i = 0; i < this.dysonSegments.length; i++) {
      this.segmentDashOffsets[i] += delta * 0.5; // Sliding speed
      if (this.segmentDashOffsets[i] > 200) {
        this.segmentDashOffsets[i] = 0; // Reset
      }
      
      // Redraw segment with offset (simulate stroke-dashoffset)
      this.dysonSegments[i].clear();
      const segmentRadius = LUMINOUS_STYLE.RENDERING.SUN_RADIUS + 60 + (i % 3) * 30;
      const startAngle = (i * Math.PI * 2 / this.dysonSegments.length) + (this.segmentDashOffsets[i] / segmentRadius);
      const arcLength = Math.PI / 3;
      
      this.dysonSegments[i].lineStyle(3, LUMINOUS_STYLE.COLORS.PLAYER, 0.6);
      this.dysonSegments[i].arc(0, 0, segmentRadius, startAngle, startAngle + arcLength);
    }
    
    // Play button pulse in sync with sun
    const buttonPulse = 1.0 + Math.sin(this.sunPulsePhase) * 0.05;
    this.playButton.scale.set(buttonPulse);
  }
  
  /**
   * Fade in animation
   */
  private animateIn() {
    const fadeDuration = 1000; // 1 second
    const startTime = Date.now();
    
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      const eased = easeInOut(progress);
      
      this.container.alpha = eased;
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }
  
  public getContainer(): PIXI.Container {
    return this.container;
  }
  
  public show() {
    this.container.visible = true;
  }
  
  public hide() {
    this.container.visible = false;
  }
}
