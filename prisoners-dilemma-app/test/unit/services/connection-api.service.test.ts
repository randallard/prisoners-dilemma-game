import { expect } from 'vitest';
import { ConnectionApiService } from '../../../src/services/api/connection-api-service';
import { ApiError, ApiErrorType } from '../../../src/services/api/api-error';
import { ConnectionStatus } from '../models/connection-status';

// Mock WebSocket implementation for testing
class MockWebSocket {
  url: string;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState: number = 0; // WebSocket.CONNECTING
  
  constructor(url: string) {
    this.url = url;
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  close(): void {
    // Mock implementation
  }
  
  // Helper methods for testing
  simulateOpen(): void {
    this.readyState = 1; // WebSocket.OPEN
    if (this.onopen) this.onopen({ type: 'open' });
  }
  
  simulateMessage(data: any): void {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }
  
  simulateError(): void {
    if (this.onerror) this.onerror({ type: 'error' });
  }
  
  simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) this.onclose({ code, reason, type: 'close' });
  }
}

// Mock fetch implementation for testing
global.fetch = vi.fn();
// Mock WebSocket implementation
global.WebSocket = MockWebSocket as any;

describe('ConnectionApiService', () => {
  let apiService: ConnectionApiService;
  const apiUrl = 'https://api.example.com';
  const wsUrl = 'wss://ws.example.com';
  
  beforeEach(() => {
    apiService = new ConnectionApiService(apiUrl, wsUrl);
    (global.fetch as any).mockReset();
  });
  
  describe('createConnection', () => {
    it('should successfully create a connection', async () => {
      const playerID = '123';
      const mockResponse = {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'conn-456',
          playerID: playerID,
          status: 'PENDING',
          createdAt: '2025-05-15T12:00:00Z'
        })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await apiService.createConnection(playerID);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/connections`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
      
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue().id).toBe('conn-456');
        expect(result.getValue().playerID).toBe(playerID);
        expect(result.getValue().status).toBe(ConnectionStatus.PENDING);
      }
    });
    
    it('should return error when network request fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await apiService.createConnection('123');
      
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.getError()).toBeInstanceOf(ApiError);
        expect(result.getError().type).toBe(ApiErrorType.NETWORK_ERROR);
      }
    });
    
    it('should return error when server returns error status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await apiService.createConnection('123');
      
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.getError()).toBeInstanceOf(ApiError);
        expect(result.getError().type).toBe(ApiErrorType.SERVER_ERROR);
        expect(result.getError().statusCode).toBe(500);
      }
    });
  });

  describe('joinConnection', () => {
    it('should successfully join a connection', async () => {
      const connectionId = 'conn-456';
      const playerID = '789';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: connectionId,
          playerID: '123',
          connectedPlayerID: playerID,
          status: 'ACTIVE',
          updatedAt: '2025-05-15T12:30:00Z'
        })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await apiService.joinConnection(connectionId, playerID);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/connections/${connectionId}/join`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
      
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue().id).toBe(connectionId);
        expect(result.getValue().connectedPlayerID).toBe(playerID);
        expect(result.getValue().status).toBe(ConnectionStatus.ACTIVE);
      }
    });
    
    it('should return error when connection is not found', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Connection not found' })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await apiService.joinConnection('invalid-id', '789');
      
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.getError()).toBeInstanceOf(ApiError);
        expect(result.getError().type).toBe(ApiErrorType.CONNECTION_NOT_FOUND);
        expect(result.getError().statusCode).toBe(404);
      }
    });
  });

  describe('getConnectionStatus', () => {
    it('should return the current connection status', async () => {
      const connectionId = 'conn-456';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: connectionId,
          status: 'ACTIVE',
          updatedAt: '2025-05-15T12:30:00Z'
        })
      };
      
      (global.fetch as any).mockResolvedValueOnce(mockResponse);
      
      const result = await apiService.getConnectionStatus(connectionId);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/connections/${connectionId}/status`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object)
        })
      );
      
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue().status).toBe(ConnectionStatus.ACTIVE);
      }
    });
  });
  
  describe('WebSocket Functionality', () => {
    it('should establish WebSocket connection', async () => {
      const playerId = '123';
      
      const connectResult = await apiService.connectWebSocket(playerId);
      expect(connectResult.isSuccess()).toBe(true);
      
      const mockWs = apiService['webSocket'] as unknown as MockWebSocket;
      expect(mockWs.url).toBe(`${wsUrl}?playerId=${playerId}`);
      
      // Simulate successful connection
      mockWs.simulateOpen();
      
      expect(apiService.isConnected()).toBe(true);
    });
    
    it('should handle connection errors', async () => {
      const playerId = '123';
      
      const connectResult = await apiService.connectWebSocket(playerId);
      expect(connectResult.isSuccess()).toBe(true);
      
      const mockWs = apiService['webSocket'] as unknown as MockWebSocket;
      
      // Simulate connection error
      mockWs.simulateError();
      
      expect(apiService.isConnected()).toBe(false);
    });
    
    it('should process connection update messages', async () => {
      const playerId = '123';
      const connectionId = 'conn-456';
      
      // Set up message handler
      let receivedUpdate: any = null;
      apiService.onConnectionUpdate((update) => {
        receivedUpdate = update;
      });
      
      await apiService.connectWebSocket(playerId);
      const mockWs = apiService['webSocket'] as unknown as MockWebSocket;
      mockWs.simulateOpen();
      
      // Simulate receiving a connection update
      const updateMessage = {
        type: 'CONNECTION_UPDATE',
        data: {
          id: connectionId,
          status: 'ACTIVE',
          updatedAt: '2025-05-15T13:00:00Z'
        }
      };
      
      mockWs.simulateMessage(updateMessage);
      
      expect(receivedUpdate).not.toBeNull();
      expect(receivedUpdate.id).toBe(connectionId);
      expect(receivedUpdate.status).toBe(ConnectionStatus.ACTIVE);
    });
    
    it('should handle WebSocket disconnection', async () => {
      const playerId = '123';
      
      await apiService.connectWebSocket(playerId);
      const mockWs = apiService['webSocket'] as unknown as MockWebSocket;
      mockWs.simulateOpen();
      
      // Initially connected
      expect(apiService.isConnected()).toBe(true);
      
      // Simulate disconnection
      mockWs.simulateClose(1000, 'Normal closure');
      
      // Should now be disconnected
      expect(apiService.isConnected()).toBe(false);
    });
    
    it('should automatically reconnect after disconnection', async () => {
      const playerId = '123';
      
      vi.useFakeTimers();
      
      await apiService.connectWebSocket(playerId, true); // Enable auto-reconnect
      let mockWs = apiService['webSocket'] as unknown as MockWebSocket;
      mockWs.simulateOpen();
      
      // Simulate disconnection
      mockWs.simulateClose(1006, 'Abnormal closure');
      
      // Fast-forward past reconnect delay
      vi.advanceTimersByTime(5000);
      
      // Should have attempted to reconnect
      mockWs = apiService['webSocket'] as unknown as MockWebSocket; // Get the new instance
      expect(mockWs.url).toBe(`${wsUrl}?playerId=${playerId}`);
      
      vi.useRealTimers();
    });
  });
});