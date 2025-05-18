// test/unit/services/connection-api.service.test.ts
import { expect } from 'vitest';
import { describe, it, beforeEach, vi, afterEach } from 'vitest';
import { ConnectionApiService } from '../../../src/services/connection-api.service';
import { ApiError, ApiErrorType } from '../../../src/services/api-error';
import { Result } from '../../../src/services/connection-result';
import { ConnectionStatus } from '../../../src/services/connection.service';

// Updated MockWebSocket
class MockWebSocket {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0; // CONNECTING

  // Define constants
  static readonly CONNECTING: number = 0;
  static readonly OPEN: number = 1;
  static readonly CLOSING: number = 2;
  static readonly CLOSED: number = 3;
  
  // Add these to instance for compatibility with WebSocket interface
  readonly CONNECTING: number = 0;
  readonly OPEN: number = 1;
  readonly CLOSING: number = 2;
  readonly CLOSED: number = 3;
  
  constructor(url: string) {
    this.url = url;
    // Simulate successful connection after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    // Mock implementation - can be spied on
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper methods for tests to trigger events
  mockServerMessage(data: any): void {
    if (this.onmessage) {
      const messageEvent = new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data)
      });
      this.onmessage(messageEvent);
    }
  }

  mockServerResponse(requestId: string, data: any): void {
    this.mockServerMessage({
      type: 'response',
      requestId,
      data
    });
  }

  mockError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket);

describe('ConnectionApiService', () => {
  let service: ConnectionApiService;
  let mockSocket: MockWebSocket;
  const serverUrl = 'wss://example.com/ws';
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConnectionApiService(serverUrl);
  });

  afterEach(() => {
    service.disconnect();
  });

  // Helper function to simulate request/response cycle
  async function simulateResponse(requestType: string, responseData: any): Promise<void> {
    // Get the sent message
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
    const sentMessage = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(sentMessage.type).toBe(requestType);
    
    // Simulate server response
    mockSocket = service['socket'] as MockWebSocket;
    mockSocket.mockServerResponse(sentMessage.requestId, responseData);
  }

  describe('connect', () => {
    it('should establish a WebSocket connection', async () => {
      const connectResult = await service.connect('player-id');
      
      expect(connectResult.isOk()).toBe(true);
      expect(service.isConnected()).toBe(true);
    });

    it('should return error when connection fails', async () => {
      // Create a service with a custom WebSocket that will fail
      const failingService = new ConnectionApiService(serverUrl);
      
      // Replace the socket creation with a mock that triggers error
      vi.spyOn(global, 'WebSocket').mockImplementationOnce((url: string | URL, protocols?: string | string[]) => {
        const socketUrl = typeof url === 'string' ? url : url.toString();
        const socket = new MockWebSocket(socketUrl);
        // Immediately trigger an error
        setTimeout(() => socket.mockError(), 0);
        return socket;
      });
      
      const connectResult = await failingService.connect('player-id');
      
      expect(connectResult.isErr()).toBe(true);
      expect(connectResult.unwrapErr()).toBeInstanceOf(ApiError);
      expect(connectResult.unwrapErr().type).toBe(ApiErrorType.CONNECTION_FAILED);
    });
  });

  describe('createConnection', () => {
    it('should send connection creation request', async () => {
      // Setup
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      await service.connect('player-id');
      
      // Act
      const createPromise = service.createConnection('Test Connection');
      
      // Simulate server response
      await simulateResponse('create_connection', {
        connectionId: 'new-connection-id',
        name: 'Test Connection'
      });
      
      // Assert
      const result = await createPromise;
      expect(sendSpy).toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
      
      // Check that the sent message contains the connection name
      const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('create_connection');
      expect(sentData.data.name).toBe('Test Connection');
    });

    it('should return error when not connected', async () => {
      const result = await service.createConnection('Test Connection');
      
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().type).toBe(ApiErrorType.NOT_CONNECTED);
    });
  });

  describe('joinConnection', () => {
    it('should send join connection request', async () => {
      // Setup
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      await service.connect('player-id');
      
      // Act
      const joinPromise = service.joinConnection('connection-id', 'Connection Name');
      
      // Simulate server response
      await simulateResponse('join_connection', {
        connectionId: 'connection-id',
        name: 'Connection Name'
      });
      
      // Assert
      const result = await joinPromise;
      expect(sendSpy).toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
      
      const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('join_connection');
      expect(sentData.data.connectionId).toBe('connection-id');
    });
  });

  describe('updateConnectionStatus', () => {
    it('should send status update request', async () => {
      // Setup
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      await service.connect('player-id');
      
      // Act
      const updatePromise = service.updateConnectionStatus('connection-id', ConnectionStatus.ACTIVE);
      
      // Simulate server response
      await simulateResponse('update_status', {
        connectionId: 'connection-id',
        status: ConnectionStatus.ACTIVE
      });
      
      // Assert
      const result = await updatePromise;
      expect(sendSpy).toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
      
      const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('update_status');
      expect(sentData.data.connectionId).toBe('connection-id');
      expect(sentData.data.status).toBe(ConnectionStatus.ACTIVE);
    });
  });

  describe('getConnections', () => {
    it('should send get connections request', async () => {
      // Setup
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      await service.connect('player-id');
      
      // Act
      const getConnectionsPromise = service.getConnections();
      
      // Simulate server response with array of connections
      await simulateResponse('get_connections', [
        { connectionId: 'conn-1', name: 'Connection 1' },
        { connectionId: 'conn-2', name: 'Connection 2' }
      ]);
      
      // Assert
      const result = await getConnectionsPromise;
      expect(sendSpy).toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().length).toBe(2);
      
      const sentData = JSON.parse(sendSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('get_connections');
    });
  });

  describe('message handling', () => {
    it('should handle connection created message', async () => {
      // Setup
      await service.connect('player-id');
      const callback = vi.fn();
      service.onConnectionCreated(callback);
      
      // Simulate message from server
      mockSocket = service['socket'] as MockWebSocket;
      mockSocket.mockServerMessage({
        type: 'connection_created',
        data: {
          connectionId: 'new-connection-id',
          name: 'New Connection'
        }
      });
      
      // Assert
      expect(callback).toHaveBeenCalledWith({
        connectionId: 'new-connection-id',
        name: 'New Connection'
      });
    });

    it('should handle connection status updated message', async () => {
      // Setup
      await service.connect('player-id');
      const callback = vi.fn();
      service.onConnectionStatusUpdated(callback);
      
      // Simulate message from server
      mockSocket = service['socket'] as MockWebSocket;
      mockSocket.mockServerMessage({
        type: 'status_updated',
        data: {
          connectionId: 'connection-id',
          status: ConnectionStatus.ACTIVE
        }
      });
      
      // Assert
      expect(callback).toHaveBeenCalledWith({
        connectionId: 'connection-id',
        status: ConnectionStatus.ACTIVE
      });
    });
  });

  describe('error handling', () => {
    it('should map WebSocket errors to ApiError', async () => {
      // Setup: Create a connection then simulate an error
      await service.connect('player-id');
      mockSocket = service['socket'] as MockWebSocket;
      
      // Simulate error
      mockSocket.mockError();
      
      // Try an operation after the error
      const result = await service.getConnections();
      
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().type).toBe(ApiErrorType.COMMUNICATION_ERROR);
    });
  });
});