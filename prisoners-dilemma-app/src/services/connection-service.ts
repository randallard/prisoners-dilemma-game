import { ConnectionStatus } from '../models/connection-status';
import { ConnectionData } from '../models/connection-data';
import { Result } from './connection-result';
import { PlayerStorageService } from './player-storage.service';
import { UuidUtils } from './uuid-utils';
import { ConnectionApiService, ConnectionStatusUpdate, ConnectionApiData } from './api/connection-api-service';
import { ConnectionDataMapper } from './api/connection-data-mapper';
import { ApiError, ApiErrorType } from './api/api-error';
import { PlayerError, PlayerErrorType } from './player-result';

/**
 * Service for managing connections between players
 */
export class ConnectionService {
  private playerStorageService: PlayerStorageService;
  private apiService: ConnectionApiService;
  private connectionUpdateHandler: ((update: ConnectionStatusUpdate) => Promise<void>) | null = null;
  
  /**
   * Creates a new ConnectionService
   */
  constructor() {
    this.playerStorageService = new PlayerStorageService();
    
    // Initialize API service with configured endpoints
    // These URLs would typically come from environment variables or configuration
    const apiUrl = 'https://api.example.com';
    const wsUrl = 'wss://ws.example.com';
    this.apiService = new ConnectionApiService(apiUrl, wsUrl);
  }
  
  /**
   * Gets a connection by ID
   * @param connectionId The ID of the connection to get
   * @returns A Result with the connection data or an error
   */
  async getConnection(connectionId: string): Promise<Result<ConnectionData, Error>> {
    if (!connectionId) {
      return Result.failure(new Error('Connection ID is required'));
    }

    const connectionResult = this.playerStorageService.getConnection(connectionId);

    if (connectionResult.isFailure()) {
      return Result.failure(connectionResult.getError() as Error);
    }

    return Result.success(connectionResult.getValue());
  }

  /**
   * Gets all connections
   * @returns A Result with an array of connection data
   */
  async getAllConnections(): Promise<Result<ConnectionData[], Error>> {
    const connectionsResult = this.playerStorageService.getAllConnections();

    if (connectionsResult.isFailure()) {
      return Result.failure(connectionsResult.getError() as Error);
    }

    return Result.success(connectionsResult.getValue());
  }

  /**
   * Creates a new connection for a player
   * @param playerID The ID of the player creating the connection
   * @param name Optional name for the connection
   * @returns A Result with the new connection data or an error
   */
  async createConnection(playerID: string, name?: string): Promise<Result<ConnectionData, PlayerError>> {
    if (!playerID) {
      return Result.failure(new PlayerError(
        PlayerErrorType.INVALID_ID,
        'Player ID is required'
      ));
    }

    const connectionId = UuidUtils.generateUUID();
    const createdAt = new Date();

    const connectionData: ConnectionData = {
      id: connectionId,
      name: name || `Connection ${connectionId.substring(0, 8)}`,
      playerID,
      status: ConnectionStatus.DISCONNECTED,
      createdAt,
      lastUpdated: createdAt,
      serverUrl: this.apiService.getServerUrl()
    };

    const storeResult = this.playerStorageService.storeConnection(connectionData);

    if (storeResult.isFailure()) {
      return Result.failure(new PlayerError(
        PlayerErrorType.STORAGE_ERROR,
        `Failed to store connection locally: ${storeResult.getError().message}`
      ));
    }

    return Result.success(storeResult.getValue());
  }
  
  /**
   * Creates a new connection using the server API
   * 
   * @param playerID The ID of the player creating the connection
   * @returns The created connection data or an error
   */
  async createConnectionWithServer(playerID: string): Promise<Result<ConnectionData, ApiError>> {
    if (!playerID) {
      return Result.failure(new ApiError(
        ApiErrorType.INVALID_ID as any, // Fixed enum issue
        'Player ID is required'
      ));
    }

    const apiResult = await this.apiService.createConnection(playerID);

    if (apiResult.isFailure()) {
      return Result.failure(apiResult.getError());
    }

    const connectionData = ConnectionDataMapper.fromApiModel(apiResult.getValue());
    return Result.success(connectionData);
  }
  
  /**
   * Updates an existing connection
   * 
   * @param connectionId The ID of the connection to update
   * @param updatedData The updated connection data
   * @returns The updated connection data or an error
   */
  async updateConnection(connectionId: string, updatedData: ConnectionData): Promise<Result<ConnectionData, Error>> {
    if (!connectionId) {
      return Result.failure(new Error('Connection ID is required'));
    }
    
    if (connectionId !== updatedData.id) {
      return Result.failure(new Error('Connection ID mismatch'));
    }
    
    return this.playerStorageService.updateConnection(connectionId, updatedData) as Result<ConnectionData, Error>;
  }
  
  /**
   * Joins an existing connection
   * 
   * @param connectionId The ID of the connection to join
   * @param playerID The ID of the player joining the connection
   * @returns The updated connection data or an error
   */
  async joinConnection(connectionId: string, playerID: string): Promise<Result<ConnectionData, Error>> {
    if (!connectionId) {
      return Result.failure(new Error('Connection ID is required'));
    }
    
    if (!playerID) {
      return Result.failure(new Error('Player ID is required'));
    }
    
    const connectionResult = await this.getConnection(connectionId);
    
    if (connectionResult.isFailure()) {
      return Result.failure(new Error('Failed to retrieve connection'));
    }

    const connection = connectionResult.getValue();

    if (connection.status !== ConnectionStatus.PENDING) {
      return Result.failure(new Error('Connection is not in PENDING state'));
    }

    const updatedConnection: ConnectionData = {
      ...connection,
      connectedPlayerID: playerID,
      status: ConnectionStatus.ACTIVE,
      lastUpdated: new Date()
    };

    return this.updateConnection(connectionId, updatedConnection);
  }
  
  /**
   * Joins an existing connection using the server API
   * 
   * @param connectionId The ID of the connection to join
   * @param playerID The ID of the player joining the connection
   * @returns The updated connection data or an error
   */
  async joinConnectionWithServer(connectionId: string, playerID: string): Promise<Result<ConnectionData, ApiError>> {
    if (!connectionId) {
      return Result.failure(new ApiError(ApiError.fromStatusCode(400).type, 'Connection ID is required', 400));
    }
    
    if (!playerID) {
      return Result.failure(new ApiError(ApiError.fromStatusCode(400).type, 'Player ID is required', 400));
    }
    
    // Join connection on the server
    const apiResult = await this.apiService.joinConnection(connectionId, playerID);
    
    if (apiResult.isFailure()) {
      return Result.failure(apiResult.getError());
    }
    
    // Map API data to local model
    const connectionData = ConnectionDataMapper.fromApiModel(apiResult.getValue());
    
    // Update in local storage
    const updateResult = await this.updateConnection(connectionId, connectionData);
    
    if (updateResult.isFailure()) {
      return Result.failure(new ApiError(
        ApiErrorType.STORAGE_ERROR,
        `Failed to update connection locally: ${updateResult.getError().message}`
      ));
    }

    return Result.success(updateResult.getValue());
  }
  
  /**
   * Deletes a connection
   * 
   * @param connectionId The ID of the connection to delete
   * @returns Success indicator or an error
   */
  async deleteConnection(connectionId: string): Promise<Result<void, Error>> {
    if (!connectionId) {
      return Result.failure(new Error('Connection ID is required'));
    }

    const deleteResult = this.playerStorageService.deleteConnection(connectionId);

    if (deleteResult.isFailure()) {
      return Result.failure(deleteResult.getError());
    }

    return Result.success(undefined);
  }
  
  /**
   * Synchronizes a connection with the server
   * 
   * @param connectionId The ID of the connection to synchronize
   * @returns The updated connection data or an error
   */
  async syncConnectionWithServer(connectionId: string): Promise<Result<ConnectionData, Error | ApiError>> {
    // First, get the local connection
    const connectionResult = await this.getConnection(connectionId);
    
    if (connectionResult.isFailure()) {
      return Result.failure(connectionResult.getError());
    }

    const localConnection = connectionResult.getValue();
    
    // Get the current status from the server
    const statusResult = await this.apiService.getConnectionStatus(connectionId);
    
    if (statusResult.isFailure()) {
      return Result.failure(statusResult.getError());
    }

    const statusUpdate = statusResult.getValue();
    
    // If the connection is expired, just update the local status
    if (statusUpdate.status === ConnectionStatus.EXPIRED) {
      const updatedConnection: ConnectionData = {
        ...localConnection,
        status: ConnectionStatus.EXPIRED,
        lastUpdated: new Date(statusUpdate.updatedAt)
      };
      
      return this.updateConnection(connectionId, updatedConnection);
    }
    
    // For active connections, get the full data to ensure we have the latest
    const playerResult = await this.playerStorageService.getPlayer();
    
    if (playerResult.isFailure()) {
      return Result.failure(playerResult.getError());
    }

    const playerID = playerResult.getValue().id;
    
    // Get all connections for the player to find the one we're looking for
    const connectionsResult = await this.apiService.getPlayerConnections(playerID);
    
    if (connectionsResult.isFailure()) {
      return Result.failure(connectionsResult.getError());
    }

    const apiConnection = connectionsResult.getValue().find((conn: ConnectionApiData) => conn.id === connectionId);
    
    if (!apiConnection) {
      return Result.failure(new Error('Connection not found on server'));
    }
    
    // Update the local connection with server data while preserving the name
    const updatedConnection = ConnectionDataMapper.updateLocalFromApi(localConnection, apiConnection);
    
    // Store the updated connection
    return this.updateConnection(connectionId, updatedConnection);
  }
  
  /**
   * Connects to the WebSocket server for real-time updates
   * 
   * @param playerID The ID of the player to receive updates for
   * @returns Success indicator or an error
   */
  async connectToWebSocket(playerID: string): Promise<Result<void, ApiError>> {
    // Setup the connection update handler if not already set
    if (!this.connectionUpdateHandler) {
      this.connectionUpdateHandler = this.handleConnectionUpdate.bind(this);
      this.apiService.onConnectionUpdate(this.connectionUpdateHandler);
    }
    
    // Connect to the WebSocket server with auto-reconnect enabled
    return this.apiService.connectWebSocket(playerID, true);
  }
  
  /**
   * Disconnects from the WebSocket server
   */
  disconnectFromWebSocket(): void {
    // Remove the update handler
    if (this.connectionUpdateHandler) {
      this.apiService.offConnectionUpdate(this.connectionUpdateHandler);
      this.connectionUpdateHandler = null;
    }
    
    // Disconnect from the server
    this.apiService.disconnectWebSocket();
  }
  
  /**
   * Handles connection updates from the WebSocket
   * 
   * @param update Connection status update
   */
  private async handleConnectionUpdate(update: ConnectionStatusUpdate): Promise<void> {
    console.log(`Received connection update for ${update.id}: ${update.status}`);
    
    // Sync the connection with the server to get the full details
    const syncResult = await this.syncConnectionWithServer(update.id);
    
    if (syncResult.isFailure()) {
      console.error('Failed to sync connection after update:', syncResult.getError());
    } else {
      console.log('Connection synchronized successfully', syncResult.getValue());
    }
  }
}