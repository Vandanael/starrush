import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GAME_CONFIG, GAME_MODES, GameMode, TimeAttackMode, TIME_ATTACK_MODES } from '../config/GameConfig';

export type Owner = 'player' | 'ai' | 'neutral';

interface GameState {
  // Mode de jeu
  gameMode: GameMode;
  timeAttackMode: TimeAttackMode | null;
  setGameMode: (mode: GameMode) => void;
  setTimeAttackMode: (mode: TimeAttackMode | null) => void;
  
  // Soleil
  sunHP: number;
  sunOwner: Owner | null;
  sunAttackCooldown: number; // Cooldown pour attaques sur le Soleil (joueur)
  sunAIAttackCooldown: number; // Cooldown pour attaques sur le Soleil (IA)
  sunOvercharge: number; // Overcharge actuelle (coût supplémentaire)
  lastSunAttackTime: number; // Timestamp de la dernière attaque sur le Soleil (joueur)
  lastSunAIAttackTime: number; // Timestamp de la dernière attaque sur le Soleil (IA)
  
  // Jeu
  timer: number;
  captureTime: number; // Temps de capture en secondes (pour Time Attack)
  
  // Stats pour score
  attacksLaunched: number;
  planetsConquered: number;
  
  // Actions soleil
  damageSun: (attacker: Owner) => void;
  captureSun: (owner: Owner) => void;
  updateSunCooldown: (delta: number) => void;
  canAttackSun: (owner: Owner) => boolean;
  getSunAttackCost: () => number;
  registerSunAttack: (owner: Owner) => void;
  
  // Actions jeu
  decrementTimer: () => void;
  incrementAttacks: () => void;
  incrementConquests: () => void;
  
  // Reset
  reset: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Mode de jeu
      gameMode: 'classic',
      timeAttackMode: null,
      setGameMode: (mode: GameMode) => {
        let duration = GAME_MODES.CLASSIC.duration;
        if (mode === 'quick') {
          duration = GAME_MODES.QUICK.duration;
        } else if (mode === 'timeattack' && get().timeAttackMode) {
          duration = TIME_ATTACK_MODES[get().timeAttackMode!];
        }
        set({ 
          gameMode: mode,
          timer: duration
        });
      },
      setTimeAttackMode: (mode: TimeAttackMode | null) => {
        set({ 
          timeAttackMode: mode,
          gameMode: mode ? 'timeattack' : 'classic',
          timer: mode ? TIME_ATTACK_MODES[mode] : GAME_MODES.CLASSIC.duration
        });
      },
      
      // État initial soleil
      sunHP: 3,
      sunOwner: null,
      sunAttackCooldown: 0,
      sunAIAttackCooldown: 0,
      sunOvercharge: 0,
      lastSunAttackTime: 0,
      lastSunAIAttackTime: 0,
      
      // État initial jeu
      timer: 120, // 2 minutes (sera remplacé par mode)
      captureTime: 0, // Temps de capture (pour Time Attack)
      
      // Stats
      attacksLaunched: 0,
      planetsConquered: 0,
      
      // Actions soleil
      damageSun: (attacker) => {
        const state = get();
        if (state.sunHP > 0) {
          const newHP = state.sunHP - 1;
          set({ sunHP: newHP });
          
          // Si HP = 0, capturer
          if (newHP === 0) {
            set({ sunOwner: attacker });
          }
        }
      },
      
      captureSun: (owner) => {
        set({ sunOwner: owner, sunHP: 0 });
      },
      
      updateSunCooldown: (delta: number) => {
        const state = get();
        
        // Décrémenter cooldowns
        const newCooldown = Math.max(0, state.sunAttackCooldown - delta);
        const newAICooldown = Math.max(0, state.sunAIAttackCooldown - delta);
        
        // Décroissance de l'overcharge
        const overchargeDecay = GAME_CONFIG.SUN_OVERCHARGE_DECAY * (delta / 60); // Par seconde
        const newOvercharge = Math.max(0, state.sunOvercharge - overchargeDecay);
        
        set({ 
          sunAttackCooldown: newCooldown,
          sunAIAttackCooldown: newAICooldown,
          sunOvercharge: newOvercharge
        });
      },
      
      canAttackSun: (owner: Owner) => {
        const state = get();
        if (state.sunOwner !== null) return false; // Déjà capturé
        
        if (owner === 'player') {
          return state.sunAttackCooldown <= 0;
        } else {
          return state.sunAIAttackCooldown <= 0;
        }
      },
      
      getSunAttackCost: () => {
        const state = get();
        const baseCost = GAME_CONFIG.ATTACK_COST_BASE;
        const overchargeCost = Math.floor(state.sunOvercharge * GAME_CONFIG.SUN_OVERCHARGE_MULTIPLIER);
        return baseCost + overchargeCost;
      },
      
      registerSunAttack: (owner: Owner) => {
        const state = get();
        const now = Date.now();
        
        // Calculer overcharge basée sur le temps depuis la dernière attaque
        let timeSinceLastAttack = Infinity;
        if (owner === 'player' && state.lastSunAttackTime > 0) {
          timeSinceLastAttack = (now - state.lastSunAttackTime) / 1000; // En secondes
        } else if (owner === 'ai' && state.lastSunAIAttackTime > 0) {
          timeSinceLastAttack = (now - state.lastSunAIAttackTime) / 1000;
        }
        
        // Si attaque rapide (< 5 secondes), augmenter overcharge
        let newOvercharge = state.sunOvercharge;
        if (timeSinceLastAttack < 5) {
          newOvercharge = state.sunOvercharge + GAME_CONFIG.SUN_OVERCHARGE_MULTIPLIER;
        }
        
        // Réinitialiser cooldown
        if (owner === 'player') {
          set({ 
            sunAttackCooldown: GAME_CONFIG.SUN_ATTACK_COOLDOWN,
            sunOvercharge: newOvercharge,
            lastSunAttackTime: now
          });
        } else {
          set({ 
            sunAIAttackCooldown: GAME_CONFIG.SUN_ATTACK_COOLDOWN,
            sunOvercharge: newOvercharge,
            lastSunAIAttackTime: now
          });
        }
      },
      
      // Actions jeu
      decrementTimer: () => 
        set((state) => ({ timer: Math.max(0, state.timer - 1) })),
      
      incrementAttacks: () =>
        set((state) => ({ attacksLaunched: state.attacksLaunched + 1 })),
      
      incrementConquests: () =>
        set((state) => ({ planetsConquered: state.planetsConquered + 1 })),
      
      // Reset
      reset: () => {
        const state = get();
        const modeConfig = state.gameMode === 'quick' ? GAME_MODES.QUICK : GAME_MODES.CLASSIC;
        set({ 
          sunHP: 3, 
          sunOwner: null, 
          timer: modeConfig.duration, 
          attacksLaunched: 0, 
          planetsConquered: 0,
          sunAttackCooldown: 0,
          sunAIAttackCooldown: 0,
          sunOvercharge: 0,
          lastSunAttackTime: 0,
          lastSunAIAttackTime: 0
        });
      },
      
      resetGame: () => {
        const state = get();
        const modeConfig = state.gameMode === 'quick' ? GAME_MODES.QUICK : GAME_MODES.CLASSIC;
        set({ 
          sunHP: 3, 
          sunOwner: null, 
          timer: modeConfig.duration, 
          attacksLaunched: 0, 
          planetsConquered: 0,
          sunAttackCooldown: 0,
          sunAIAttackCooldown: 0,
          sunOvercharge: 0,
          lastSunAttackTime: 0,
          lastSunAIAttackTime: 0
        });
      }
    }),
    { name: 'StarRush' }
  )
);
