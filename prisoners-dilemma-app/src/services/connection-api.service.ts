// src/services/connection-api.service.ts
import { Result } from './connection-result';
import { ApiError, ApiErrorType } from './api-error';
import { ConnectionStatus } from './connection.service';

// Type definitions for WebSocket messages and responses
export interface ConnectionData {
  connectionId: string;
  name: string;
  status?: ConnectionStatus;
  created?: string;
}

export interface StatusUpdateData {
  connectionId: string;
  status: ConnectionStatus;
}

interface WebSocketMessage {
  type: string;
  data: any;
  requestId?: string;
}

type ConnectionCreatedCallback = (data: ConnectionData) => void;
type ConnectionStatusUpdatedCallback = (data: StatusUpdateData) => void;
type ConnectionsReceivedCallback = (data: ConnectionData[]) => void;
type ErrorReceivedCallback = (error: ApiError) => void;

export class ConnectionApiService {
  private socket: WebSocket | null = null;
  private requestMap = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  private connectionCreatedCallbacks: ConnectionCreatedCallback[] = [];
  private statusUpdatedCallbacks: ConnectionStatusUpdatedCallback[] = [];
  private connectionsReceivedCallbacks: ConnectionsReceivedCallback[] = [];
  private errorReceivedCallbacks: ErrorReceivedCallback[] = [];

  constructor(private serverUrl: string, private requestTimeoutMs: number = 10000) {}

  public async connect(playerId: string): Promise<Result<boolean, ApiError>> {
    try {
      return new Promise<Result<boolean, ApiError>>((resolve) => {
        try {
          this.socket = new WebSocket(this.serverUrl);
          
          this.socket.onopen = () => {
            this.sendAuthMessage(playerId);
            resolve(Result.success(true));
          };
          
          this.socket.onclose = () => {
            // Handle reconnection logic if needed
            this.socket = null;
          };
          
          this.socket.onerror = (_event) => {
            resolve(Result.failure(new ApiError(
              ApiErrorType.CONNECTION_FAILED,
              'WebSocket connection failed'
            )));
            this.socket = null;
          };
          
          this.socket.onmessage = this.handleMessage.bind(this);
        } catch (error) {
          resolve(Result.failure(ApiError.fromError(error)));
        }
      });
    } catch (error) {
      return Result.failure(ApiError.fromError(error));
    }
  }

  public disconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    
    this.socket = null;
    this.clearAllPendingRequests(new ApiError(
      ApiErrorType.CONNECTION_FAILED,
      'WebSocket disconnected'
    ));
  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  public async createConnection(name: string): Promise<Result<ConnectionData, ApiError>> {
    return this.sendRequest<ConnectionData>('create_connection', { name });
  }

  public async joinConnection(connectionId: string, name: string): Promise<Result<ConnectionData, ApiError>> {
    return this.sendRequest<ConnectionData>('join_connection', { connectionId, name });
  }

  public async updateConnectionStatus(
    connectionId: string, 
    status: ConnectionStatus
  ): Promise<Result<StatusUpdateData, ApiError>> {
    return this.sendRequest<StatusUpdateData>('update_status', { connectionId, status });
  }

  public async getConnections(): Promise<Result<ConnectionData[], ApiError>> {
    return this.sendRequest<ConnectionData[]>('get_connections', {});
  }

  // Event listeners for WebSocket messages
  public onConnectionCreated(callback: ConnectionCreatedCallback): void {
    this.connectionCreatedCallbacks.push(callback);
  }

  public onConnectionStatusUpdated(callback: ConnectionStatusUpdatedCallback): void {
    this.statusUpdatedCallbacks.push(callback);
  }

  public onConnectionsReceived(callback: ConnectionsReceivedCallback): void {
    this.connectionsReceivedCallbacks.push(callback);
  }

  public onError(callback: ErrorReceivedCallback): void {
    this.errorReceivedCallbacks.push(callback);
  }

  // Private methods
  private sendAuthMessage(playerId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'authenticate',
        data: { playerId }
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  private async sendRequest<T>(type: string, data: any): Promise<Result<T, ApiError>> {
    if (!this.isConnected()) {
      return Result.failure(new ApiError(
        ApiErrorType.NOT_CONNECTED,
        'WebSocket is not connected'
      ));
    }
    
    try {
      const requestId = this.generateRequestId();
      
      const message: WebSocketMessage = {
        type,
        data,
        requestId
      };
      
      const resultPromise = new Promise<Result<T, ApiError>>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.requestMap.delete(requestId);
          resolve(Result.failure(new ApiError(
            ApiErrorType.TIMEOUT,
            `Request timeout: ${type}`
          )));
        }, this.requestTimeoutMs);
        
        this.requestMap.set(requestId, { resolve, reject, timeout });
      });
      
      this.socket!.send(JSON.stringify(message));
      return resultPromise;
    } catch (error) {
      return Result.failure(ApiError.fromError(error));
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Handle response to request
      if (message.requestId && this.requestMap.has(message.requestId)) {
        const { resolve, timeout } = this.requestMap.get(message.requestId)!;
        clearTimeout(timeout);
        this.requestMap.delete(message.requestId);
        
        if (message.type === 'error') {
          const apiError = new ApiError(
            message.data.type || ApiErrorType.REQUEST_FAILED,
            message.data.message || 'Unknown error',
            message.data.statusCode
          );
          resolve(Result.failure(apiError));
        } else {
          resolve(Result.success(message.data));
        }
        return;
      }
      
      // Handle event messages
      switch (message.type) {
        case 'connection_created':
          this.connectionCreatedCallbacks.forEach(callback => callback(message.data));
          break;
          
        case 'status_updated':
          this.statusUpdatedCallbacks.forEach(callback => callback(message.data));
          break;
          
        case 'connections_list':
          this.connectionsReceivedCallbacks.forEach(callback => callback(message.data));
          break;
          
        case 'error':
          this.notifyError(new ApiError(
            message.data.type || ApiErrorType.REQUEST_FAILED,
            message.data.message || 'Unknown error',
            message.data.statusCode
          ));
          break;
      }
    } catch (error) {
      this.notifyError(ApiError.fromError(error));
    }
  }

  private notifyError(error: ApiError): void {
    this.errorReceivedCallbacks.forEach(callback => callback(error));
  }

  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private clearAllPendingRequests(error: ApiError): void {
    for (const [_requestId, { resolve, timeout }] of this.requestMap.entries()) {
      clearTimeout(timeout);
      resolve(Result.failure(error));
    }
    this.requestMap.clear();
  }
}