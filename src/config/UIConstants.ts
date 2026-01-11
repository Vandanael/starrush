/**
 * Constantes UI pour cohérence visuelle
 */
export const UI_CONSTANTS = {
  // Breakpoints responsive
  BREAKPOINTS: {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024
  },
  
  // Helpers responsive
  RESPONSIVE: {
    isMobile: (width: number) => width < 480,
    isTablet: (width: number) => width >= 480 && width < 768,
    isDesktop: (width: number) => width >= 768,
    
    // Fonction pour obtenir taille de police responsive
    getFontSize: (baseSize: number, screenWidth: number) => {
      if (screenWidth < 480) return Math.floor(baseSize * 0.75); // Mobile
      if (screenWidth < 768) return Math.floor(baseSize * 0.9);  // Tablet
      return baseSize; // Desktop
    },
    
    // Fonction pour obtenir valeur responsive
    getValue: (mobile: number, tablet: number, desktop: number, screenWidth: number) => {
      if (screenWidth < 480) return mobile;
      if (screenWidth < 768) return tablet;
      return desktop;
    }
  },
  
  // Couleurs
  COLORS: {
    // Joueur
    PLAYER_PRIMARY: 0x3b82f6,
    PLAYER_SECONDARY: 0x2563eb,
    PLAYER_GLOW: 0x60a5fa,
    
    // IA
    AI_PRIMARY: 0xef4444,
    AI_SECONDARY: 0xdc2626,
    AI_GLOW: 0xf87171,
    
    // Neutre
    NEUTRAL: 0x6b7280,
    
    // UI
    BACKGROUND: 0x0a0a0a,
    UI_BACKGROUND: 0x1a1a1a, // Amélioré pour meilleur contraste
    UI_BACKGROUND_ALPHA: 0.7,
    TEXT_PRIMARY: 0xffffff,
    TEXT_SECONDARY: 0x9ca3af,
    TEXT_WARNING: 0xfbbf24,
    TEXT_DANGER: 0xef4444,
    TEXT_SUCCESS: 0x22c55e,
    
    // Soleil
    SUN_NORMAL: 0xffc800,
    SUN_ORANGE: 0xff8800,
    SUN_DANGER: 0xff4444,
    SUN_ATTACKABLE: 0xfbbf24,
    
    // HP Bar
    HP_FULL: 0x22c55e,
    HP_MEDIUM: 0xfbbf24,
    HP_LOW: 0xef4444,
  },
  
  // Convention emojis (cohérence)
  EMOJI: {
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    STAR: '🌟',
    TIMER: '⏳',
    LIGHTNING: '⚡',
    TROPHY: '🏆',
    // Utiliser uniquement pour alertes importantes, indicateurs d'état, messages de victoire/défaite
  },
  
  // Typographie (tailles de base, utiliser RESPONSIVE.getFontSize pour adaptation)
  TYPOGRAPHY: {
    TITLE_SIZE: 72,
    LARGE_SIZE: 32,
    MEDIUM_SIZE: 24,
    NORMAL_SIZE: 16,
    SMALL_SIZE: 14,
    FONT_FAMILY: 'Arial, sans-serif',
    
    // Helpers pour obtenir tailles responsive
    getTitleSize: (screenWidth: number) => UI_CONSTANTS.RESPONSIVE.getFontSize(72, screenWidth),
    getLargeSize: (screenWidth: number) => UI_CONSTANTS.RESPONSIVE.getFontSize(32, screenWidth),
    getMediumSize: (screenWidth: number) => UI_CONSTANTS.RESPONSIVE.getFontSize(24, screenWidth),
    getNormalSize: (screenWidth: number) => UI_CONSTANTS.RESPONSIVE.getFontSize(16, screenWidth),
    getSmallSize: (screenWidth: number) => UI_CONSTANTS.RESPONSIVE.getFontSize(14, screenWidth),
  },
  
  // Espacements
  SPACING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
  },
  
  // Tailles UI
  SIZES: {
    TOP_BAR_HEIGHT: 70,
    HP_BAR_WIDTH: 180,
    HP_BAR_HEIGHT: 20,
    BUTTON_HEIGHT: 60,
    BUTTON_PADDING: 15,
  },
  
  // Animations
  ANIMATIONS: {
    PULSE_SPEED: 0.1,
    FADE_SPEED: 0.05,
    SHAKE_DURATION: 0.3,
  },
};
