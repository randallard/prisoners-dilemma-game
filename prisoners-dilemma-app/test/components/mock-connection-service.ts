import { ConnectionService, ConnectionStatus, ConnectionData } from '../../src/services/connection.service';
import { Result } from '../../src/services/connection-result';
import { ConnectionError, ConnectionErrorType } from '../../src/services/connection-result';

/**
 * Enhanced mock implementation of ConnectionService for testing
 * Includes all methods needed for comprehensive connection component tests
 */
export class MockConnectionService extends ConnectionService {
  // Mock connections for testing
  private mockConnections: ConnectionData[] = [];
  
  // Mock connection links for testing
  private mockConnectionLinks: Map<string, string> = new Map();
  
  // Override key methods for testing
  getConnections(): Result<ConnectionData[], ConnectionError> {
    return Result.success([...this.mockConnections]);
  }
  
  getConnectionsByStatus(status: ConnectionStatus): Result<ConnectionData[], ConnectionError> {
    if (!Object.values(ConnectionStatus).includes(status)) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_STATUS,
          'Invalid connection status'
        )
      );
    }
    
    const filteredConnections = this.mockConnections.filter(conn => conn.status === status);
    return Result.success([...filteredConnections]);
  }
  
  acceptConnection(connectionId: string): Result<boolean, ConnectionError> {
    if (!connectionId || connectionId.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }
    
    const connectionIndex = this.mockConnections.findIndex(conn => conn.id === connectionId);
    if (connectionIndex === -1) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.CONNECTION_NOT_FOUND,
          `Connection with ID ${connectionId} not found`
        )
      );
    }
    
    this.mockConnections = this.mockConnections.map((conn, index) => {
      if (index === connectionIndex) {
        return {
          ...conn,
          status: ConnectionStatus.ACTIVE
        };
      }
      return conn;
    });
    
    return Result.success(true);
  }
  
  deleteConnection(connectionId: string): Result<boolean, ConnectionError> {
    if (!connectionId || connectionId.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }
    
    const initialLength = this.mockConnections.length;
    this.mockConnections = this.mockConnections.filter(conn => conn.id !== connectionId);
    
    if (this.mockConnections.length === initialLength) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.CONNECTION_NOT_FOUND,
          `Connection with ID ${connectionId} not found`
        )
      );
    }
    
    // Also remove the mock link
    this.mockConnectionLinks.delete(connectionId);
    
    return Result.success(true);
  }
  
  generateConnectionLink(friendName: string): Result<string, ConnectionError> {
    if (!friendName || friendName.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_NAME,
          'Friend name cannot be empty'
        )
      );
    }
    
    if (friendName === 'error-test') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Test storage error'
        )
      );
    }
    
    const connectionId = this.generateUUID();
    
    // Add the connection to our mock data
    this.mockConnections.push({
      id: connectionId,
      name: friendName,
      status: ConnectionStatus.PENDING,
      initiatedByMe: true,
      createdAt: Date.now()
    });
    
    // Create and store the connection link
    const connectionLink = `https://example.com/game?connection=${connectionId}`;
    this.mockConnectionLinks.set(connectionId, connectionLink);
    
    // Return the test URL
    return Result.success(connectionLink);
  }
  
  // New method for getting connection links
  getConnectionLink(connectionId: string): Result<string, ConnectionError> {
    if (!connectionId || connectionId.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }
    
    const connection = this.mockConnections.find(conn => conn.id === connectionId);
    if (!connection) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.CONNECTION_NOT_FOUND,
          `Connection with ID ${connectionId} not found`
        )
      );
    }
    
    // Check if we have a stored link for this connection
    const link = this.mockConnectionLinks.get(connectionId);
    if (link) {
      return Result.success(link);
    }
    
    // Generate a default link for testing
    const defaultLink = `https://example.com/game?connection=${connectionId}`;
    this.mockConnectionLinks.set(connectionId, defaultLink);
    return Result.success(defaultLink);
  }
  
  registerIncomingConnection(connectionId: string, myName: string): Result<boolean, ConnectionError> {
    if (!connectionId || connectionId.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID,
          'Connection ID cannot be empty'
        )
      );
    }
    
    if (!myName || myName.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_NAME,
          'Your name cannot be empty'
        )
      );
    }
    
    // For testing, add the connection as pending
    this.mockConnections.push({
      id: connectionId,
      name: 'Friend',
      status: ConnectionStatus.PENDING,
      initiatedByMe: false,
      createdAt: Date.now()
    });
    
    return Result.success(true);
  }
  
  // Override protected generateUUID to return a predictable value for testing
  protected generateUUID(): string {
    return 'test-connection-id';
  }
  
  // Helper methods for testing
  setMockConnections(connections: ConnectionData[]): void {
    this.mockConnections = [...connections];
  }
  
  clearMockConnections(): void {
    this.mockConnections = [];
    this.mockConnectionLinks.clear();
  }
  
  getMockConnections(): ConnectionData[] {
    return [...this.mockConnections];
  }
  
  setMockConnectionLink(connectionId: string, link: string): void {
    this.mockConnectionLinks.set(connectionId, link);
  }
}