import { expect } from '@open-wc/testing';
import { html, fixture, waitUntil } from '@open-wc/testing-helpers';
import { ConnectionUpdatesManager } from '../../../src/components/connection/ConnectionUpdatesManager';
import { ConnectionStatus } from '../models/connection-status';
import { ConnectionData } from '../../../src/models/ConnectionData';

// Create mock for ConnectionService
class MockConnectionService {
  syncCalls: string[] = [];
  mockConnections: Record<string, ConnectionData> = {};
  
  async syncConnectionWithServer(connectionId: string) {
    this.syncCalls.push(connectionId);
    
    if (this.mockConnections[connectionId]) {
      return { 
        isSuccess: () => true, 
        value: this.mockConnections[connectionId]
      };
    }
    
    return { 
      isSuccess: () => false, 
      error: new Error('Connection not found')
    };
  }
  
  setup(connections: ConnectionData[]) {
    connections.forEach(conn => {
      this.mockConnections[conn.id] = conn;
    });
  }
}

describe('ConnectionUpdatesManager', () => {
  let element: ConnectionUpdatesManager;
  let mockService: MockConnectionService;
  
  beforeEach(async () => {
    // Create a new mock service for each test
    mockService = new MockConnectionService();
    
    // Create the element
    element = await fixture(html`<connection-updates-manager></connection-updates-manager>`);
    
    // Inject the mock service
    (element as any).connectionService = mockService;
  });
  
  it('should initialize without connections', async () => {
    expect(element.connections.length).to.equal(0);
    
    // Check the UI shows no connections message
    const noConnectionsMessage = element.shadowRoot?.querySelector('.no-connections');
    expect(noConnectionsMessage).to.exist;
  });
  
  it('should set connections and display them', async () => {
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      },
      {
        id: 'conn-456',
        name: 'Test Connection 2',
        playerID: 'player-456',
        connectedPlayerID: 'player-789',
        status: ConnectionStatus.ACTIVE,
        createdAt: new Date('2025-05-15T12:00:00Z'),
        updatedAt: new Date('2025-05-15T12:30:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    
    element.setConnections(testConnections);
    await element.updateComplete;
    
    // Check that connections are set
    expect(element.connections).to.deep.equal(testConnections);
    
    // Check that the UI shows the connections
    const connectionItems = element.shadowRoot?.querySelectorAll('.connection-item');
    expect(connectionItems?.length).to.equal(2);
    
    // Check that the first connection item shows correct data
    const firstConnection = connectionItems?.[0];
    expect(firstConnection?.querySelector('.connection-name')?.textContent?.trim()).to.equal('Test Connection 1');
    expect(firstConnection?.querySelector('.connection-status')?.textContent?.trim()).to.include('Pending');
    
    // Check that the second connection item shows correct data
    const secondConnection = connectionItems?.[1];
    expect(secondConnection?.querySelector('.connection-name')?.textContent?.trim()).to.equal('Test Connection 2');
    expect(secondConnection?.querySelector('.connection-status')?.textContent?.trim()).to.include('Active');
  });
  
  it('should handle connection status updates', async () => {
    // Set up initial connections
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.setConnections(testConnections);
    await element.updateComplete;
    
    // Update the connection status in mock service
    mockService.mockConnections['conn-123'] = {
      ...mockService.mockConnections['conn-123'],
      status: ConnectionStatus.ACTIVE,
      connectedPlayerID: 'player-789',
      updatedAt: new Date('2025-05-15T12:30:00Z')
    };
    
    // Simulate a connection update
    await element.handleConnectionUpdate('conn-123');
    
    // Verify that syncConnectionWithServer was called
    expect(mockService.syncCalls).to.include('conn-123');
    
    // Wait for updates to complete
    await element.updateComplete;
    
    // Check that the connection was updated
    expect(element.connections[0].status).to.equal(ConnectionStatus.ACTIVE);
    expect(element.connections[0].connectedPlayerID).to.equal('player-789');
    
    // Check that the UI reflects the updated status
    const connectionStatus = element.shadowRoot?.querySelector('.connection-status');
    expect(connectionStatus?.textContent?.trim()).to.include('Active');
  });
  
  it('should dispatch a connection-updated event when a connection is updated', async () => {
    // Set up initial connections
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.setConnections(testConnections);
    
    // Update the connection status in mock service
    mockService.mockConnections['conn-123'] = {
      ...mockService.mockConnections['conn-123'],
      status: ConnectionStatus.ACTIVE,
      connectedPlayerID: 'player-789',
      updatedAt: new Date('2025-05-15T12:30:00Z')
    };
    
    // Set up event listener
    let eventFired = false;
    let eventDetail = null;
    
    element.addEventListener('connection-updated', (e: Event) => {
      eventFired = true;
      eventDetail = (e as CustomEvent).detail;
    });
    
    // Simulate a connection update
    await element.handleConnectionUpdate('conn-123');
    
    // Verify that the event was fired with the correct detail
    expect(eventFired).to.equal(true);
    expect(eventDetail).to.deep.equal({
      connectionId: 'conn-123',
      connection: mockService.mockConnections['conn-123']
    });
  });
  
  it('should handle expired connections', async () => {
    // Set up initial connections
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.setConnections(testConnections);
    await element.updateComplete;
    
    // Update the connection status in mock service to EXPIRED
    mockService.mockConnections['conn-123'] = {
      ...mockService.mockConnections['conn-123'],
      status: ConnectionStatus.EXPIRED,
      updatedAt: new Date('2025-05-15T12:30:00Z')
    };
    
    // Simulate a connection update
    await element.handleConnectionUpdate('conn-123');
    await element.updateComplete;
    
    // Check that the connection shows expired status
    const connectionStatus = element.shadowRoot?.querySelector('.connection-status');
    expect(connectionStatus?.textContent?.trim()).to.include('Expired');
    expect(connectionStatus?.classList.contains('expired')).to.equal(true);
  });
  
  it('should sync all connections on syncAllConnections call', async () => {
    // Set up multiple connections
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      },
      {
        id: 'conn-456',
        name: 'Test Connection 2',
        playerID: 'player-456',
        status: ConnectionStatus.ACTIVE,
        connectedPlayerID: 'player-789',
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.setConnections(testConnections);
    
    await element.syncAllConnections();
    
    // Verify that syncConnectionWithServer was called for each connection
    expect(mockService.syncCalls).to.include('conn-123');
    expect(mockService.syncCalls).to.include('conn-456');
    expect(mockService.syncCalls.length).to.equal(2);
  });
  
  it('should render dark mode styles correctly', async () => {
    // Add dark mode class to the element
    document.documentElement.classList.add('dark');
    
    // Setup connections
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection 1',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.setConnections(testConnections);
    await element.updateComplete;
    
    // Check that the dark mode styles are applied
    const container = element.shadowRoot?.querySelector('.connections-container');
    expect(getComputedStyle(container!).backgroundColor).to.include('var(--color-background-dark)');
    
    // Clean up
    document.documentElement.classList.remove('dark');
  });
});