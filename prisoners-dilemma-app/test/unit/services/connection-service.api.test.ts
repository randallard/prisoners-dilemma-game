import { expect } from 'vitest';
import { ConnectionService } from '../../../src/services/connection-service';
import { ConnectionApiService, ConnectionApiData, ConnectionStatusUpdate } from '../../../src/services/api/connection-api-service';
import { ConnectionDataMapper } from '../../../src/services/api/connection-data-mapper';
import { ApiError, ApiErrorType } from '../../../src/services/api/api-error';
import { ConnectionStatus } from '../../../src/models/connection-status';
import { Result } from '../../../src/services/utils/result';
import { ConnectionData } from '../../../src/models/connection-data';

// Mock dependencies
vi.mock('../../../src/services/api/connection-api-service');
vi.mock('../../../src/services/api/connection-data-mapper');
vi.mock('../../../src/services/player-storage-service');

describe('ConnectionService with API integration', () => {
  let connectionService: ConnectionService;
  let mockApiService: ConnectionApiService;
  
  beforeEach(() => {
    // Create a fresh mock instance for each test
    mockApiService = {
      createConnection: vi.fn(),
      joinConnection: vi.fn(),
      getConnectionStatus: vi.fn(),
      getPlayerConnections: vi.fn(),
      connectWebSocket: vi.fn(),
      disconnectWebSocket: vi.fn(),
      isConnected: vi.fn(),
      onConnectionUpdate: vi.fn(),
      offConnectionUpdate: vi.fn()
    } as unknown as ConnectionApiService;
    
    // Reset all mocks
    vi.resetAllMocks();
    
    // Create an instance of ConnectionService with the mock API service
    connectionService = new ConnectionService();
    
    // Inject the mock API service
    (connectionService as any).apiService = mockApiService;
  });
  
  describe('createConnectionWithServer', () => {
    it('should create a connection on the server and store it locally', async () => {
      const playerID = 'player-123';
      const apiConnection: ConnectionApiData = {
        id: 'conn-456',
        playerID: playerID,
        status: ConnectionStatus.PENDING,
        createdAt: '2025-05-15T12:00:00Z',
        name: 'player-456'
      };
      
      const localConnection = {
        id: 'conn-456',
        name: 'Pending Connection',
        playerID: playerID,
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      };
      
      // Mock API service to return a successful result
      (mockApiService.createConnection as vi.Mock).mockResolvedValue(
        Result.success(apiConnection)
      );
      
      // Mock ConnectionDataMapper
      (ConnectionDataMapper.fromApiModel as vi.Mock).mockReturnValue(localConnection);
      
      // Mock the storeConnection method
      (connectionService as any).storeConnection = vi.fn().mockResolvedValue(
        Result.success(localConnection)
      );
      
      const result = await connectionService.createConnectionWithServer(playerID);
      
      // Verify API service was called correctly
      expect(mockApiService.createConnection).toHaveBeenCalledWith(playerID);
      
      // Verify ConnectionDataMapper was used
      expect(ConnectionDataMapper.fromApiModel).toHaveBeenCalledWith(apiConnection);
      
      // Verify connection was stored locally
      expect((connectionService as any).storeConnection).toHaveBeenCalledWith(localConnection);
      
      // Verify successful result
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue()).toEqual(localConnection);
      }
    });
    
    it('should return an error if API request fails', async () => {
      const playerID = 'player-123';
      const apiError = new ApiError(
        ApiErrorType.NETWORK_ERROR,
        'Failed to connect to server'
      );
      
      // Mock API service to return an error
      (mockApiService.createConnection as vi.Mock).mockResolvedValue(
        Result.failure(apiError)
      );
      
      const result = await connectionService.createConnectionWithServer(playerID);
      
      // Verify API service was called
      expect(mockApiService.createConnection).toHaveBeenCalledWith(playerID);
      
      // Verify storeConnection was NOT called
      expect((connectionService as any).storeConnection).not.toHaveBeenCalled();
      
      // Verify error result
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.getError()).toBe(apiError);
      }
    });
  });
  
  describe('joinConnectionWithServer', () => {
    it('should join a connection on the server and update it locally', async () => {
      const connectionId = 'conn-456';
      const playerID = 'player-789';
      
      const apiConnection: ConnectionApiData = {
        id: connectionId,
        playerID: 'player-123',
        connectedPlayerID: playerID,
        status: ConnectionStatus.ACTIVE,
        createdAt: '2025-05-15T12:00:00Z',
        updatedAt: '2025-05-15T12:30:00Z',
        name: ''
      };
      
      const localConnection: ConnectionData = {
        id: connectionId,
        name: 'Connection with player-123',
        playerID: 'player-123',
        connectedPlayerID: playerID,
        status: ConnectionStatus.ACTIVE,
        createdAt: new Date('2025-05-15T12:00:00Z'),
        updatedAt: new Date('2025-05-15T12:30:00Z')
      };
      
      // Mock API service to return a successful result
      (mockApiService.joinConnection as vi.Mock).mockResolvedValue(
        Result.success(apiConnection)
      );
      
      // Mock ConnectionDataMapper
      (ConnectionDataMapper.fromApiModel as vi.Mock).mockReturnValue(localConnection);
      
      // Mock the updateConnection method
      (connectionService as any).updateConnection = vi.fn().mockResolvedValue(
        Result.success(localConnection)
      );
      
      const result = await connectionService.joinConnectionWithServer(connectionId, playerID);
      
      // Verify API service was called correctly
      expect(mockApiService.joinConnection).toHaveBeenCalledWith(connectionId, playerID);
      
      // Verify ConnectionDataMapper was used
      expect(ConnectionDataMapper.fromApiModel).toHaveBeenCalledWith(apiConnection);
      
      // Verify connection was updated locally
      expect((connectionService as any).updateConnection).toHaveBeenCalledWith(connectionId, localConnection);
      
      // Verify successful result
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue()).toEqual(localConnection);
      }
    });
    
    it('should return an error if API request fails', async () => {
      const connectionId = 'conn-456';
      const playerID = 'player-789';
      const apiError = new ApiError(
        ApiErrorType.CONNECTION_NOT_FOUND,
        'Connection not found',
        404
      );
      
      // Mock API service to return an error
      (mockApiService.joinConnection as vi.Mock).mockResolvedValue(
        Result.failure(apiError)
      );
      
      const result = await connectionService.joinConnectionWithServer(connectionId, playerID);
      
      // Verify API service was called
      expect(mockApiService.joinConnection).toHaveBeenCalledWith(connectionId, playerID);
      
      // Verify updateConnection was NOT called
      expect((connectionService as any).updateConnection).not.toHaveBeenCalled();
      
      // Verify error result
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.getError()).toBe(apiError);
      }
    });
  });
  
  describe('syncConnectionWithServer', () => {
    it('should fetch the connection status and update local storage', async () => {
      const connectionId = 'conn-456';
      
      const existingConnection: ConnectionData = {
        id: connectionId,
        name: 'My Custom Connection',
        playerID: 'player-123',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      };
      
      const statusUpdate: ConnectionStatusUpdate = {
        id: connectionId,
        status: ConnectionStatus.ACTIVE,
        updatedAt: '2025-05-15T12:30:00Z'
      };
      
      const apiConnection: ConnectionApiData = {
        id: connectionId,
        playerID: 'player-123',
        connectedPlayerID: 'player-789',
        status: ConnectionStatus.ACTIVE,
        createdAt: '2025-05-15T12:00:00Z',
        updatedAt: '2025-05-15T12:30:00Z',
        name: ''
      };
      
      const updatedConnection: ConnectionData = {
        id: connectionId,
        name: 'My Custom Connection', // Preserved from existing connection
        playerID: 'player-123',
        connectedPlayerID: 'player-789',
        status: ConnectionStatus.ACTIVE,
        createdAt: new Date('2025-05-15T12:00:00Z'),
        updatedAt: new Date('2025-05-15T12:30:00Z')
      };
      
      // Mock getConnection to return the existing connection
      (connectionService as any).getConnection = vi.fn().mockResolvedValue(
        Result.success(existingConnection)
      );
      
      // Mock API service to return a successful status update
      (mockApiService.getConnectionStatus as vi.Mock).mockResolvedValue(
        Result.success(statusUpdate)
      );
      
      // Mock API service to return the full connection data
      (mockApiService.getPlayerConnections as vi.Mock).mockResolvedValue(
        Result.success([apiConnection])
      );
      
      // Mock ConnectionDataMapper
      (ConnectionDataMapper.updateLocalFromApi as vi.Mock).mockReturnValue(updatedConnection);
      
      // Mock the updateConnection method
      (connectionService as any).updateConnection = vi.fn().mockResolvedValue(
        Result.success(updatedConnection)
      );
      
      const result = await connectionService.syncConnectionWithServer(connectionId);
      
      // Verify getConnection was called to retrieve the existing connection
      expect((connectionService as any).getConnection).toHaveBeenCalledWith(connectionId);
      
      // Verify API service was called to get the status
      expect(mockApiService.getConnectionStatus).toHaveBeenCalledWith(connectionId);
      
      // Verify ConnectionDataMapper was used to update the local data
      expect(ConnectionDataMapper.updateLocalFromApi).toHaveBeenCalledWith(existingConnection, apiConnection);
      
      // Verify connection was updated locally
      expect((connectionService as any).updateConnection).toHaveBeenCalledWith(connectionId, updatedConnection);
      
      // Verify successful result
      expect(result.isSuccess()).toBe(true);
      if (result.isSuccess()) {
        expect(result.getValue()).toEqual(updatedConnection);
      }
    });
    
    it('should handle expired connections', async () => {
      const connectionId = 'conn-456';
      
      const existingConnection: ConnectionData = {
        id: connectionId,
        name: 'My Custom Connection',
        playerID: 'player-123',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      };
      
      const statusUpdate: ConnectionStatusUpdate = {
        id: connectionId,
        status: ConnectionStatus.EXPIRED,
        updatedAt: '2025-05-15T12:30:00Z'
      };
      
      // Mock getConnection to return the existing connection
      (connectionService as any).getConnection = vi.fn().mockResolvedValue(
        Result.success(existingConnection)
      );
      
      // Mock API service to return a status update with EXPIRED status
      (mockApiService.getConnectionStatus as vi.Mock).mockResolvedValue(
        Result.success(statusUpdate)
      );
      
      // Mock the updateConnection method
      (connectionService as any).updateConnection = vi.fn().mockResolvedValue(
        Result.success({
          ...existingConnection,
          status: ConnectionStatus.EXPIRED,
          updatedAt: new Date('2025-05-15T12:30:00Z')
        })
      );
      
      const result = await connectionService.syncConnectionWithServer(connectionId);
      
      // Verify the connection status was updated to EXPIRED
      expect((connectionService as any).updateConnection).toHaveBeenCalledWith(
        connectionId,
        expect.objectContaining({
          status: ConnectionStatus.EXPIRED
        })
      );
      
      // Verify successful result
      expect(result.isSuccess()).toBe(true);
    });
    
    it('should return an error if the connection is not found locally', async () => {
      const connectionId = 'conn-456';
      
      // Mock getConnection to return error
      (connectionService as any).getConnection = vi.fn().mockResolvedValue(
        Result.failure(new Error('Connection not found'))
      );
      
      const result = await connectionService.syncConnectionWithServer(connectionId);
      
      // Verify API service was NOT called
      expect(mockApiService.getConnectionStatus).not.toHaveBeenCalled();
      
      // Verify error result
      expect(result.isFailure()).toBe(true);
    });
    
    it('should return an error if API request fails', async () => {
      const connectionId = 'conn-456';
      
      const existingConnection: ConnectionData = {
        id: connectionId,
        name: 'My Custom Connection',
        playerID: 'player-123',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      };
      
      const apiError = new ApiError(
        ApiErrorType.NETWORK_ERROR,
        'Failed to connect to server'
      );
      
      // Mock getConnection to return the existing connection
      (connectionService as any).getConnection = vi.fn().mockResolvedValue(
        Result.success(existingConnection)
      );
      
      // Mock API service to return an error
      (mockApiService.getConnectionStatus as vi.Mock).mockResolvedValue(
        Result.failure(apiError)
      );
      
      const result = await connectionService.syncConnectionWithServer(connectionId);
      
      // Verify updateConnection was NOT called
      expect((connectionService as any).updateConnection).not.toHaveBeenCalled();
      
      // Verify error result
      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error).toBe(apiError);
      }
    });
  });
  
  describe('WebSocket integration', () => {
    it('should connect to WebSocket and register update handler', async () => {
      const playerID = 'player-123';
      
      // Mock API service to return a successful result for connectWebSocket
      (mockApiService.connectWebSocket as vi.Mock).mockResolvedValue(
        Result.success(undefined)
      );
      
      const result = await connectionService.connectToWebSocket(playerID);
      
      // Verify API service was called correctly
      expect(mockApiService.connectWebSocket).toHaveBeenCalledWith(playerID, true);
      
      // Verify an update handler was registered
      expect(mockApiService.onConnectionUpdate).toHaveBeenCalled();
      
      // Verify successful result
      expect(result.isSuccess()).toBe(true);
    });
    
    it('should handle connection updates from WebSocket', async () => {
      const connectionId = 'conn-456';
      const statusUpdate: ConnectionStatusUpdate = {
        id: connectionId,
        status: ConnectionStatus.ACTIVE,
        updatedAt: '2025-05-15T12:30:00Z'
      };
      
      // Setup by connecting to WebSocket first
      (mockApiService.connectWebSocket as vi.Mock).mockResolvedValue(
        Result.success(undefined)
      );
      
      await connectionService.connectToWebSocket('player-123');
      
      // Get the registered handler function
      const updateHandler = (mockApiService.onConnectionUpdate as vi.Mock).mock.calls[0][0];
      
      // Mock syncConnectionWithServer
      (connectionService as any).syncConnectionWithServer = vi.fn().mockResolvedValue(
        Result.success({
          id: connectionId,
          name: 'Updated Connection',
          status: ConnectionStatus.ACTIVE
        })
      );
      
      // Simulate a WebSocket update by calling the handler
      await updateHandler(statusUpdate);
      
      // Verify syncConnectionWithServer was called
      expect((connectionService as any).syncConnectionWithServer).toHaveBeenCalledWith(connectionId);
    });
    
    it('should disconnect from WebSocket when requested', () => {
      connectionService.disconnectFromWebSocket();
      
      // Verify API service was called
      expect(mockApiService.disconnectWebSocket).toHaveBeenCalled();
      
      // Verify the update handler was removed
      expect(mockApiService.offConnectionUpdate).toHaveBeenCalled();
    });
  });
});