import { ApiError, ApiErrorType } from './api-error';
import { ConnectionStatus } from '../../models/connection-status';
import { Result } from '../connection-result';

/**
 * Interface for connection data returned by the API
 */
export interface ConnectionApiData {
  id: string;
  playerID: string;
  connectedPlayerID?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  name: string; // Added missing 'name' property
}

/**
 * Interface for connection status update from WebSocket
 */
export interface ConnectionStatusUpdate {
  id: string;
  status: ConnectionStatus;
  updatedAt: string;
}

/**
 * Type for WebSocket message types
 */
export enum WebSocketMessageType {
  CONNECTION_UPDATE = 'CONNECTION_UPDATE',
  PLAYER_ONLINE = 'PLAYER_ONLINE',
  PLAYER_OFFLINE = 'PLAYER_OFFLINE',
  ERROR = 'ERROR'
}

/**
 * Enum for WebSocket ready states
 */
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

/**
 * Interface for WebSocket messages
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
}

/**
 * Type for connection update handler function
 */
export type ConnectionUpdateHandler = (update: ConnectionStatusUpdate) => void;

/**
 * Service for communicating with the connection API and WebSocket server
 */
export class ConnectionApiService {
  private apiUrl: string;
  private wsUrl: string;
  private webSocket: WebSocket | null = null;
  private connectionUpdateHandlers: ConnectionUpdateHandler[] = [];
  private autoReconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // ms
  private playerID: string | null = null;

  /**
   * Creates a new ConnectionApiService
   * 
   * @param apiUrl Base URL for the REST API
   * @param wsUrl Base URL for the WebSocket API
   */
  constructor(apiUrl: string, wsUrl: string) {
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
  }

  public getServerUrl(): string {
    return this.apiUrl; // Added getServerUrl method
  }

  /**
   * Creates a new connection for the player
   * 
   * @param playerID The ID of the player creating the connection
   * @returns Result containing the created connection or an ApiError
   */
  async createConnection(playerID: string): Promise<Result<ConnectionApiData, ApiError>> {
    try {
      const response = await fetch(`${this.apiUrl}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ playerID })
      });

      if (!response.ok) {
        const errorData = await this.getErrorData(response);
        return Result.failure(ApiError.fromStatusCode(
          response.status,
          errorData.message || response.statusText,
          errorData
        ));
      }

      const data = await response.json();
      return Result.success(this.mapConnectionData(data));
    } catch (error) {
      return Result.failure(new ApiError(
        ApiErrorType.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      ));
    }
  }

  /**
   * Joins an existing connection
   * 
   * @param connectionId The ID of the connection to join
   * @param playerID The ID of the player joining the connection
   * @returns Result containing the updated connection or an ApiError
   */
  async joinConnection(connectionId: string, playerID: string): Promise<Result<ConnectionApiData, ApiError>> {
    try {
      const response = await fetch(`${this.apiUrl}/connections/${connectionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ playerID })
      });

      if (!response.ok) {
        const errorData = await this.getErrorData(response);
        return Result.failure(ApiError.fromStatusCode(
          response.status,
          errorData.message || response.statusText,
          errorData
        ));
      }

      const data = await response.json();
      return Result.success(this.mapConnectionData(data));
    } catch (error) {
      return Result.failure(new ApiError(
        ApiErrorType.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      ));
    }
  }

  /**
   * Gets the current status of a connection
   * 
   * @param connectionId The ID of the connection to check
   * @returns Result containing the connection status or an ApiError
   */
  async getConnectionStatus(connectionId: string): Promise<Result<ConnectionStatusUpdate, ApiError>> {
    try {
      const response = await fetch(`${this.apiUrl}/connections/${connectionId}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await this.getErrorData(response);
        return Result.failure(ApiError.fromStatusCode(
          response.status,
          errorData.message || response.statusText,
          errorData
        ));
      }

      const data = await response.json();
      return Result.success({
        id: data.id,
        status: this.mapStatusString(data.status),
        updatedAt: data.updatedAt
      });
    } catch (error) {
      return Result.failure(new ApiError(
        ApiErrorType.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      ));
    }
  }

  /**
   * Gets all connections for a player
   * 
   * @param playerID The ID of the player
   * @returns Result containing an array of connections or an ApiError
   */
  async getPlayerConnections(playerID: string): Promise<Result<ConnectionApiData[], ApiError>> {
    try {
      const response = await fetch(`${this.apiUrl}/players/${playerID}/connections`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await this.getErrorData(response);
        return Result.failure(ApiError.fromStatusCode(
          response.status,
          errorData.message || response.statusText,
          errorData
        ));
      }

      const data = await response.json();
      return Result.success(data.map((conn: any) => this.mapConnectionData(conn)));
    } catch (error) {
      return Result.failure(new ApiError(
        ApiErrorType.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Network request failed'
      ));
    }
  }

  /**
   * Connects to the WebSocket server for real-time updates
   * 
   * @param playerID The ID of the player to receive updates for
   * @param enableAutoReconnect Whether to automatically reconnect if disconnected
   * @returns Result indicating success or failure
   */
  async connectWebSocket(playerID: string, enableAutoReconnect: boolean = false): Promise<Result<void, ApiError>> {
    this.playerID = playerID;
    this.autoReconnect = enableAutoReconnect;
    
    try {
      // Close existing connection if any
      if (this.webSocket && (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING)) {
        this.webSocket.close();
      }
      
      this.webSocket = new WebSocket(`${this.wsUrl}?playerId=${playerID}`);
      
      this.webSocket.onopen = this.handleWebSocketOpen.bind(this);
      this.webSocket.onmessage = this.handleWebSocketMessage.bind(this);
      this.webSocket.onclose = this.handleWebSocketClose.bind(this);
      this.webSocket.onerror = this.handleWebSocketError.bind(this);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(new ApiError(
        ApiErrorType.NETWORK_ERROR,
        error instanceof Error ? error.message : 'Failed to connect to WebSocket server'
      ));
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnectWebSocket(): void {
    this.autoReconnect = false;
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }

  /**
   * Checks if the WebSocket connection is currently established
   * 
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.webSocket !== null && this.webSocket.readyState === WebSocketReadyState.OPEN;
  }

  /**
   * Registers a handler for connection update events
   * 
   * @param handler Function to call when a connection update is received
   */
  onConnectionUpdate(handler: ConnectionUpdateHandler): void {
    this.connectionUpdateHandlers.push(handler);
  }

  /**
   * Removes a connection update handler
   * 
   * @param handler The handler to remove
   */
  offConnectionUpdate(handler: ConnectionUpdateHandler): void {
    this.connectionUpdateHandlers = this.connectionUpdateHandlers.filter(h => h !== handler);
  }

  /**
   * Maps a string status to ConnectionStatus enum
   * 
   * @param status Status string from the API
   * @returns ConnectionStatus enum value
   */
  private mapStatusString(status: string): ConnectionStatus {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return ConnectionStatus.PENDING;
      case 'ACTIVE':
        return ConnectionStatus.ACTIVE;
      case 'EXPIRED':
        return ConnectionStatus.EXPIRED;
      default:
        console.warn(`Unknown connection status: ${status}`);
        return ConnectionStatus.PENDING;
    }
  }

  /**
   * Maps API connection data to ConnectionApiData interface
   * 
   * @param data Raw connection data from the API
   * @returns Mapped ConnectionApiData object
   */
  private mapConnectionData(data: any): ConnectionApiData {
    return {
      id: data.id,
      playerID: data.playerID,
      connectedPlayerID: data.connectedPlayerID,
      status: this.mapStatusString(data.status),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
      name: data.name // Added missing 'name' property
    };
  }

  /**
   * Extracts error data from an HTTP response
   * 
   * @param response HTTP response object
   * @returns Error data object
   */
  private async getErrorData(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch (e) {
      return {};
    }
  }

  /**
   * Handles WebSocket open event
   */
  private handleWebSocketOpen(): void {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
  }

  /**
   * Handles WebSocket message event
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      switch (message.type) {
        case WebSocketMessageType.CONNECTION_UPDATE:
          this.handleConnectionUpdate(message.data);
          break;
        case WebSocketMessageType.PLAYER_ONLINE:
        case WebSocketMessageType.PLAYER_OFFLINE:
          // These could be handled in future implementations
          break;
        case WebSocketMessageType.ERROR:
          console.error('WebSocket error:', message.data);
          break;
        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  /**
   * Handles WebSocket close event
   */
  private handleWebSocketClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.webSocket = null; // Ensure the WebSocket property is set to null

    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.playerID) {
          this.connectWebSocket(this.playerID, true);
        }
      }, this.reconnectDelay);
    }
  }

  /**
   * Handles WebSocket error event
   */
  private handleWebSocketError(event: Event): void {
    console.error('WebSocket error occurred:', event);
  }

  /**
   * Handles connection update messages from the WebSocket
   * 
   * @param data Connection update data
   */
  private handleConnectionUpdate(data: any): void {
    const update: ConnectionStatusUpdate = {
      id: data.id,
      status: this.mapStatusString(data.status),
      updatedAt: data.updatedAt
    };
    
    // Notify all registered handlers
    this.connectionUpdateHandlers.forEach(handler => {
      try {
        handler(update);
      } catch (error) {
        console.error('Error in connection update handler:', error);
      }
    });
  }
}