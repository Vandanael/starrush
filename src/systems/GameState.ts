export enum GameState {
  START_SCREEN = 'START_SCREEN',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export type GameStateCallback = (newState: GameState) => void;

export class GameStateManager {
  private currentState: GameState = GameState.START_SCREEN;
  private callbacks: GameStateCallback[] = [];

  public getState(): GameState {
    return this.currentState;
  }

  public setState(newState: GameState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.callbacks.forEach(callback => callback(newState));
    }
  }

  public onStateChange(callback: GameStateCallback) {
    this.callbacks.push(callback);
  }

  public isPlaying(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  public isGameOver(): boolean {
    return this.currentState === GameState.GAME_OVER;
  }

  public isStartScreen(): boolean {
    return this.currentState === GameState.START_SCREEN;
  }
}
