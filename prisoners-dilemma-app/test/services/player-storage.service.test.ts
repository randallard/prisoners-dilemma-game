import { expect } from '@open-wc/testing';
import { PlayerStorageService } from '../../src/services/player-storage.service';
import { PlayerErrorType } from '../../src/services/player-result';

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
    const result = service.savePlayer(playerName);
    
    // Assert
    expect(result.isSuccess()).to.be.true;
    const playerId = result.getValue();
    
    const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_player') || '{}');
    
    expect(playerId).to.be.a('string');
    expect(playerId).to.have.lengthOf(36); // UUID length
    expect(storedData.id).to.equal(playerId);
    expect(storedData.name).to.equal(playerName);
    expect(storedData.openCount).to.equal(1);
  });
  
  it('should fail to save player with empty name', () => {
    // Act
    const result = service.savePlayer('');
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.INVALID_NAME);
    expect(error.message).to.equal('Player name cannot be empty');
  });
  
  it('should retrieve player data from localStorage', () => {
    // Arrange
    const playerName = 'Test Player';
    const saveResult = service.savePlayer(playerName);
    expect(saveResult.isSuccess()).to.be.true;
    const playerId = saveResult.getValue();
    
    // Act
    const result = service.getPlayer();
    
    // Assert
    expect(result.isSuccess()).to.be.true;
    const retrievedPlayer = result.getValue();
    
    expect(retrievedPlayer).to.exist;
    expect(retrievedPlayer.id).to.equal(playerId);
    expect(retrievedPlayer.name).to.equal(playerName);
    expect(retrievedPlayer.openCount).to.equal(1);
  });
  
  it('should return failure when no player data exists', () => {
    // Act
    const result = service.getPlayer();
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.PLAYER_NOT_FOUND);
  });
  
  it('should increment openCount when player already exists', () => {
    // Arrange
    const playerName = 'Test Player';
    service.savePlayer(playerName);
    
    // Act
    const incrementResult = service.incrementOpenCount();
    
    // Assert
    expect(incrementResult.isSuccess()).to.be.true;
    
    const playerResult = service.getPlayer();
    expect(playerResult.isSuccess()).to.be.true;
    const retrievedPlayer = playerResult.getValue();
    
    expect(retrievedPlayer.openCount).to.equal(2);
  });
  
  it('should fail to increment openCount when no player exists', () => {
    // Act
    const result = service.incrementOpenCount();
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.PLAYER_NOT_FOUND);
  });
  
  it('should update player name without changing id or openCount', () => {
    // Arrange
    const originalName = 'Original Name';
    service.savePlayer(originalName);
    service.incrementOpenCount(); // openCount = 2
    
    // Act
    const newName = 'Updated Name';
    const updateResult = service.updatePlayerName(newName);
    
    // Assert
    expect(updateResult.isSuccess()).to.be.true;
    
    const playerResult = service.getPlayer();
    expect(playerResult.isSuccess()).to.be.true;
    const retrievedPlayer = playerResult.getValue();
    
    expect(retrievedPlayer.name).to.equal(newName);
    expect(retrievedPlayer.openCount).to.equal(2); // Should remain unchanged
  });
  
  it('should fail to update player name when no player exists', () => {
    // Act
    const result = service.updatePlayerName('New Name');
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.PLAYER_NOT_FOUND);
  });
  
  it('should fail to update player with empty name', () => {
    // Arrange
    service.savePlayer('Original Name');
    
    // Act
    const result = service.updatePlayerName('');
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.INVALID_NAME);
  });
  
  it('should handle localStorage failure', () => {
    // Arrange - Break localStorage
    Object.defineProperty(window, 'localStorage', {
      value: null,
      writable: true,
      configurable: true
    });
    
    // Act
    const result = service.savePlayer('Test Player');
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.STORAGE_ERROR);
  });
  
  it('should handle corrupted localStorage data', () => {
    // Arrange - Store invalid data
    mockLocalStorage.setItem('prisonersDilemma_player', 'not-a-json-string');
    
    // Act
    const result = service.getPlayer();
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.DATA_CORRUPTION);
  });
  
  it('should validate player data structure', () => {
    // Arrange - Store invalid data structure
    const invalidData = {
      id: 'test-id',
      name: 'Test Player',
      // Missing openCount
    };
    mockLocalStorage.setItem('prisonersDilemma_player', JSON.stringify(invalidData));
    
    // Act
    const result = service.getPlayer();
    
    // Assert
    expect(result.isFailure()).to.be.true;
    const error = result.getError();
    expect(error.type).to.equal(PlayerErrorType.DATA_CORRUPTION);
  });
});