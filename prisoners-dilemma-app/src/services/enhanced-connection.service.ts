// enhanced-connection.service.ts
import { Result, ConnectionError, ConnectionErrorType } from './connection-result';
import { UuidUtils } from './uuid-utils';

export enum ConnectionStatus {
  PENDING = 'pending',
  ACTIVE = 'active'
}

export interface ConnectionData {
  id: string;
  name: string;
  status: ConnectionStatus;
  initiatedByMe: boolean;
  createdAt: number;
}

export class ConnectionService {
  private readonly STORAGE_KEY = 'prisonersDilemma_connections';
  
  /**
   * Validates a connection ID
   * @param connectionId The ID to validate
   * @returns A Result with validated ID or error
   */
  private validateId(connectionId: string): Result<string, ConnectionError> {
    if (!connectionId || connectionId.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID, 
          'Connection ID cannot be empty'
        )
      );
    }
    return Result.success(connectionId);
  }
  
  /**
   * Validates a friend name
   * @param friendName The name to validate
   * @returns A Result with validated name or error
   */
  private validateName(friendName: string): Result<string, ConnectionError> {
    if (!friendName || friendName.trim() === '') {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_NAME, 
          'Friend name cannot be empty'
        )
      );
    }
    return Result.success(friendName.trim());
  }
  
  /**
   * Validates a connection status
   * @param status The status to validate
   * @returns A Result with validated status or error
   */
  private validateStatus(status: ConnectionStatus): Result<ConnectionStatus, ConnectionError> {
    if (!Object.values(ConnectionStatus).includes(status)) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_STATUS, 
          'Invalid connection status'
        )
      );
    }
    return Result.success(status);
  }
  
  /**
   * Generates a connection link for sharing with a friend
   * @param friendName The name of the friend to connect with
   * @returns A Result with the connection link URL as a string, or an error
   */
  public generateConnectionLink(friendName: string): Result<string, ConnectionError> {
    const nameResult = this.validateName(friendName);
    if (nameResult.isFailure()) {
      return Result.failure(nameResult.getError());
    }
    
    try {
      // Generate a UUID for the connection
      const connectionId = this.generateUUID();
      
      // Create the connection data
      const connectionData: ConnectionData = {
        id: connectionId,
        name: nameResult.getValue(),
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now()
      };
      
      // Store the connection data in localStorage
      const saveResult = this.saveConnection(connectionData);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.getError());
      }
      
      // Generate a URL with the connection ID
      const baseUrl = window.location.origin + window.location.pathname;
      const connectionLink = `${baseUrl}?connection=${connectionId}`;
      
      return Result.success(connectionLink);
    } catch (error) {
      console.error('Failed to generate connection link:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to generate connection link. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Retrieves all connections from localStorage
   * @returns A Result with array of all connection data objects, or an error
   */
  public getConnections(): Result<ConnectionData[], ConnectionError> {
    try {
      return Result.success(this.loadConnections().getValue());
    } catch (error) {
      console.error('Failed to retrieve connections:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to retrieve connections. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Retrieves a specific connection by its ID
   * @param connectionId The ID of the connection to find
   * @returns A Result with the connection data object if found, or an error
   */
  public getConnectionById(connectionId: string): Result<ConnectionData, ConnectionError> {
    const idResult = this.validateId(connectionId);
    if (idResult.isFailure()) {
      return Result.failure(idResult.getError());
    }
    
    try {
      const connectionsResult = this.loadConnections();
      if (connectionsResult.isFailure()) {
        return Result.failure(connectionsResult.getError());
      }
      
      const connections = connectionsResult.getValue();
      const connection = connections.find(conn => conn.id === connectionId);
      
      if (!connection) {
        return Result.failure(
          new ConnectionError(
            ConnectionErrorType.CONNECTION_NOT_FOUND,
            `Connection with ID ${connectionId} not found`
          )
        );
      }
      
      return Result.success(connection);
    } catch (error) {
      console.error(`Failed to retrieve connection with ID ${connectionId}:`, error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to retrieve connection. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Retrieves connections filtered by status
   * @param status The status to filter connections by (PENDING or ACTIVE)
   * @returns A Result with array of connection data objects matching the status, or an error
   */
  public getConnectionsByStatus(status: ConnectionStatus): Result<ConnectionData[], ConnectionError> {
    const statusResult = this.validateStatus(status);
    if (statusResult.isFailure()) {
      return Result.failure(statusResult.getError());
    }
    
    try {
      const connectionsResult = this.loadConnections();
      if (connectionsResult.isFailure()) {
        return Result.failure(connectionsResult.getError());
      }
      
      const connections = connectionsResult.getValue();
      const filteredConnections = connections.filter(conn => conn.status === status);
      
      return Result.success(filteredConnections);
    } catch (error) {
      console.error(`Failed to retrieve connections with status ${status}:`, error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to retrieve connections. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Accepts a connection request, changing its status to ACTIVE
   * @param connectionId The ID of the connection to accept
   * @returns A Result indicating success or failure
   */
  public acceptConnection(connectionId: string): Result<boolean, ConnectionError> {
    const idResult = this.validateId(connectionId);
    if (idResult.isFailure()) {
      return Result.failure(idResult.getError());
    }
    
    try {
      const connectionsResult = this.loadConnections();
      if (connectionsResult.isFailure()) {
        return Result.failure(connectionsResult.getError());
      }
      
      const connections = connectionsResult.getValue();
      const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
      
      if (connectionIndex === -1) {
        return Result.failure(
          new ConnectionError(
            ConnectionErrorType.CONNECTION_NOT_FOUND,
            `Connection with ID ${connectionId} not found`
          )
        );
      }
      
      connections[connectionIndex].status = ConnectionStatus.ACTIVE;
      
      const saveResult = this.saveConnections(connections);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.getError());
      }
      
      return Result.success(true);
    } catch (error) {
      console.error(`Failed to accept connection with ID ${connectionId}:`, error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to accept connection. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Registers an incoming connection request
   * @param connectionId The ID of the incoming connection
   * @param externalFriendName The name of the friend who initiated the connection
   * @returns A Result indicating success or failure
   */
  public registerIncomingConnection(
    connectionId: string, 
    externalFriendName: string
  ): Result<boolean, ConnectionError> {
    const idResult = this.validateId(connectionId);
    if (idResult.isFailure()) {
      return Result.failure(idResult.getError());
    }
    
    const nameResult = this.validateName(externalFriendName);
    if (nameResult.isFailure()) {
      return Result.failure(nameResult.getError());
    }
    
    // Check if connection already exists
    const existingConnectionResult = this.getConnectionById(connectionId);
    if (existingConnectionResult.isSuccess()) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.CONNECTION_EXISTS,
          'Connection with this ID already exists'
        )
      );
    }
    
    try {
      const connectionData: ConnectionData = {
        id: connectionId,
        name: nameResult.getValue(),
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now()
      };
      
      const saveResult = this.saveConnection(connectionData);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.getError());
      }
      
      return Result.success(true);
    } catch (error) {
      console.error('Failed to register incoming connection:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to register incoming connection. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Deletes a connection by its ID
   * @param connectionId The ID of the connection to delete
   * @returns A Result indicating success or failure
   */
  public deleteConnection(connectionId: string): Result<boolean, ConnectionError> {
    const idResult = this.validateId(connectionId);
    if (idResult.isFailure()) {
      return Result.failure(idResult.getError());
    }
    
    try {
      const connectionsResult = this.loadConnections();
      if (connectionsResult.isFailure()) {
        return Result.failure(connectionsResult.getError());
      }
      
      const connections = connectionsResult.getValue();
      const initialLength = connections.length;
      const filteredConnections = connections.filter(conn => conn.id !== connectionId);
      
      if (filteredConnections.length === initialLength) {
        return Result.failure(
          new ConnectionError(
            ConnectionErrorType.CONNECTION_NOT_FOUND,
            `Connection with ID ${connectionId} not found`
          )
        );
      }
      
      const saveResult = this.saveConnections(filteredConnections);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.getError());
      }
      
      return Result.success(true);
    } catch (error) {
      console.error(`Failed to delete connection with ID ${connectionId}:`, error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to delete connection. Local storage may not be available or data may be corrupted.'
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
   * Helper method to save a connection to localStorage
   * @param connection The connection data to save
   * @returns A Result indicating success or failure
   */
  private saveConnection(connection: ConnectionData): Result<boolean, ConnectionError> {
    if (!connection.id || !connection.name) {
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.INVALID_ID,
          'Invalid connection data'
        )
      );
    }
    
    try {
      const connectionsResult = this.loadConnections();
      if (connectionsResult.isFailure()) {
        return Result.failure(connectionsResult.getError());
      }
      
      const connections = connectionsResult.getValue();
      connections.push(connection);
      
      return this.saveConnections(connections);
    } catch (error) {
      console.error('Failed to save connection:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to save connection. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Helper method to save connections array to localStorage
   * @param connections Array of connections to save
   * @returns A Result indicating success or failure
   */
  private saveConnections(connections: ConnectionData[]): Result<boolean, ConnectionError> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
      return Result.success(true);
    } catch (error) {
      console.error('Failed to save connections:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to save connections. Local storage may not be available.'
        )
      );
    }
  }
  
  /**
   * Helper method to load connections from localStorage
   * @returns A Result with array of connection data objects, or an error
   */
  private loadConnections(): Result<ConnectionData[], ConnectionError> {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) {
        return Result.success([]);
      }
      
      const parsedData = JSON.parse(storedData);
      
      // Validate that the parsed data is an array
      if (!Array.isArray(parsedData)) {
        console.warn('Stored connection data is not an array, returning empty array');
        return Result.success([]);
      }
      
      // Validate each connection object
      const validConnections = parsedData.filter(item => this.isValidConnectionData(item));
      return Result.success(validConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
      return Result.failure(
        new ConnectionError(
          ConnectionErrorType.STORAGE_ERROR,
          'Failed to load connections. Local storage may not be available or data may be corrupted.'
        )
      );
    }
  }
  
  /**
   * Validates that an object conforms to the ConnectionData interface
   * @param item The object to validate
   * @returns True if the object is valid ConnectionData
   */
  private isValidConnectionData(item: any): boolean {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      Object.values(ConnectionStatus).includes(item.status) &&
      typeof item.initiatedByMe === 'boolean' &&
      typeof item.createdAt === 'number'
    );
  }
}