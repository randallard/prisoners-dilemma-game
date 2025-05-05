import { expect } from '@open-wc/testing';
import { ConnectionService, ConnectionData, ConnectionStatus } from '../../src/services/connection.service';

describe('ConnectionService', () => {
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
  
  describe('generateConnectionLink', () => {
    it('should generate a unique connection link', () => {
      // Act
      const connectionLink = service.generateConnectionLink('Friend Name');
      
      // Assert
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
      const connectionLink = service.generateConnectionLink(friendName);
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      // Assert
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData).to.be.an('array');
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(friendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.PENDING);
      expect(storedData[0].initiatedByMe).to.be.true;
      expect(storedData[0].createdAt).to.be.a('number');
    });
    
    it('should throw an error when generating a link with an empty friend name', () => {
      // Assert
      expect(() => service.generateConnectionLink('')).to.throw('Friend name cannot be empty');
    });

    it('should throw an error when localStorage is not available', () => {
      // Arrange - Break localStorage
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: true,
        configurable: true
      });
      
      // Assert
      expect(() => service.generateConnectionLink('Test Friend')).to.throw();
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
      const connections = service.getConnections();
      
      // Assert
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(2);
      expect(connections[0].name).to.equal(friendName1);
      expect(connections[1].name).to.equal(friendName2);
    });
    
    it('should return an empty array when no connections exist', () => {
      // Act
      const connections = service.getConnections();
      
      // Assert
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(0);
    });
    
    it('should handle corrupted localStorage data', () => {
      // Arrange - Store invalid data
      mockLocalStorage.setItem('prisonersDilemma_connections', 'not-a-json-string');
      
      // Act & Assert
      expect(() => service.getConnections()).to.throw();
    });
  });
  
  describe('getConnectionById', () => {
    it('should retrieve a specific connection by ID', () => {
      // Arrange
      const friendName = 'Test Friend';
      const connectionLink = service.generateConnectionLink(friendName);
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      // Act
      const connection = service.getConnectionById(connectionId);
      
      // Assert
      expect(connection).to.exist;
      expect(connection?.id).to.equal(connectionId);
      expect(connection?.name).to.equal(friendName);
    });
    
    it('should return null if connection ID does not exist', () => {
      // Act
      const connection = service.getConnectionById('non-existent-id');
      
      // Assert
      expect(connection).to.be.null;
    });
    
    it('should throw an error when called with an empty ID', () => {
      // Assert
      expect(() => service.getConnectionById('')).to.throw('Connection ID cannot be empty');
    });
  });
  
  describe('getConnectionsByStatus', () => {
    it('should filter connections by status', () => {
      // Arrange
      // Create one pending and one active connection
      const pendingFriendName = 'Pending Friend';
      const pendingConnectionLink = service.generateConnectionLink(pendingFriendName);
      
      const activeFriendName = 'Active Friend';
      const activeConnectionLink = service.generateConnectionLink(activeFriendName);
      
      // Extract the active connection ID and set it to active
      const url = new URL(activeConnectionLink);
      const activeConnectionId = url.searchParams.get('connection') as string;
      
      // Manually update the connection status
      const connections = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      connections.find((c: any) => c.id === activeConnectionId).status = ConnectionStatus.ACTIVE;
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify(connections));
      
      // Act
      const pendingConnections = service.getConnectionsByStatus(ConnectionStatus.PENDING);
      const activeConnections = service.getConnectionsByStatus(ConnectionStatus.ACTIVE);
      
      // Assert
      expect(pendingConnections.length).to.equal(1);
      expect(pendingConnections[0].name).to.equal(pendingFriendName);
      
      expect(activeConnections.length).to.equal(1);
      expect(activeConnections[0].name).to.equal(activeFriendName);
    });
    
    it('should return an empty array when no connections match the status', () => {
      // Arrange
      service.generateConnectionLink('Friend');
      
      // Act
      const activeConnections = service.getConnectionsByStatus(ConnectionStatus.ACTIVE);
      
      // Assert
      expect(activeConnections).to.be.an('array');
      expect(activeConnections.length).to.equal(0);
    });
    
    it('should throw an error when called with an invalid status', () => {
      // Assert
      expect(() => service.getConnectionsByStatus('invalid-status' as ConnectionStatus)).to.throw('Invalid connection status');
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
      expect(result).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(externalFriendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.ACTIVE);
    });
    
    it('should return false when accepting a non-existent connection', () => {
      // Act
      const result = service.acceptConnection('non-existent-id');
      
      // Assert
      expect(result).to.be.false;
    });
    
    it('should throw an error when called with an empty ID', () => {
      // Assert
      expect(() => service.acceptConnection('')).to.throw('Connection ID cannot be empty');
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
      expect(result).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      
      expect(storedData.length).to.equal(1);
      expect(storedData[0].id).to.equal(connectionId);
      expect(storedData[0].name).to.equal(externalFriendName);
      expect(storedData[0].status).to.equal(ConnectionStatus.PENDING);
      expect(storedData[0].initiatedByMe).to.be.false;
    });
    
    it('should throw an error when registering a connection with an empty ID', () => {
      // Assert
      expect(() => service.registerIncomingConnection('', 'Friend')).to.throw('Connection ID cannot be empty');
    });
    
    it('should throw an error when registering a connection with an empty name', () => {
      // Assert
      expect(() => service.registerIncomingConnection('test-id', '')).to.throw('Friend name cannot be empty');
    });
    
    it('should throw an error when registering a connection that already exists', () => {
      // Arrange
      const connectionId = 'existing-connection-id';
      service.registerIncomingConnection(connectionId, 'Friend');
      
      // Act & Assert
      expect(() => service.registerIncomingConnection(connectionId, 'Another Friend')).to.throw('Connection with this ID already exists');
      
      // Verify the first connection was not overwritten
      const connection = service.getConnectionById(connectionId);
      expect(connection).to.exist;
      expect(connection?.name).to.equal('Friend'); // Should still have the original name
    });
  });
  
  describe('deleteConnection', () => {
    it('should delete a connection', () => {
      // Arrange
      const friendName = 'Test Friend';
      const connectionLink = service.generateConnectionLink(friendName);
      
      // Extract the connection ID from the link
      const url = new URL(connectionLink);
      const connectionId = url.searchParams.get('connection') as string;
      
      // Act
      const result = service.deleteConnection(connectionId);
      
      // Assert
      expect(result).to.be.true;
      
      const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
      expect(storedData.length).to.equal(0);
    });
    
    it('should return false when deleting a non-existent connection', () => {
      // Act
      const result = service.deleteConnection('non-existent-id');
      
      // Assert
      expect(result).to.be.false;
    });
    
    it('should throw an error when called with an empty ID', () => {
      // Assert
      expect(() => service.deleteConnection('')).to.throw('Connection ID cannot be empty');
    });
  });
  
  describe('Data validation', () => {
    it('should handle invalid data in localStorage', () => {
      // Arrange - Store invalid data
      mockLocalStorage.setItem('prisonersDilemma_connections', JSON.stringify({ notAnArray: true }));
      
      // Act
      const connections = service.getConnections();
      
      // Assert - Should return empty array instead of throwing
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
      const connections = service.getConnections();
      
      // Assert - Should only return the valid item
      expect(connections).to.be.an('array');
      expect(connections.length).to.equal(1);
      expect(connections[0].id).to.equal('valid-id');
    });
  });
});