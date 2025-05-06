// connection-service-adapter.ts
import { ConnectionService as EnhancedConnectionService, ConnectionStatus, ConnectionData } from './enhanced-connection.service';
import { UuidUtils } from './uuid-utils';

/**
 * Adapter class that provides the original ConnectionService API
 * while using the enhanced type-safe implementation underneath
 */
export class ConnectionService {
  private enhancedService: EnhancedConnectionService;
  
  constructor() {
    this.enhancedService = new EnhancedConnectionService();
  }
  
  /**
   * Generates a connection link for sharing with a friend
   * @param friendName The name of the friend to connect with
   * @returns The connection link URL as a string
   * @throws Error if localStorage is not available or friendName is empty
   */
  public generateConnectionLink(friendName: string): string {
    const result = this.enhancedService.generateConnectionLink(friendName);
    
    if (result.isFailure()) {
      throw new Error(result.getError().message);
    }
    
    return result.getValue();
  }
  
  /**
   * Retrieves all connections from localStorage
   * @returns Array of all connection data objects
   * @throws Error if localStorage is not available or data is corrupted
   */
  public getConnections(): ConnectionData[] {
    const result = this.enhancedService.getConnections();
    
    if (result.isFailure()) {
      throw new Error(result.getError().message);
    }
    
    return result.getValue();
  }
  
  /**
   * Retrieves a specific connection by its ID
   * @param connectionId The ID of the connection to find
   * @returns The connection data object if found, or null if not found
   * @throws Error if localStorage is not available or data is corrupted
   */
  public getConnectionById(connectionId: string): ConnectionData | null {
    if (!connectionId) {
      throw new Error('Connection ID cannot be empty');
    }
    
    const result = this.enhancedService.getConnectionById(connectionId);
    
    if (result.isFailure()) {
      const error = result.getError();
      // If connection not found, return null to match original API
      if (error.type === 'connection_not_found') {
        return null;
      }
      throw new Error(error.message);
    }
    
    return result.getValue();
  }
  
  /**
   * Retrieves connections filtered by status
   * @param status The status to filter connections by (PENDING or ACTIVE)
   * @returns Array of connection data objects matching the status
   * @throws Error if localStorage is not available or data is corrupted
   */
  public getConnectionsByStatus(status: ConnectionStatus): ConnectionData[] {
    const result = this.enhancedService.getConnectionsByStatus(status);
    
    if (result.isFailure()) {
      throw new Error(result.getError().message);
    }
    
    return result.getValue();
  }
  
  /**
   * Accepts a connection request, changing its status to ACTIVE
   * @param connectionId The ID of the connection to accept
   * @returns True if connection was successfully accepted, false if connection not found
   * @throws Error if localStorage is not available, data is corrupted, or connectionId is empty
   */
  public acceptConnection(connectionId: string): boolean {
    if (!connectionId) {
      throw new Error('Connection ID cannot be empty');
    }
    
    const result = this.enhancedService.acceptConnection(connectionId);
    
    if (result.isFailure()) {
      const error = result.getError();
      // If connection not found, return false to match original API
      if (error.type === 'connection_not_found') {
        return false;
      }
      throw new Error(error.message);
    }
    
    return result.getValue();
  }
  
  /**
   * Registers an incoming connection request
   * @param connectionId The ID of the incoming connection
   * @param externalFriendName The name of the friend who initiated the connection
   * @returns True if connection was successfully registered
   * @throws Error if localStorage is not available, data is corrupted, or parameters are invalid
   */
  public registerIncomingConnection(connectionId: string, externalFriendName: string): boolean {
    const result = this.enhancedService.registerIncomingConnection(connectionId, externalFriendName);
    
    if (result.isFailure()) {
      throw new Error(result.getError().message);
    }
    
    return result.getValue();
  }
  
  /**
   * Deletes a connection by its ID
   * @param connectionId The ID of the connection to delete
   * @returns True if connection was successfully deleted, false if connection not found
   * @throws Error if localStorage is not available, data is corrupted, or connectionId is empty
   */
  public deleteConnection(connectionId: string): boolean {
    if (!connectionId) {
      throw new Error('Connection ID cannot be empty');
    }
    
    const result = this.enhancedService.deleteConnection(connectionId);
    
    if (result.isFailure()) {
      const error = result.getError();
      // If connection not found, return false to match original API
      if (error.type === 'connection_not_found') {
        return false;
      }
      throw new Error(error.message);
    }
    
    return result.getValue();
  }
  
  /**
   * Generates a UUID v4
   * @returns A UUID string
   */
  protected generateUUID(): string {
    return UuidUtils.generateUUID();
  }
}

// Re-export ConnectionStatus and ConnectionData for compatibility
export { ConnectionStatus, ConnectionData };