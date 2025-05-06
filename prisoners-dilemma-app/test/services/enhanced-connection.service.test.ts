import { expect } from '@open-wc/testing';
import { ConnectionService, ConnectionStatus, ConnectionData } from '../../src/services/enhanced-connection.service';
import { ConnectionErrorType } from '../../src/services/connection-result';

describe('EnhancedConnectionService', () => {
  let service: ConnectionService;
  
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
    service = new ConnectionService();
  });
  
  describe('Data validation', () => {
    it('should handle invalid data in localStorage', () => {
      // Arrange - Store invalid data
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify({ notAnArray: true }));
      
      // Act
      const result = service.getConnections();
      
      // Assert - Should return empty array instead of failing
      expect(result.isSuccess()).to.be.true;
      const connections = result.getValue();
      
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(0);
    });
    
    it('should filter out invalid connection objects', () => {
      // Arrange - Store array with invalid items
      const invalidItems = [
        { id: 'valid-id', name: 'Valid Name', status: ConnectionStatus.PENDING, initiatedByMe: true, createdAt: Date.now() }, // Valid
        { id: 'missing-props' }, // Invalid - missing properties
        { id: 123, name: 'Invalid ID Type' }, // Invalid - wrong type
        null, // Invalid - null
        'not-an-object' // Invalid - string
      ];
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify(invalidItems));
      
      // Act
      const result = service.getConnections();
      
      // Assert - Should only return the valid item
      expect(result.isSuccess()).to.be.true;
      const connections = result.getValue();
      
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(1);
      expect(connections[0].id).to.equal('valid-id');
    });
  });
  
  describe('deleteConnection', () => {
    it('should delete a connection', () => {
      // Arrange
      const friendName = 'Test Friend';
      const connectionLinkResult = service.generateConnectionLink(friendName);
      expect(connectionLinkResult.isSuccess()).to.be.true;
      
      const connectionLink = connectionLinkResult.getValue();
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      // Act
      const result = service.deleteConnection(connectionId);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      expect(result.getValue()).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      expect(storedData.length).to.equal(0);
    });
    
    it('should return failure when deleting a non-existent connection', () => {
      // Act
      const result = service.deleteConnection('non-existent-id');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.CONNECTION_NOT_FOUND);
    });
    
    it('should return failure when called with an empty ID', () => {
      // Act
      const result = service.deleteConnection('');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_ID);
      expect(error.message).to.equal('Connection ID cannot be empty');
    });
  });
  
  describe('registerIncomingConnection', () => {
    it('should handle an incoming connection request', () => {
      // Arrange
      const connectionId = 'incoming-connection-id';
      const externalFriendName = 'External Friend';
      
      // Act - Register the incoming connection
      const result = service.registerIncomingConnection(connectionId, externalFriendName);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      expect(result.getValue()).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(externalFriendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.PENDING);
      expect(storedData[0].initiatedByMe).to.be.false;
    });
    
    it('should return failure when registering a connection with an empty ID', () => {
      // Act
      const result = service.registerIncomingConnection('', 'Friend');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_ID);
      expect(error.message).to.equal('Connection ID cannot be empty');
    });
    
    it('should return failure when registering a connection with an empty name', () => {
      // Act
      const result = service.registerIncomingConnection('test-id', '');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_NAME);
      expect(error.message).to.equal('Friend name cannot be empty');
    });
    
    it('should return failure when registering a connection that already exists', () => {
      // Arrange
      const connectionId = 'existing-connection-id';
      const result1 = service.registerIncomingConnection(connectionId, 'Friend');
      expect(result1.isSuccess()).to.be.true;
      
      // Act
      const result2 = service.registerIncomingConnection(connectionId, 'Another Friend');
      
      // Assert
      expect(result2.isFailure()).to.be.true;
      const error = result2.getError();
      expect(error.type).to.equal(ConnectionErrorType.CONNECTION_EXISTS);
      expect(error.message).to.equal('Connection with this ID already exists');
      
      // Verify the first connection was not overwritten
      const connectionResult = service.getConnectionById(connectionId);
      expect(connectionResult.isSuccess()).to.be.true;
      const connection = connectionResult.getValue();
      expect(connection.name).to.equal('Friend'); // Should still have the original name
    });
  });
  
  describe('generateConnectionLink', () => {
    it('should generate a unique connection link', () => {
      // Act
      const result = service.generateConnectionLink('Friend Name');
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const connectionLink = result.getValue();
      
      expect(connectionLink).to.be.a('string');
      expect(connectionLink).to.include('connection=');
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection');
      
      expect(connectionId).to.be.a('string');
      expect(connectionId).to.have.lengthOf(36); // UUID length
    });
    
    it('should store connection data when generating a link', () => {
      // Arrange
      const friendName = 'Test Friend';
      
      // Act
      const result = service.generateConnectionLink(friendName);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const connectionLink = result.getValue();
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData).to.be.an('array');
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(friendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.PENDING);
      expect(storedData[0].initiatedByMe).to.be.true;
      expect(storedData[0].createdAt).to.be.a('number');
    });
    
    it('should return failure when generating a link with an empty friend name', () => {
      // Act
      const result = service.generateConnectionLink('');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_NAME);
      expect(error.message).to.equal('Friend name cannot be empty');
    });

    it('should return failure when localStorage is not available', () => {
      // Arrange - Break localStorage
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true,
        configurable: true
      });
      
      // Act
      const result = service.generateConnectionLink('Test Friend');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.STORAGE_ERROR);
    });
  });
  
  describe('getConnections', () => {
    it('should retrieve all connections from localStorage', () => {
      // Arrange
      const friendName1 = 'Test Friend 1';
      const friendName2 = 'Test Friend 2';
      
      service.generateConnectionLink(friendName1);
      service.generateConnectionLink(friendName2);
      
      // Act
      const result = service.getConnections();
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const connections = result.getValue();
      
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(2);
      expect(connections[0].name).to.equal(friendName1);
      expect(connections[1].name).to.equal(friendName2);
    });
    
    it('should return an empty array when no connections exist', () => {
      // Act
      const result = service.getConnections();
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const connections = result.getValue();
      
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(0);
    });
    
    it('should return failure when localStorage data is corrupted', () => {
      // Arrange - Store invalid data
      mockLocalStorage.setItem('prisonersDilemma_connections', 'not-a-json-string');
      
      // Act
      const result = service.getConnections();
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.STORAGE_ERROR);
    });
  });
  
  describe('getConnectionById', () => {
    it('should retrieve a specific connection by ID', () => {
      // Arrange
      const friendName = 'Test Friend';
      const connectionLinkResult = service.generateConnectionLink(friendName);
      expect(connectionLinkResult.isSuccess()).to.be.true;
      
      const connectionLink = connectionLinkResult.getValue();
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      // Act
      const result = service.getConnectionById(connectionId);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const connection = result.getValue();
      
      expect(connection).to.exist;
      expect(connection.id).to.equal(connectionId);
      expect(connection.name).to.equal(friendName);
    });
    
    it('should return failure if connection ID does not exist', () => {
      // Act
      const result = service.getConnectionById('non-existent-id');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.CONNECTION_NOT_FOUND);
    });
    
    it('should return failure when called with an empty ID', () => {
      // Act
      const result = service.getConnectionById('');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_ID);
      expect(error.message).to.equal('Connection ID cannot be empty');
    });
  });
  
  describe('getConnectionsByStatus', () => {
    it('should filter connections by status', () => {
      // Arrange
      // Create one pending and one active connection
      const pendingFriendName = 'Pending Friend';
      const pendingConnectionLinkResult = service.generateConnectionLink(pendingFriendName);
      expect(pendingConnectionLinkResult.isSuccess()).to.be.true;
      
      const activeFriendName = 'Active Friend';
      const activeConnectionLinkResult = service.generateConnectionLink(activeFriendName);
      expect(activeConnectionLinkResult.isSuccess()).to.be.true;
      
      // Extract the active connection ID and set it to active
      const url = new URL(activeConnectionLinkResult.getValue());
      const activeConnectionId = url.searchParams.get('connection') as string;
      
      // Manually update the connection status
      const connections = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      connections.find((c: any) => c.id === activeConnectionId).status = ConnectionStatus.ACTIVE;
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify(connections));
      
      // Act
      const pendingResult = service.getConnectionsByStatus(ConnectionStatus.PENDING);
      const activeResult = service.getConnectionsByStatus(ConnectionStatus.ACTIVE);
      
      // Assert
      expect(pendingResult.isSuccess()).to.be.true;
      expect(activeResult.isSuccess()).to.be.true;
      
      const pendingConnections = pendingResult.getValue();
      const activeConnections = activeResult.getValue();
      
      expect(pendingConnections.length).to.equal(1);
      expect(pendingConnections[0].name).to.equal(pendingFriendName);
      
      expect(activeConnections.length).to.equal(1);
      expect(activeConnections[0].name).to.equal(activeFriendName);
    });
    
    it('should return an empty array when no connections match the status', () => {
      // Arrange
      service.generateConnectionLink('Friend');
      
      // Act
      const result = service.getConnectionsByStatus(ConnectionStatus.ACTIVE);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      const activeConnections = result.getValue();
      
      expect(activeConnections).to.be.an('array');
      expect(activeConnections.length).to.equal(0);
    });
    
    it('should return failure when called with an invalid status', () => {
      // Act
      const result = service.getConnectionsByStatus('invalid-status' as ConnectionStatus);
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_STATUS);
    });
  });
  
  describe('acceptConnection', () => {
    it('should accept a connection request', () => {
      // Arrange - Create a fake connection in localStorage as if it was initiated by someone else
      const connectionId = 'test-connection-id';
      const externalFriendName = 'External Friend';
      const connections = [{
        id: connectionId,
        name: externalFriendName,
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now()
      }];
      
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify(connections));
      
      // Act - Accept the connection
      const result = service.acceptConnection(connectionId);
      
      // Assert
      expect(result.isSuccess()).to.be.true;
      expect(result.getValue()).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(externalFriendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.ACTIVE);
    });
    
    it('should return failure when accepting a non-existent connection', () => {
      // Act
      const result = service.acceptConnection('non-existent-id');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.CONNECTION_NOT_FOUND);
    });
    
    it('should return failure when called with an empty ID', () => {
      // Act
      const result = service.acceptConnection('');
      
      // Assert
      expect(result.isFailure()).to.be.true;
      const error = result.getError();
      expect(error.type).to.equal(ConnectionErrorType.INVALID_ID);
      expect(error.message).to.equal('Connection ID cannot be empty');
    });
  });
});