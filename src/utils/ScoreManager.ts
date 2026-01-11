const BEST_SCORE_KEY = 'starrush_best_score';

export interface GameScore {
  planetsOwned: number;
  timeRemaining: number;
  planetsConquered: number;
  attacksLaunched: number;
  isVictory: boolean;
  total: number;
}

export class ScoreManager {
  public static calculateScore(
    planetsOwned: number,
    timeRemaining: number,
    planetsConquered: number,
    attacksLaunched: number,
    isVictory: boolean
  ): GameScore {
    // Formule de score :
    // - Planètes possédées * 50 (max 400 pour 8 planètes)
    // - Temps restant * 2 (max 240 pour 2 minutes)
    // - Planètes conquises * 30
    // - Victoire bonus : +500
    
    const planetsScore = planetsOwned * 50;
    const timeScore = timeRemaining * 2;
    const conquestScore = planetsConquered * 30;
    const victoryBonus = isVictory ? 500 : 0;
    
    const total = planetsScore + timeScore + conquestScore + victoryBonus;
    
    return {
      planetsOwned,
      timeRemaining,
      planetsConquered,
      attacksLaunched,
      isVictory,
      total
    };
  }
  
  public static getBestScore(): number {
    try {
      const stored = localStorage.getItem(BEST_SCORE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }
  
  public static saveBestScore(score: number): boolean {
    const currentBest = this.getBestScore();
    
    if (score > currentBest) {
      try {
        localStorage.setItem(BEST_SCORE_KEY, score.toString());
        return true; // Nouveau record !
      } catch {
        return false;
      }
    }
    
    return false;
  }
  
  public static formatScore(score: number): string {
    return score.toString().padStart(5, '0');
  }
}
