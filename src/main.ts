import * as PIXI from 'pixi.js';
import { GameState, GameStateManager } from './systems/GameState';
import { StartScreen } from './ui/StartScreen';
import { Sun } from './entities/Sun';
import { Planet } from './entities/Planet';
import { Triangle } from './entities/Triangle';
import { PlanetGenerator } from './utils/PlanetGenerator';
import { InputManager } from './systems/InputManager';
import { CombatSystem } from './systems/CombatSystem';
import { ProductionSystem } from './systems/ProductionSystem';
import { GameManager } from './systems/GameManager';
import { AISystem } from './systems/AISystem';
import { EffectsSystem } from './systems/EffectsSystem';
import { useGameStore } from './store/gameStore';
import { UIManager } from './ui/UIManager';
import { TooltipManager } from './ui/TooltipManager';
import { Logger } from './utils/Logger';
import { ObjectPool } from './utils/ObjectPool';
import { ParticlePool } from './utils/ParticlePool';

import { LUMINOUS_STYLE } from './config/LuminousStyle';

// Configuration PixiJS - Luminous Abstract Style
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: LUMINOUS_STYLE.COLORS.BACKGROUND, // Deep Space (not black)
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.view as HTMLCanvasElement);

// Game State Manager
const gameStateManager = new GameStateManager();

// Start Screen
const startScreen = new StartScreen(app, gameStateManager);
app.stage.addChild(startScreen.getContainer());

// Variables de jeu (initialisées au démarrage)
let sun: Sun | null = null;
let planets: Planet[] = [];
let inputManager: InputManager | null = null;
let combatSystem: CombatSystem | null = null;
let productionSystem: ProductionSystem | null = null;
let gameManager: GameManager | null = null;
let aiSystem: AISystem | null = null;
let uiManager: UIManager | null = null;
let tooltipManager: TooltipManager | null = null;
let effectsSystem: EffectsSystem | null = null;
let gameTimer: number | null = null;

// OPTIMIZATION: Object Pools for Zero-Allocation Game Loop
let trianglePool: ObjectPool<Triangle> | null = null;
let particlePool: ParticlePool | null = null;

// Fonction pour initialiser le jeu
function initGame() {
  // Nettoyer l'ancien jeu si existe
  if (gameTimer) {
    clearInterval(gameTimer);
  }
  
  // Reset store
  const state = useGameStore.getState();
  state.resetGame();
  
  // Nettoyer le stage (garder startScreen)
  if (sun) {
    app.stage.removeChild(sun.getContainer());
  }
  planets.forEach(planet => {
    app.stage.removeChild(planet.getContainer());
  });
  if (uiManager) {
    app.stage.removeChild(uiManager.getContainer());
  }
  
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  // Soleil central
  sun = new Sun(centerX, centerY);
  app.stage.addChild(sun.getContainer());
  
  // 8 Planètes générées aléatoirement
  planets = PlanetGenerator.generate(
    window.innerWidth / 2,
    window.innerHeight / 2
  );
  
  planets.forEach(planet => {
    app.stage.addChild(planet.getContainer());
  });
  
  Logger.log('🌍 8 planètes générées');
  
  // UI Manager (on top of everything)
  uiManager = new UIManager(app);
  app.stage.addChild(uiManager.getContainer());
  
  // Ensure Sun HP bar is above orbital rings but below UI
  // Move Sun HP bar to UI layer (it's already in UIManager, so it's on top)
  
  // Tooltip Manager
  tooltipManager = new TooltipManager(app);
  app.stage.addChild(tooltipManager.getContainer());
  
  // Afficher tutoriel si première fois
  if (tooltipManager.shouldShowTutorial()) {
    tooltipManager.showFirstTimeTutorial();
  }
  
  // Effects System
  effectsSystem = new EffectsSystem(app);
  
  // OPTIMIZATION: Initialize Object Pools (pre-allocate for zero allocation)
  if (!trianglePool) {
    trianglePool = new ObjectPool<Triangle>(
      () => new Triangle(),
      200, // Pre-allocate 200 triangles (should be enough for most gameplay)
      (triangle) => triangle.reset()
    );
  } else {
    // Clear pool on game restart
    trianglePool.clear();
  }
  
  // Initialize Particle Pool
  if (!particlePool) {
    particlePool = new ParticlePool(100); // Pre-allocate 100 particles
  } else {
    particlePool.clear();
  }
  
  // Pass particle pool to AnimationHelper (via global or parameter)
  // For now, we'll pass it through the systems that need it
  
  // Input Manager (avec référence au Soleil et pool)
  inputManager = new InputManager(planets, uiManager, app, sun, trianglePool);
  
  // Combat System (avec référence au Soleil et pools)
  combatSystem = new CombatSystem(planets, app, sun, trianglePool, particlePool);
  
  // Passer effectsSystem au CombatSystem pour screen shake sur Soleil
  if (combatSystem && effectsSystem) {
    combatSystem.setEffectsSystem(effectsSystem);
  }
  
  // Callback quand le joueur perd une planète
  combatSystem.setOnPlayerLostPlanet(() => {
    if (effectsSystem) {
      effectsSystem.screenShake(15, 0.4);
    }
    if (uiManager) {
      uiManager.showAlert('⚠️ Planète perdue !');
    }
  });
  
  // Production System (avec particle pool)
  productionSystem = new ProductionSystem(planets, app, particlePool);
  
  // Game Manager (avec référence aux planètes)
  gameManager = new GameManager(app, gameStateManager);
  gameManager.setPlanets(planets);
  
  // AI System (avec référence au Soleil et pool)
  aiSystem = new AISystem(planets, sun, trianglePool);
  aiSystem.setApp(app);
  
  // Timer (utilise le mode de jeu)
  const gameState = useGameStore.getState();
  gameState.setGameMode(gameState.gameMode); // Initialiser le timer selon le mode
  
  gameTimer = setInterval(() => {
    const currentState = useGameStore.getState();
    currentState.decrementTimer();
  }, 1000);
  
  // Cacher l'écran de start
  startScreen.hide();
}

// Gestion des transitions d'état
gameStateManager.onStateChange((newState) => {
  if (newState === GameState.PLAYING) {
    initGame();
  } else if (newState === GameState.START_SCREEN) {
    // Nettoyer le jeu
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    if (sun) {
      app.stage.removeChild(sun.getContainer());
      sun = null;
    }
    
    planets.forEach(planet => {
      app.stage.removeChild(planet.getContainer());
    });
    planets = [];
    
    if (uiManager) {
      app.stage.removeChild(uiManager.getContainer());
      uiManager = null;
    }
    
    inputManager = null;
    combatSystem = null;
    productionSystem = null;
    gameManager = null;
    aiSystem = null;
    effectsSystem = null;
    
    // Afficher l'écran de start
    startScreen.show();
  }
});

// Helper pour mettre à jour les triangles
function updateTriangles(triangles: Triangle[], app: PIXI.Application, delta: number) {
  for (let i = triangles.length - 1; i >= 0; i--) {
    const triangle = triangles[i];
    const container = triangle.getContainer();
    
    // Nettoyer les triangles détruits
    if (container.destroyed) {
      if (container.parent) {
        app.stage.removeChild(container);
      }
      triangles.splice(i, 1);
      continue;
    }
    
    // Ne pas mettre à jour les triangles qui ont atteint leur cible
    // Ils seront supprimés par CombatSystem ou cleanupReachedTriangles
    if (triangle.hasReached) {
      continue;
    }
    
    if (!container.parent) {
      app.stage.addChild(container);
    }
    triangle.update(delta);
  }
}

// Fonction de nettoyage pour les triangles qui ont atteint leur cible
// mais qui n'ont pas été traités par CombatSystem (sécurité)
// OPTIMIZATION: Release to pool instead of destroying
function cleanupReachedTriangles(triangles: Triangle[], app: PIXI.Application) {
  for (let i = triangles.length - 1; i >= 0; i--) {
    const triangle = triangles[i];
    if (triangle.hasReached) {
      const container = triangle.getContainer();
      if (container.parent) {
        app.stage.removeChild(container);
      }
      // OPTIMIZATION: Release to pool instead of destroy
      if (trianglePool) {
        trianglePool.release(triangle);
      } else {
        container.destroy({ children: true });
      }
      triangles.splice(i, 1);
    }
  }
}

// Game loop
app.ticker.add((delta) => {
  const currentState = gameStateManager.getState();
  
  if (currentState === GameState.PLAYING) {
    // Check victoire/défaite
    if (gameManager && gameManager.checkWinCondition()) {
      return;
    }
    
    // Update soleil
    if (sun) {
      sun.update(delta);
    }
    
    // Update UI (avec planètes pour vérifications)
    if (uiManager) {
      uiManager.setPlanets(planets);
      uiManager.update();
    }
    
    // Update effects
    if (effectsSystem) {
      effectsSystem.update();
      effectsSystem.bringToFront();
    }
    
    // Update production
    if (productionSystem) {
      productionSystem.update(delta);
    }
    
    // Update cooldown et overcharge du Soleil
    useGameStore.getState().updateSunCooldown(delta);
    
    // Update IA
    if (aiSystem) {
      aiSystem.update(delta);
      aiSystem.updateDefenses(delta);
    }
    
    // Update planètes
    planets.forEach(planet => {
      planet.update(delta);
    });
    
    // Update input manager (pour les indicateurs)
    if (inputManager) {
      inputManager.update();
    }
    
    // Update triangles (joueur et IA)
    updateTriangles(inputManager?.getTriangles() || [], app, delta);
    updateTriangles(aiSystem?.getTriangles() || [], app, delta);
    
    // Combat (après les updates pour détecter hasReached)
    if (combatSystem && inputManager && aiSystem) {
      const playerTriangles = inputManager.getTriangles();
      const aiTriangles = aiSystem.getTriangles();
      combatSystem.update(playerTriangles, aiTriangles);
    }
    
    // Nettoyer les triangles restants qui ont hasReached mais n'ont pas été traités par CombatSystem
    // (sécurité supplémentaire)
    cleanupReachedTriangles(inputManager?.getTriangles() || [], app);
    cleanupReachedTriangles(aiSystem?.getTriangles() || [], app);
  }
});

// Gestion du redimensionnement
window.addEventListener('resize', () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});
