export type GameMode = 'classic' | 'quick' | 'timeattack';

export type TimeAttackMode = '30s' | '60s' | '90s' | '120s';

export const TIME_ATTACK_MODES: Record<TimeAttackMode, number> = {
  '30s': 30,
  '60s': 60,
  '90s': 90,
  '120s': 120
};

export const GAME_MODES = {
  CLASSIC: { duration: 120, majorityThreshold: 5, name: 'Classique' },
  QUICK: { duration: 60, majorityThreshold: 4, name: 'Rapide' },
  TIME_ATTACK: { duration: 60, majorityThreshold: 4, name: 'Time Attack' } // Durée par défaut, sera remplacée
};

// Helper pour obtenir le seuil de majorité selon le mode
export function getMajorityThreshold(mode: GameMode = 'classic'): number {
  return mode === 'quick' ? GAME_MODES.QUICK.majorityThreshold : GAME_MODES.CLASSIC.majorityThreshold;
}

export const GAME_CONFIG = {
  TIMER_DURATION: 120, // 2 minutes (par défaut, sera remplacé par mode)
  SUN_MAX_HP: 3,
  ATTACK_COST_BASE: 5, // Coût de base par attaque
  ATTACK_COST_DISTANCE_MULTIPLIER: 0.01, // Coût supplémentaire par pixel de distance
  ATTACK_COST_MIN: 5, // Coût minimum
  ATTACK_COST_MAX: 15, // Coût maximum
  SUN_ATTACK_COOLDOWN: 180, // Cooldown entre attaques sur le Soleil (3 secondes à 60 FPS)
  SUN_OVERCHARGE_BASE: 0, // Coût d'overcharge de base
  SUN_OVERCHARGE_MULTIPLIER: 2, // Multiplicateur d'overcharge par attaque rapide
  SUN_OVERCHARGE_DECAY: 0.5, // Décroissance de l'overcharge par seconde
  MAJORITY_THRESHOLD: 5, // planètes pour débloquer soleil (par défaut, sera remplacé par mode)
  PLANET_COUNT: 8,
  INITIAL_SHIPS: 10, // Vaisseaux de départ pour réduire temps morts
  
  // Triangle (unit) movement
  TRIANGLE_BASE_SPEED: 200, // Pixels per second
  TRIANGLE_ARRIVAL_THRESHOLD: 5, // Pixels - distance to consider target reached
  TRIANGLE_TRAIL_MAX_POINTS: 12, // Maximum trail points (rage mode)
  TRIANGLE_TRAIL_MAX_POINTS_NORMAL: 8, // Normal trail points
  
  // Combat hit detection
  SUN_HIT_THRESHOLD: 80, // Pixels - distance to consider sun hit (sun radius + margin)
  PLANET_HIT_THRESHOLD: 50, // Pixels - distance to consider planet hit
  
  // Planet generation
  PLANET_GENERATION: {
    MIN_RADIUS: 200, // Minimum distance from center
    MAX_RADIUS: 450, // Maximum distance from center
    MIN_DISTANCE: 180, // Minimum distance between planets
    GENERATION_ATTEMPTS: 100, // Max attempts to find valid position
    SAFE_ZONE_BOTTOM: 100, // Space for UI at bottom
    SAFE_ZONE_SIDES_MARGIN: 10, // Margin from screen edges
    SAFE_ZONE_TOP_MARGIN: 30 // Additional margin from top safe zone
  },
  
  PLANET_TYPES: {
    GENERATOR: { 
      production: 2, 
      name: 'Générateur',
      attackCostModifier: 2 // Coût d'attaque +2 (trade-off: production x2 mais attaques plus chères)
    },
    FORTRESS: { 
      production: 1, 
      defense: true, 
      name: 'Forteresse',
      attackCostModifier: -1 // Coût d'attaque -1 (bonus défensif)
    },
    LAUNCHER: { 
      production: 1, 
      speedBonus: 1.5, 
      name: 'Lanceur',
      attackCostModifier: 0 // Coût normal (bonus vitesse déjà présent)
    },
    STANDARD: { 
      production: 1, 
      name: 'Standard',
      attackCostModifier: 0 // Coût normal
    }
  }
};
