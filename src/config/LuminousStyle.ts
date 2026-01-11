/**
 * LUMINOUS ABSTRACT - Premium Mobile Game Aesthetic
 * Inspired by Rymdkapsel, Mini Metro
 * 
 * Design Philosophy:
 * - Mobile First: Big, clear, readable on 5-inch screens
 * - Radical Minimalism: Remove all non-essential pixels
 * - Matte vs Light: Flat matte background, luminous active entities
 */

export const LUMINOUS_STYLE = {
  // PALETTE "LUMINOUS ABSTRACT"
  COLORS: {
    // Background: Deep Space (NOT black - desaturated indigo/slate)
    BACKGROUND: 0x1a1f2e,        // Deep Space - très foncé, désaturé indigo
    BACKGROUND_SECONDARY: 0x252b3a, // Légèrement plus clair pour variété
    
    // Sun: Symbolic Source - flat, warning orange/gold
    SUN_CORE: 0xff8800,          // Warning Orange - plat, symbolique
    SUN_GLOW: 0xff6600,          // Orange plus foncé pour contraste
    SUN_DYING: 0xff4444,         // Rouge si mourant
    
    // Player: Electric Mint/Cyan - pops instantly
    PLAYER: 0x00ffcc,            // Electric Mint/Cyan - très lumineux
    PLAYER_BRIGHT: 0x66ffdd,     // Version encore plus lumineuse pour glow
    
    // Enemy: Magenta/Coral Red - distinct, dangerous
    AI: 0xff3366,                // Magenta/Coral Red - distinct et dangereux
    AI_BRIGHT: 0xff6699,         // Version lumineuse
    
    // Neutral: Subtle gray (will be rendered as outlined ring)
    NEUTRAL: 0x6b7280,           // Gris subtil
    
    // UI: Floating, no boxes
    UI_TEXT: 0xffffff,           // Blanc pur pour contraste max
    UI_TEXT_SECONDARY: 0xcccccc, // Gris clair pour secondaire
    UI_WARNING: 0xffaa00,        // Orange pour warnings
    UI_DANGER: 0xff3366,         // Même que AI pour cohérence
  },
  
  // RENDERING RULES
  RENDERING: {
    // Planets
    PLANET_RADIUS: 45,           // Plus gros pour mobile (40 -> 45)
    PLANET_OWNED_STROKE: 0,      // Filled circle (no stroke)
    PLANET_NEUTRAL_STROKE: 3,    // Outlined ring (stroke only, no fill)
    PLANET_NEUTRAL_ALPHA: 0.6,   // Transparence pour ring neutre
    
    // Sun
    SUN_RADIUS: 90,              // Plus gros, symbolique
    SUN_FLAT: true,              // Pas de gradient, plat
    SUN_NO_GLOW: false,          // Glow minimal si nécessaire
    
    // UI
    UI_NO_BOXES: true,           // Pas de boîtes/borders
    UI_FLOATING_TEXT: true,      // Texte flottant uniquement
    UI_FONT_SIZE_LARGE: 32,      // Gros pour mobile
    UI_FONT_SIZE_MEDIUM: 24,
    UI_FONT_SIZE_NORMAL: 18,
    
    // Effects
    GLOW_INTENSITY: 0.15,        // Glow très subtil (0.3 -> 0.15)
    GLOW_ONLY_ACTIVE: true,      // Glow seulement sur entités actives
  },
  
  // MOBILE FIRST
  MOBILE: {
    MIN_TOUCH_SIZE: 44,          // Taille minimum pour touch (Apple HIG)
    TEXT_MIN_SIZE: 16,           // Texte minimum lisible
    SPACING_LARGE: 32,           // Espacements généreux
    SPACING_MEDIUM: 20,
    SPACING_SMALL: 12,
  }
};
