/**
 * Player data interface
 */
export interface PlayerData {
  id: string;
  name: string;
  openCount: number;
}

/**
 * Service for storing and retrieving player data
 * Uses localStorage for persistent storage across sessions
 */
export class PlayerStorageService {
  private readonly STORAGE_KEY = 'prisonersDilemma_player';
  
  /**
   * Saves a new player to localStorage
   * @param name The player's name
   * @returns The generated player ID
   */
  public savePlayer(name: string): string {
    // Generate a UUID for the player
    const playerId = this.generateUUID();
    
    // Create the player data object
    const playerData: PlayerData = {
      id: playerId,
      name: name.trim(),
      openCount: 1
    };
    
    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
    
    return playerId;
  }
  
  /**
   * Retrieves player data from localStorage
   * @returns The player data, or null if no data exists
   */
  public getPlayer(): PlayerData | null {
    const storedData = localStorage.getItem(this.STORAGE_KEY);
    
    if (!storedData) {
      return null;
    }
    
    try {
      const playerData = JSON.parse(storedData) as PlayerData;
      return playerData;
    } catch (error) {
      console.error('Error parsing player data:', error);
      return null;
    }
  }
  
  /**
   * Increments the openCount when the app is opened
   */
  public incrementOpenCount(): void {
    const playerData = this.getPlayer();
    
    if (!playerData) {
      return;
    }
    
    // Increment the open count
    playerData.openCount += 1;
    
    // Save the updated data
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
  }
  
  /**
   * Updates the player's name
   * @param name The new player name
   */
  public updatePlayerName(name: string): void {
    const playerData = this.getPlayer();
    
    if (!playerData) {
      return;
    }
    
    // Update the name
    playerData.name = name.trim();
    
    // Save the updated data
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
  }
  
  /**
   * Generates a UUID v4
   * @returns A UUID string
   */
  protected generateUUID(): string {
    // Implementation of RFC4122 version 4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}