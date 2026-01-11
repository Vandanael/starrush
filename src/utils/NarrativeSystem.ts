import { useGameStore } from '../store/gameStore';

export class NarrativeSystem {
  public static getSunStateMessage(hp: number, cooldown: number, overcharge: number): string {
    const state = useGameStore.getState();
    const timer = state.timer;
    
    // Messages selon l'état du Soleil
    if (hp === 0) {
      return "Le Soleil est capturé...";
    }
    
    if (hp === 1) {
      if (timer <= 30) {
        return "⚠️ Le Soleil agonise... Dernière chance !";
      }
      return "Le Soleil est en danger critique...";
    }
    
    if (hp === 2) {
      if (timer <= 60) {
        return "Le Soleil s'affaiblit rapidement...";
      }
      return "Le Soleil montre des signes de faiblesse...";
    }
    
    if (cooldown > 0) {
      const cooldownSeconds = Math.ceil(cooldown / 60);
      if (cooldownSeconds >= 2) {
        return "Le Soleil se régénère... Patience...";
      }
      return "Le Soleil récupère son énergie...";
    }
    
    if (overcharge > 2) {
      return "⚡ Le Soleil surchauffe ! Attaques plus coûteuses...";
    }
    
    if (overcharge > 0) {
      return "Le Soleil commence à surchauffer...";
    }
    
    // Messages selon le timer
    if (timer <= 30) {
      return "⏰ Temps critique ! Le Soleil s'éteint...";
    }
    
    if (timer <= 60) {
      return "Le temps presse... Le Soleil perd de son éclat...";
    }
    
    return "Le Soleil attend... Qui le capturera ?";
  }
  
  public static getAttackMessage(attacker: 'player' | 'ai', hp: number): string {
    if (hp === 0) {
      return attacker === 'player' 
        ? "🌟 VICTOIRE ! Le Soleil est à toi !" 
        : "❌ DÉFAITE ! L'IA a capturé le Soleil...";
    }
    
    if (hp === 1) {
      return attacker === 'player'
        ? "💥 Dernier assaut ! Le Soleil vacille..."
        : "⚠️ L'IA frappe fort ! Le Soleil est en danger...";
    }
    
    return attacker === 'player'
      ? "⚔️ Attaque réussie ! Le Soleil perd de son énergie..."
      : "🤖 L'IA attaque ! Le Soleil résiste...";
  }
  
  public static getPlanetCaptureMessage(planetType: string, owner: 'player' | 'ai'): string {
    const messages: Record<string, { player: string; ai: string }> = {
      generator: {
        player: "⚡ Générateur capturé ! Production doublée !",
        ai: "⚠️ L'IA a pris un Générateur ! Production ennemie augmentée..."
      },
      fortress: {
        player: "🛡️ Forteresse capturée ! Défense disponible !",
        ai: "⚠️ L'IA a pris une Forteresse ! Défense ennemie active..."
      },
      launcher: {
        player: "🚀 Lanceur capturé ! Attaques plus rapides !",
        ai: "⚠️ L'IA a pris un Lanceur ! Attaques ennemies accélérées..."
      },
      standard: {
        player: "✅ Planète conquise !",
        ai: "⚠️ L'IA a conquis une planète..."
      }
    };
    
    return messages[planetType]?.[owner] || messages.standard[owner];
  }
}
