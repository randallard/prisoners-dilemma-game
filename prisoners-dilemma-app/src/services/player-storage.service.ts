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
        console.log('savePlayer called with name:', name);
        
        // Generate a UUID for the player
        const playerId = this.generateUUID();
        console.log('Generated player ID:', playerId);
        
        // Create the player data object
        const playerData: PlayerData = {
          id: playerId,
          name: name.trim(),
          openCount: 1
        };
        console.log('Created player data object:', playerData);
        
        // Save to localStorage
        try {
          console.log('About to save to localStorage with key:', this.STORAGE_KEY);
          const dataString = JSON.stringify(playerData);
          console.log('Serialized data:', dataString);
          localStorage.setItem(this.STORAGE_KEY, dataString);
          console.log('localStorage.setItem completed');
          
          // Verify it was saved
          const savedData = localStorage.getItem(this.STORAGE_KEY);
          console.log('Verification - data in localStorage:', savedData);
          if (!savedData) {
            throw new Error('Verification failed - data not found in localStorage after save');
          }
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          throw error;
        }
        
        return playerId;
      }
    
      /**
       * Retrieves player data from localStorage
       * @returns The player data, or null if no data exists
       */
      public getPlayer(): PlayerData | null {
        console.log('getPlayer called, checking localStorage with key:', this.STORAGE_KEY);
        
        try {
          const storedData = localStorage.getItem(this.STORAGE_KEY);
          console.log('Raw data retrieved from localStorage:', storedData);
          
          if (!storedData) {
            console.log('No player data found in localStorage');
            return null;
          }
          
          try {
            const playerData = JSON.parse(storedData) as PlayerData;
            console.log('Successfully parsed player data:', playerData);
            return playerData;
          } catch (parseError) {
            console.error('Error parsing player data:', parseError);
            // If we can't parse, clear the corrupted data
            localStorage.removeItem(this.STORAGE_KEY);
            return null;
          }
        } catch (error) {
          console.error('Error accessing localStorage:', error);
          return null;
        }
      }
    
    /**
     * Increments the openCount when the app is opened
     */
    public incrementOpenCount(): void {
      console.log('incrementOpenCount called');
      const playerData = this.getPlayer();
      
      if (!playerData) {
        console.log('No player data found, nothing to increment');
        return;
      }
      
      // Increment the open count
      playerData.openCount += 1;
      console.log('Incremented open count to:', playerData.openCount);
      
      // Save the updated data
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
        console.log('Updated player data saved with incremented open count');
      } catch (error) {
        console.error('Error saving incremented open count:', error);
      }
    }
    
    /**
     * Updates the player's name
     * @param name The new player name
     */
    public updatePlayerName(name: string): void {
      console.log('updatePlayerName called with:', name);
      const playerData = this.getPlayer();
      
      if (!playerData) {
        console.log('No player data found, nothing to update');
        return;
      }
      
      // Update the name
      playerData.name = name.trim();
      console.log('Updated player name to:', playerData.name);
      
      // Save the updated data
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playerData));
        console.log('Updated player data saved with new name');
      } catch (error) {
        console.error('Error saving updated player name:', error);
      }
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

    public static testLocalStorage(): void {
      console.log('Testing localStorage directly');
      try {
        // Test basic localStorage functionality
        localStorage.setItem('test_key', 'test_value');
        const retrieved = localStorage.getItem('test_key');
        console.log('Test localStorage value retrieved:', retrieved);
        
        // Test with an object
        const testObj = { id: '123', name: 'Test', count: 1 };
        localStorage.setItem('test_obj', JSON.stringify(testObj));
        const retrievedObj = localStorage.getItem('test_obj');
        console.log('Test object retrieved:', retrievedObj);
        
        // Parse the retrieved object
        try {
          const parsedObj = JSON.parse(retrievedObj || '');
          console.log('Parsed object:', parsedObj);
        
          // Clean up
          localStorage.removeItem('test_key');
          localStorage.removeItem('test_obj');
          console.log('Test localStorage entries cleaned up');
        } catch (e) {
          console.error('Error parsing retrieved object:', e);
        }
      } catch (error) {
        console.error('Error in localStorage test:', error);
        console.log('localStorage may not be available in this environment');
      }
    }    
  }