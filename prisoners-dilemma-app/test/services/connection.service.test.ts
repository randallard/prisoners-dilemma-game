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
    const myName = 'My Name';
    service.acceptConnection(connectionId, myName);
    
    // Assert
    const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
    
    expect(storedData.length).to.equal(1);
    expect(storedData[0].id).to.equal(connectionId);
    expect(storedData[0].name).to.equal(externalFriendName);
    expect(storedData[0].status).to.equal(ConnectionStatus.ACTIVE);
  });
  
  it('should handle an incoming connection request', () => {
    // Arrange
    const connectionId = 'incoming-connection-id';
    const externalFriendName = 'External Friend';
    
    // Act - Register the incoming connection
    service.registerIncomingConnection(connectionId, externalFriendName);
    
    // Assert
    const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
    
    expect(storedData.length).to.equal(1);
    expect(storedData[0].id).to.equal(connectionId);
    expect(storedData[0].name).to.equal(externalFriendName);
    expect(storedData[0].status).to.equal(ConnectionStatus.PENDING);
    expect(storedData[0].initiatedByMe).to.be.false;
  });
  
  it('should delete a connection', () => {
    // Arrange
    const friendName = 'Test Friend';
    const connectionLink = service.generateConnectionLink(friendName);
    
    // Extract the connection ID from the link
    const url = new URL(connectionLink);
    const connectionId = url.searchParams.get('connection') as string;
    
    // Act
    service.deleteConnection(connectionId);
    
    // Assert
    const storedData = JSON.parse(mockLocalStorage.getItem('prisonersDilemma_connections') || '[]');
    expect(storedData.length).to.equal(0);
  });
  
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
});