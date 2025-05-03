import { expect } from '@open-wc/testing';
import { PlayerStorageService } from '../../src/services/player-storage.service';

describe('PlayerStorageService', () => {
  let service: PlayerStorageService;
  
  // Create a mock localStorage for testing
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();
  
  // Replace the global localStorage with our mock version before each test
  beforeEach(() => {
    // Replace with mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
    
    // Clear mock localStorage before each test
    mockLocalStorage.clear();
    
    // Create a fresh service instance before each test
    service = new PlayerStorageService();
  });
  
  it('should save player data to localStorage', () => {
    // Arrange
    const playerName = 'Test Player';
    
    // Act
    const playerId = service.savePlayer(playerName);
    
    // Assert
    const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_player') || '{}');
    
    expect(playerId).to.be.a('string');
    expect(playerId).to.have.lengthOf(36); // UUID length
    expect(storedData.id).to.equal(playerId);
    expect(storedData.name).to.equal(playerName);
    expect(storedData.openCount).to.equal(1);
  });
  
  it('should retrieve player data from localStorage', () => {
    // Arrange
    const playerName = 'Test Player';
    const playerId = service.savePlayer(playerName);
    
    // Act
    const retrievedPlayer = service.getPlayer();
    
    // Assert
    expect(retrievedPlayer).to.exist;
    expect(retrievedPlayer?.id).to.equal(playerId);
    expect(retrievedPlayer?.name).to.equal(playerName);
    expect(retrievedPlayer?.openCount).to.equal(1);
  });
  
  it('should return null when no player data exists', () => {
    // Act
    const retrievedPlayer = service.getPlayer();
    
    // Assert
    expect(retrievedPlayer).to.be.null;
  });
  
  it('should increment openCount when player already exists', () => {
    // Arrange
    const playerName = 'Test Player';
    const playerId = service.savePlayer(playerName);
    
    // Act
    // Simulate app restart by creating a new service instance
    const newService = new PlayerStorageService();
    newService.incrementOpenCount();
    
    // Assert
    const retrievedPlayer = newService.getPlayer();
    expect(retrievedPlayer?.id).to.equal(playerId);
    expect(retrievedPlayer?.name).to.equal(playerName);
    expect(retrievedPlayer?.openCount).to.equal(2);
  });
  
  it('should update player name without changing id or openCount', () => {
    // Arrange
    const originalName = 'Original Name';
    const playerId = service.savePlayer(originalName);
    service.incrementOpenCount(); // openCount = 2
    
    // Act
    const newName = 'Updated Name';
    service.updatePlayerName(newName);
    
    // Assert
    const retrievedPlayer = service.getPlayer();
    expect(retrievedPlayer?.id).to.equal(playerId);
    expect(retrievedPlayer?.name).to.equal(newName);
    expect(retrievedPlayer?.openCount).to.equal(2); // Should remain unchanged
  });
});