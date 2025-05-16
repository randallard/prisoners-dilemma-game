import { expect } from '@open-wc/testing';
import { html, fixture, waitUntil } from '@open-wc/testing-helpers';
import { ConnectionStatus } from '../models/connection-status';
import { ConnectionStatusIndicator } from '../../../src/components/connection/ConnectionStatusIndicator';

// Mock the ConnectionService
class MockConnectionService {
  isConnected = false;
  connectCalled = false;
  connectPlayerID: string | null = null;
  
  async connectToWebSocket(playerID: string) {
    this.connectCalled = true;
    this.connectPlayerID = playerID;
    this.isConnected = true;
    return { isSuccess: () => true, value: undefined };
  }
  
  disconnectFromWebSocket() {
    this.isConnected = false;
  }
}

describe('ConnectionStatusIndicator', () => {
  let element: ConnectionStatusIndicator;
  let mockService: MockConnectionService;
  
  // Helper function to create a fixture with specific attributes
  async function createFixture(attributes = {}) {
    const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    
    return fixture(html`<connection-status-indicator ${attrs}></connection-status-indicator>`);
  }
  
  beforeEach(async () => {
    // Create a new mock service for each test
    mockService = new MockConnectionService();
    
    // Create the element
    element = await createFixture();
    
    // Inject the mock service
    (element as any).connectionService = mockService;
  });
  
  it('should initialize with disconnected state', async () => {
    expect(element.isConnected).to.equal(false);
    
    // Check the UI reflects disconnected state
    const statusElement = element.shadowRoot?.querySelector('.status-indicator');
    expect(statusElement?.classList.contains('disconnected')).to.equal(true);
    expect(statusElement?.classList.contains('connected')).to.equal(false);
    
    const statusText = element.shadowRoot?.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).to.equal('Disconnected');
  });
  
  it('should connect to WebSocket when setPlayerID is called', async () => {
    const playerID = 'player-123';
    
    await element.setPlayerID(playerID);
    
    // Check that the service was called correctly
    expect(mockService.connectCalled).to.equal(true);
    expect(mockService.connectPlayerID).to.equal(playerID);
    
    // Wait for the element to update
    await waitUntil(() => element.isConnected);
    
    // Check that the UI reflects connected state
    const statusElement = element.shadowRoot?.querySelector('.status-indicator');
    expect(statusElement?.classList.contains('connected')).to.equal(true);
    expect(statusElement?.classList.contains('disconnected')).to.equal(false);
    
    const statusText = element.shadowRoot?.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).to.equal('Connected');
  });
  
  it('should disconnect when disconnected property is set', async () => {
    // First connect
    await element.setPlayerID('player-123');
    
    // Then disconnect
    element.disconnect();
    
    // Check that isConnected is false
    expect(element.isConnected).to.equal(false);
    
    // Check that the UI reflects disconnected state
    const statusElement = element.shadowRoot?.querySelector('.status-indicator');
    expect(statusElement?.classList.contains('disconnected')).to.equal(true);
    
    const statusText = element.shadowRoot?.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).to.equal('Disconnected');
  });
  
  it('should automatically reconnect when playerID is set via attribute', async () => {
    element = await createFixture({ 'player-id': 'player-456' });
    (element as any).connectionService = mockService;
    
    // Wait for the element to initialize and connect
    await waitUntil(() => mockService.connectCalled);
    
    // Check that the service was called correctly
    expect(mockService.connectPlayerID).to.equal('player-456');
  });
  
  it('should show appropriate message for connection errors', async () => {
    // Override the mock service to simulate an error
    mockService.connectToWebSocket = async () => {
      return { 
        isSuccess: () => false, 
        error: { 
          message: 'Failed to connect' 
        } 
      };
    };
    
    await element.setPlayerID('player-123');
    
    // Wait for the element to update
    await element.updateComplete;
    
    // Check that isConnected is false
    expect(element.isConnected).to.equal(false);
    
    // Check that the UI reflects error state
    const statusElement = element.shadowRoot?.querySelector('.status-indicator');
    expect(statusElement?.classList.contains('error')).to.equal(true);
    
    const statusText = element.shadowRoot?.querySelector('.status-text');
    expect(statusText?.textContent?.trim()).to.include('Error');
    
    const errorMessage = element.shadowRoot?.querySelector('.error-message');
    expect(errorMessage?.textContent?.trim()).to.include('Failed to connect');
  });
  
  it('should dispatch connection-state-changed event when state changes', async () => {
    let eventFired = false;
    let eventDetail = null;
    
    // Add event listener
    element.addEventListener('connection-state-changed', (e: Event) => {
      eventFired = true;
      eventDetail = (e as CustomEvent).detail;
    });
    
    await element.setPlayerID('player-123');
    
    // Check that the event was fired
    expect(eventFired).to.equal(true);
    expect(eventDetail).to.deep.equal({ 
      isConnected: true 
    });
    
    // Reset and check for disconnect event
    eventFired = false;
    eventDetail = null;
    
    element.disconnect();
    
    expect(eventFired).to.equal(true);
    expect(eventDetail).to.deep.equal({ 
      isConnected: false 
    });
  });
  
  it('should render dark mode styles correctly', async () => {
    // Add dark mode class to the element
    document.documentElement.classList.add('dark');
    
    // Wait for the element to update
    await element.updateComplete;
    
    // Check that the dark mode styles are applied
    const container = element.shadowRoot?.querySelector('.status-container');
    expect(getComputedStyle(container!).backgroundColor).to.include('var(--color-background-dark)');
    
    // Clean up
    document.documentElement.classList.remove('dark');
  });
});