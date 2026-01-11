import { Planet, Owner, PlanetType } from '../entities/Planet';
import { GAME_CONFIG } from '../config/GameConfig';
import { UI_CONSTANTS } from '../config/UIConstants';
import { LUMINOUS_STYLE } from '../config/LuminousStyle';

export class PlanetGenerator {
  static generate(centerX: number, centerY: number): Planet[] {
    const planets: Planet[] = [];
    const { MIN_RADIUS, MAX_RADIUS, MIN_DISTANCE, GENERATION_ATTEMPTS } = GAME_CONFIG.PLANET_GENERATION;
    
    // Zone de sécurité pour éviter chevauchement avec top bar
    const SAFE_ZONE_TOP = UI_CONSTANTS.SIZES.TOP_BAR_HEIGHT + 50; // Top bar + marge
    
    // Générer positions selon PLANET_COUNT
    const positions: { x: number; y: number }[] = [];
    
    for (let i = 0; i < GAME_CONFIG.PLANET_COUNT; i++) {
      let x, y, valid;
      let attempts = 0;
      
      do {
        valid = true;
        
        // Position aléatoire dans un anneau
        const angle = Math.random() * Math.PI * 2;
        const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
        
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        
        // CRITICAL: Boundary constraints - ensure planet stays within viewport
        const planetRadius = LUMINOUS_STYLE.RENDERING.PLANET_RADIUS;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const SAFE_ZONE_BOTTOM = GAME_CONFIG.PLANET_GENERATION.SAFE_ZONE_BOTTOM;
        const SAFE_ZONE_SIDES = planetRadius + GAME_CONFIG.PLANET_GENERATION.SAFE_ZONE_SIDES_MARGIN;
        
        // Constrain X position (left and right boundaries)
        if (x < SAFE_ZONE_SIDES) {
          x = SAFE_ZONE_SIDES;
        } else if (x > screenWidth - SAFE_ZONE_SIDES) {
          x = screenWidth - SAFE_ZONE_SIDES;
        }
        
        // Constrain Y position (top and bottom boundaries)
        if (y < SAFE_ZONE_TOP) {
          y = SAFE_ZONE_TOP + GAME_CONFIG.PLANET_GENERATION.SAFE_ZONE_TOP_MARGIN;
        } else if (y > screenHeight - SAFE_ZONE_BOTTOM) {
          y = screenHeight - SAFE_ZONE_BOTTOM - planetRadius;
        }
        
        // Vérifier distance avec autres planètes
        for (const pos of positions) {
          const dx = x - pos.x;
          const dy = y - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < MIN_DISTANCE) {
            valid = false;
            break;
          }
        }
        
        attempts++;
        if (attempts > GENERATION_ATTEMPTS) {
          // Logger.warn('Trop de tentatives, position forcée'); // Cas rare, pas besoin de log
          valid = true;
        }
      } while (!valid);
      
      positions.push({ x, y });
    }
    
    // Distribution des types: 2 Générateurs, 2 Forteresses, 2 Lanceurs, 2 Standard
    const types: PlanetType[] = ['generator', 'generator', 'fortress', 'fortress', 
                                  'launcher', 'launcher', 'standard', 'standard'];
    
    // Mélanger les types
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    
    // Créer les planètes
    // 0 = joueur, 1 = IA, 2-7 = neutres
    positions.forEach((pos, index) => {
      let owner: Owner;
      
      if (index === 0) owner = 'player';
      else if (index === 1) owner = 'ai';
      else owner = 'neutral';
      
      const type = types[index];
      const planet = new Planet(pos.x, pos.y, owner, index, type);
      
      // Ajouter vaisseaux initiaux pour réduire temps morts
      if (owner !== 'neutral') {
        planet.addShips(GAME_CONFIG.INITIAL_SHIPS);
      }
      
      planets.push(planet);
    });
    
    return planets;
  }
}
