import { expect } from '@open-wc/testing';
import { html, fixture, waitUntil } from '@open-wc/testing-helpers';
import { WebsocketConnectionManager } from '../../src/components/connection/websocket-connection-manager';
import { ConnectionStatus } from '../../src/models/connection-status';
import { ConnectionData } from '../../src/models/connection-data';

// Mock the child components to isolate testing
customElements.define('connection-status-indicator', class extends HTMLElement {
  playerID = '';
  isConnected = false;
  
  static get observedAttributes() { return ['player-id']; }
  
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'player-id') {
      this.playerID = newValue;
      // Simulate connection
      setTimeout(() => {
        this.isConnected = true;
        this.dispatchEvent(new CustomEvent('connection-state-changed', {
          detail: { isConnected: true },
          bubbles: true,
          composed: true
        }));
      }, 10);
    }
  }
  
  // Mock methods for testing
  setPlayerID(id: string) {
    this.playerID = id;
    this.isConnected = true;
    this.dispatchEvent(new CustomEvent('connection-state-changed', {
      detail: { isConnected: true },
      bubbles: true,
      composed: true
    }));
  }
  
  disconnect() {
    this.isConnected = false;
    this.dispatchEvent(new CustomEvent('connection-state-changed', {
      detail: { isConnected: false },
      bubbles: true,
      composed: true
    }));
  }
});

customElements.define('connection-updates-manager', class extends HTMLElement {
  connections: ConnectionData[] = [];
  
  // Mock method for testing
  setConnections(connections: ConnectionData[]) {
    this.connections = connections;
  }
});

// Mock ConnectionService
class MockConnectionService {
  connections: ConnectionData[] = [];
  
  async getAllConnections() {
    return { 
      isSuccess: () => true, 
      value: this.connections 
    };
  }
  
  async connectToWebSocket(playerID: string) {
    return { 
      isSuccess: () => true, 
      value: undefined 
    };
  }
  
  disconnectFromWebSocket() {
    // Mock implementation
  }
  
  setup(connections: ConnectionData[]) {
    this.connections = connections;
  }
}

describe('WebsocketConnectionManager', () => {
  let element: WebsocketConnectionManager;
  let mockService: MockConnectionService;
  
  beforeEach(async () => {
    // Create a new mock service for each test
    mockService = new MockConnectionService();
    
    // Create the element
    element = await fixture(html`<websocket-connection-manager></websocket-connection-manager>`);
    
    // Inject the mock service
    (element as any).connectionService = mockService;
  });
  
  it('should initialize without connections', async () => {
    expect(element.connections.length).to.equal(0);
    expect(element.isConnected).to.equal(false);
    
    // Check that only the connection status section is shown
    const updatesManager = element.shadowRoot?.querySelector('connection-updates-manager');
    expect(updatesManager).to.be.null;
  });
  
  it('should load connections and connect when playerID is set', async () => {
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    
    // Set player ID
    element.playerID = 'player-456';
    
    // Wait for connection to be established
    await waitUntil(() => element.isConnected);
    
    // Check that connections are loaded
    expect(element.connections).to.deep.equal(testConnections);
    
    // Check that the connection-updates-manager is now visible
    const updatesManager = element.shadowRoot?.querySelector('connection-updates-manager');
    expect(updatesManager).to.exist;
  });
  
  it('should handle connection state changes', async () => {
    // Set player ID
    element.playerID = 'player-456';
    
    // Wait for connection to be established
    await waitUntil(() => element.isConnected);
    
    // Check that isConnected is true
    expect(element.isConnected).to.equal(true);
    
    // Manually trigger a disconnected event
    const statusIndicator = element.shadowRoot?.querySelector('connection-status-indicator');
    (statusIndicator as any).disconnect();
    
    // Check that isConnected is now false
    expect(element.isConnected).to.equal(false);
    
    // Check that the connection-updates-manager is no longer visible
    const updatesManager = element.shadowRoot?.querySelector('connection-updates-manager');
    expect(updatesManager).to.be.null;
  });
  
  it('should update connections when receiving connection-updated event', async () => {
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.playerID = 'player-456';
    
    // Wait for connection to be established
    await waitUntil(() => element.isConnected);
    
    // Create an updated connection
    const updatedConnection: ConnectionData = {
      ...testConnections[0],
      status: ConnectionStatus.ACTIVE,
      connectedPlayerID: 'player-789',
      updatedAt: new Date('2025-05-15T12:30:00Z')
    };
    
    // Simulate a connection-updated event
    element.dispatchEvent(new CustomEvent('connection-updated', {
      detail: {
        connectionId: 'conn-123',
        connection: updatedConnection
      },
      bubbles: true,
      composed: true
    }));
    
    // Check that the connection was updated
    expect(element.connections[0].status).to.equal(ConnectionStatus.ACTIVE);
    expect(element.connections[0].connectedPlayerID).to.equal('player-789');
  });
  
  it('should properly set player-id attribute on child components', async () => {
    element.playerID = 'player-456';
    await element.updateComplete;
    
    const statusIndicator = element.shadowRoot?.querySelector('connection-status-indicator');
    expect(statusIndicator?.getAttribute('player-id')).to.equal('player-456');
  });
  
  it('should pass connections to the updates manager', async () => {
    const testConnections: ConnectionData[] = [
      {
        id: 'conn-123',
        name: 'Test Connection',
        playerID: 'player-456',
        status: ConnectionStatus.PENDING,
        createdAt: new Date('2025-05-15T12:00:00Z')
      }
    ];
    
    mockService.setup(testConnections);
    element.playerID = 'player-456';
    
    // Wait for connection to be established
    await waitUntil(() => element.isConnected);
    await element.updateComplete;
    
    const updatesManager = element.shadowRoot?.querySelector('connection-updates-manager');
    expect((updatesManager as any).connections).to.deep.equal(testConnections);
  });
  
  it('should disconnect WebSocket when component is removed', async () => {
    element.playerID = 'player-456';
    
    // Wait for connection to be established
    await waitUntil(() => element.isConnected);
    
    // Spy on disconnectWebSocket
    const spy = vi.spyOn(element, 'disconnectWebSocket');
    
    // Simulate component removal
    element.disconnectedCallback();
    
    // Check that disconnectWebSocket was called
    expect(spy).toHaveBeenCalled();
  });
});