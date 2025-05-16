// player-storage.service.ts
import { Result } from './connection-result';
import { PlayerError, PlayerErrorType } from './player-result';
import { UuidUtils } from './uuid-utils';
import { ConnectionData } from '../models/connection-data';

/**
 * Player data interface
 */
export interface PlayerData {
  readonly id: string;
  readonly name: string;
  readonly openCount: number;
}

/**
 * Service for storing and retrieving player data
 * Uses localStorage for persistent storage across sessions
 * Follows immutable data patterns to prevent unintended state mutations
 */
export class PlayerStorageService {
  private readonly STORAGE_KEY = 'prisonersDilemma_player';
  private readonly CONNECTION_STORAGE_KEY_PREFIX = 'prisonersDilemma_connection_';
  
  /**
   * Validates a player name
   * @param name The name to validate
   * @returns A Result with validated name or error
   */
  private validateName(name: string): Result<string, PlayerError> {
    if (!name || name.trim() === '') {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_NAME, 
          'Player name cannot be empty'
        )
      );
    }
    return Result.success(name.trim());
  }
  
  /**
   * Creates a new player data object
   * @param id The player ID
   * @param name The player name
   * @param openCount The initial open count
   * @returns A new PlayerData object
   */
  private createPlayerData(id: string, name: string, openCount: number): PlayerData {
    return {
      id,
      name,
      openCount
    };
  }
  
  /**
   * Creates a new PlayerData with incremented openCount
   * @param player The original player data
   * @returns A new PlayerData object with incremented count
   */
  private createPlayerWithIncrementedCount(player: PlayerData): PlayerData {
    return {
      ...player,
      openCount: player.openCount + 1
    };
  }
  
  /**
   * Creates a new PlayerData with updated name
   * @param player The original player data
   * @param name The new name
   * @returns A new PlayerData object with updated name
   */
  private createPlayerWithUpdatedName(player: PlayerData, name: string): PlayerData {
    return {
      ...player,
      name
    };
  }
  
  /**
   * Saves player data to localStorage
   * @param playerData The player data to save
   * @returns A Result indicating success or failure
   */
  private savePlayerData(playerData: PlayerData): Result<boolean, PlayerError> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
      return Result.success(true);
    } catch (error) {
      console.error('Failed to save player data:', error);
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          'Failed to save player data. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Saves a new player to localStorage
   * @param name The player's name
   * @returns A Result with the generated player ID, or an error
   */
  public savePlayer(name: string): Result<string, PlayerError> {
    const nameResult = this.validateName(name);
    if (nameResult.isFailure()) {
      return Result.failure(nameResult.getError());
    }
    
    try {
      // Generate a UUID for the player
      const playerId = this.generateUUID();
      
      // Create the player data object - immutable creation
      const playerData = this.createPlayerData(
        playerId,
        nameResult.getValue(),
        1
      );
      
      // Save to localStorage
      const saveResult = this.savePlayerData(playerData);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.getError());
      }
      
      return Result.success(playerId);
    } catch (error) {
      console.error('Failed to save player data:', error);
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          'Failed to save player data. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Retrieves player data from localStorage
   * @returns A Result with the player data, or an error if no data exists or data is corrupted
   */
  public getPlayer(): Result<PlayerData, PlayerError> {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (!storedData) {
        return Result.failure(
          new PlayerError(
            PlayerErrorType.PLAYER_NOT_FOUND,
            'No player data found'
          )
        );
      }
      
      try {
        const parsedData = JSON.parse(storedData);
        
        // Validate player data
        if (!this.isValidPlayerData(parsedData)) {
          return Result.failure(
            new PlayerError(
              PlayerErrorType.DATA_CORRUPTION,
              'Player data is corrupted or invalid'
            )
          );
        }
        
        // Create a new immutable player data object
        const playerData: PlayerData = this.createPlayerData(
          parsedData.id,
          parsedData.name,
          parsedData.openCount
        );
        
        return Result.success(playerData);
      } catch (error) {
        console.error('Error parsing player data:', error);
        return Result.failure(
          new PlayerError(
            PlayerErrorType.DATA_CORRUPTION,
            'Error parsing player data'
          )
        );
      }
    } catch (error) {
      console.error('Failed to retrieve player data:', error);
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          'Failed to retrieve player data. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Increments the openCount when the app is opened
   * @returns A Result indicating success or failure
   */
  public incrementOpenCount(): Result<boolean, PlayerError> {
    const playerResult = this.getPlayer();
    
    if (playerResult.isFailure()) {
      return Result.failure(playerResult.getError());
    }
    
    try {
      const playerData = playerResult.getValue();
      
      // Create a new player data object with incremented count - immutable update
      const updatedPlayerData = this.createPlayerWithIncrementedCount(playerData);
      
      // Save the updated data
      return this.savePlayerData(updatedPlayerData);
    } catch (error) {
      console.error('Failed to increment open count:', error);
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          'Failed to increment open count. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Updates the player's name
   * @param name The new player name
   * @returns A Result indicating success or failure
   */
  public updatePlayerName(name: string): Result<boolean, PlayerError> {
    const nameResult = this.validateName(name);
    if (nameResult.isFailure()) {
      return Result.failure(nameResult.getError());
    }
    
    const playerResult = this.getPlayer();
    
    if (playerResult.isFailure()) {
      return Result.failure(playerResult.getError());
    }
    
    try {
      const playerData = playerResult.getValue();
      
      // Create a new player data object with updated name - immutable update
      const updatedPlayerData = this.createPlayerWithUpdatedName(
        playerData,
        nameResult.getValue()
      );
      
      // Save the updated data
      return this.savePlayerData(updatedPlayerData);
    } catch (error) {
      console.error('Failed to update player name:', error);
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          'Failed to update player name. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Generates a UUID v4
   * @returns A UUID string
   */
  protected generateUUID(): string {
    return UuidUtils.generateUUID();
  }
  
  /**
   * Validates that an object conforms to the PlayerData interface
   * @param item The object to validate
   * @returns True if the object is valid PlayerData
   */
  private isValidPlayerData(item: any): boolean {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.openCount === 'number'
    );
  }

  /**
   * Gets a connection by ID
   * @param connectionId The connection ID to retrieve
   * @returns A Result containing the connection data or an error
   */
  public getConnection(connectionId: string): Result<ConnectionData, PlayerError> {
    if (!connectionId) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }

    try {
      const storageKey = `${this.CONNECTION_STORAGE_KEY_PREFIX}${connectionId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (!storedData) {
        return Result.failure(
          new PlayerError(
            PlayerErrorType.PLAYER_NOT_FOUND,
            `Connection with ID ${connectionId} not found`
          )
        );
      }

      const connectionData = JSON.parse(storedData) as ConnectionData;
      return Result.success(connectionData);
    } catch (error) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          `Failed to retrieve connection: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Gets all connections
   * @returns A Result containing an array of connection data or an error
   */
  public getAllConnections(): Result<ConnectionData[], PlayerError> {
    try {
      const connections: ConnectionData[] = [];
      
      // Loop through all storage keys and find connection keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CONNECTION_STORAGE_KEY_PREFIX)) {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            connections.push(JSON.parse(storedData) as ConnectionData);
          }
        }
      }
      
      return Result.success(connections);
    } catch (error) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          `Failed to retrieve connections: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Stores a new connection
   * @param connectionData The connection data to store
   * @returns A Result containing the stored connection data or an error
   */
  public storeConnection(connectionData: ConnectionData): Result<ConnectionData, PlayerError> {
    if (!connectionData || !connectionData.id) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_ID,
          'Invalid connection data'
        )
      );
    }

    try {
      const storageKey = `${this.CONNECTION_STORAGE_KEY_PREFIX}${connectionData.id}`;
      localStorage.setItem(storageKey, JSON.stringify(connectionData));
      return Result.success(connectionData);
    } catch (error) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          `Failed to store connection: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Updates an existing connection
   * @param connectionId The ID of the connection to update
   * @param updatedData The updated connection data
   * @returns A Result containing the updated connection data or an error
   */
  public updateConnection(connectionId: string, updatedData: Partial<ConnectionData>): Result<ConnectionData, PlayerError> {
    const existingResult = this.getConnection(connectionId);
    
    if (existingResult.isFailure()) {
      return existingResult;
    }

    try {
      const existingData = existingResult.getValue();
      const updatedConnectionData: ConnectionData = {
        ...existingData,
        ...updatedData,
        id: existingData.id // Ensure ID cannot be changed
      };

      const storageKey = `${this.CONNECTION_STORAGE_KEY_PREFIX}${connectionId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedConnectionData));
      return Result.success(updatedConnectionData);
    } catch (error) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          `Failed to update connection: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Deletes a connection
   * @param connectionId The ID of the connection to delete
   * @returns A Result containing success or an error
   */
  public deleteConnection(connectionId: string): Result<boolean, PlayerError> {
    if (!connectionId) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }

    try {
      const storageKey = `${this.CONNECTION_STORAGE_KEY_PREFIX}${connectionId}`;
      
      if (localStorage.getItem(storageKey) === null) {
        return Result.failure(
          new PlayerError(
            PlayerErrorType.PLAYER_NOT_FOUND,
            `Connection with ID ${connectionId} not found`
          )
        );
      }
      
      localStorage.removeItem(storageKey);
      return Result.success(true);
    } catch (error) {
      return Result.failure(
        new PlayerError(
          PlayerErrorType.STORAGE_ERROR,
          `Failed to delete connection: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }
}