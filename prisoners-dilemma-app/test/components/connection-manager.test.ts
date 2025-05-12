import { html, fixture, expect, oneEvent, waitUntil } from '@open-wc/testing';
import { ConnectionManagerComponent } from '../../src/components/connection/connection-manager';
import { ConnectionStatus, ConnectionData } from '../../src/services/connection.service';
import { MockConnectionService } from './mock-connection-service';

// Make sure the component definition is registered
import '../../src/components/connection/connection-manager';
import '../../src/components/connection/connection-form';
import '../../src/components/connection/connection-list';

describe('ConnectionManagerComponent', () => {
  let element: ConnectionManagerComponent;
  let mockService: MockConnectionService;
  
  beforeEach(async () => {
    // Reset the mock service for each test
    mockService = new MockConnectionService();
    
    // Create element with fixture
    element = await fixture<ConnectionManagerComponent>(html`<connection-manager></connection-manager>`);
    
    // Set the mock service
    element.connectionService = mockService;
    
    // Wait for update to complete
    await element.updateComplete;
    
    // Make sure the child components also use the mock service
    const connectionForm = element.shadowRoot!.querySelector('connection-form');
    if (connectionForm) {
      // @ts-ignore - Accessing public property of the component
      connectionForm.connectionService = mockService;
    }
    
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    if (connectionList) {
      // @ts-ignore - Accessing public property of the component
      connectionList.connectionService = mockService;
    }
  });
  
  it('renders with both the connection form and connection list', async () => {
    // Check that both child components exist
    const connectionForm = element.shadowRoot!.querySelector('connection-form');
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    
    expect(connectionForm).to.exist;
    expect(connectionList).to.exist;
  });
  
  it('allows switching between tabs', async () => {
    // Get the tab buttons
    const newConnectionTab = element.shadowRoot!.querySelector('.tab-button[data-tab="new-connection"]');
    const connectionsListTab = element.shadowRoot!.querySelector('.tab-button[data-tab="connections-list"]');
    
    expect(newConnectionTab).to.exist;
    expect(connectionsListTab).to.exist;
    
    // By default, new connection tab should be active
    expect(newConnectionTab!.classList.contains('active')).to.be.true;
    expect(connectionsListTab!.classList.contains('active')).to.be.false;
    
    // Click the connections list tab
    connectionsListTab!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Now connections list tab should be active
    expect(newConnectionTab!.classList.contains('active')).to.be.false;
    expect(connectionsListTab!.classList.contains('active')).to.be.true;
    
    // Click the new connection tab again
    newConnectionTab!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // New connection tab should be active again
    expect(newConnectionTab!.classList.contains('active')).to.be.true;
    expect(connectionsListTab!.classList.contains('active')).to.be.false;
  });
  
  it('handles connection deletion confirmation', async () => {
    // Set up mock connections
    mockService.setMockConnections([
      {
        id: 'test-connection-id',
        name: 'Test Friend',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now()
      }
    ]);
    
    // Show connections list tab
    element.activeTab = 'connections-list';
    await element.updateComplete;
    
    // Simulate confirm-delete-connection event from connection list
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    expect(connectionList).to.exist;
    
    // Wait for connection list to update to show connections
    // @ts-ignore - Force refresh method on the connection list
    connectionList.refreshConnections();
    await waitUntil(() => connectionList!.shadowRoot!.querySelectorAll('.connection-item').length > 0);
    
    // Create a promise that will resolve when the confirmation dialog appears
    const confirmDialogPromise = waitUntil(() => element.shadowRoot!.querySelector('.confirmation-dialog') !== null);
    
    // Dispatch the event
    connectionList!.dispatchEvent(new CustomEvent('confirm-delete-connection', {
      detail: { connectionId: 'test-connection-id', connectionName: 'Test Friend' },
      bubbles: true,
      composed: true
    }));
    
    // Wait for the confirmation dialog
    await confirmDialogPromise;
    
    // Check that the confirmation dialog is shown
    const confirmationDialog = element.shadowRoot!.querySelector('.confirmation-dialog');
    expect(confirmationDialog).to.exist;
    expect(confirmationDialog!.textContent!).to.include('Test Friend');
    
    // Get confirm and cancel buttons
    const confirmButton = confirmationDialog!.querySelector('.confirm-button');
    const cancelButton = confirmationDialog!.querySelector('.cancel-button');
    
    expect(confirmButton).to.exist;
    expect(cancelButton).to.exist;
    
    // Click the confirm button
    confirmButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that the connection was deleted
    const connections = mockService.getMockConnections();
    expect(connections.length).to.equal(0);
    
    // Check that the confirmation dialog is gone
    const confirmationDialogAfterDelete = element.shadowRoot!.querySelector('.confirmation-dialog');
    expect(confirmationDialogAfterDelete).to.not.exist;
  });
  
  it('allows canceling the deletion confirmation', async () => {
    // Set up mock connections
    mockService.setMockConnections([
      {
        id: 'test-connection-id',
        name: 'Test Friend',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now()
      }
    ]);
    
    // Show connections list tab
    element.activeTab = 'connections-list';
    await element.updateComplete;
    
    // Simulate confirm-delete-connection event from connection list
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    expect(connectionList).to.exist;
    
    // Wait for connection list to update to show connections
    // @ts-ignore - Force refresh method on the connection list
    connectionList.refreshConnections();
    await waitUntil(() => connectionList!.shadowRoot!.querySelectorAll('.connection-item').length > 0);
    
    // Dispatch the event
    connectionList!.dispatchEvent(new CustomEvent('confirm-delete-connection', {
      detail: { connectionId: 'test-connection-id', connectionName: 'Test Friend' },
      bubbles: true,
      composed: true
    }));
    
    // Wait for the confirmation dialog
    await waitUntil(() => element.shadowRoot!.querySelector('.confirmation-dialog') !== null);
    
    // Get the cancel button
    const cancelButton = element.shadowRoot!.querySelector('.confirmation-dialog .cancel-button');
    expect(cancelButton).to.exist;
    
    // Click the cancel button
    cancelButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that the connection was NOT deleted
    const connections = mockService.getMockConnections();
    expect(connections.length).to.equal(1);
    
    // Check that the confirmation dialog is gone
    const confirmationDialogAfterCancel = element.shadowRoot!.querySelector('.confirmation-dialog');
    expect(confirmationDialogAfterCancel).to.not.exist;
  });
  
  it('refreshes the connection list when appropriate events occur', async () => {
    // Show connections list tab
    element.activeTab = 'connections-list';
    await element.updateComplete;
    
    // Mock connections data to ensure the connection list exists
    mockService.setMockConnections([
      {
        id: 'test-connection',
        name: 'Test Connection',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: true,
        createdAt: Date.now()
      }
    ]);
    
    // Get the connection list component
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    expect(connectionList).to.exist;
    
    // Add a spy to track when refreshConnectionsList is called
    let refreshCallCount = 0;
    const originalRefreshMethod = element.refreshConnectionsList;
    element.refreshConnectionsList = function() {
      refreshCallCount++;
      // Call the original method with proper 'this' binding
      return originalRefreshMethod.call(element);
    };
    
    // Dispatch a refresh-connections event from the element (not the connection list)
    // since the event listener is bound on the connection-manager component
    element.dispatchEvent(new CustomEvent('refresh-connections', {
      bubbles: true,
      composed: true
    }));
    
    // Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;
    
    // Check that refreshConnections was called
    expect(refreshCallCount).to.be.greaterThan(0);
  });
  
  it('handles play-with-connection event', async () => {
    // Set up mock connections
    mockService.setMockConnections([
      {
        id: 'active-connection-id',
        name: 'Active Friend',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: true,
        createdAt: Date.now()
      }
    ]);
    
    // Show connections list tab
    element.activeTab = 'connections-list';
    await element.updateComplete;
    
    // Set up listener for the game-requested event
    const eventPromise = oneEvent(element, 'game-requested');
    
    // Simulate a play-with-connection event from connection list
    const connectionList = element.shadowRoot!.querySelector('connection-list');
    expect(connectionList).to.exist;
    
    connectionList!.dispatchEvent(new CustomEvent('play-with-connection', {
      detail: { connectionId: 'active-connection-id', connectionName: 'Active Friend' },
      bubbles: true,
      composed: true
    }));
    
    // Wait for the game-requested event
    const { detail } = await eventPromise;
    
    // Check the event details
    expect(detail).to.exist;
    expect(detail.connectionId).to.equal('active-connection-id');
    expect(detail.connectionName).to.equal('Active Friend');
  });
  
  it('handles incoming connection parameters in URL', async () => {
    // Mock URLSearchParams directly since it's used in the actual code
    const originalURLSearchParams = window.URLSearchParams;
    const mockSearchParams = new Map([['connection', 'incoming-id']]);
    
    // @ts-ignore - Mock URLSearchParams
    window.URLSearchParams = class MockURLSearchParams {
      constructor(search: string) {
        // Empty
      }
      get(key: string) {
        return mockSearchParams.get(key) || null;
      }
    };
    
    try {
      // Create a fresh element to trigger the connection parameter handling
      const newElement = await fixture<ConnectionManagerComponent>(html`<connection-manager></connection-manager>`);
      newElement.connectionService = mockService;
      
      // Manually call the method that would be called in connectedCallback
      newElement.handleIncomingConnectionFromURL();
      
      // Wait for update
      await newElement.updateComplete;
      
      // Check that the incoming connection dialog is shown
      expect(newElement.showIncomingConnectionDialog).to.be.true;
      expect(newElement.incomingConnectionId).to.equal('incoming-id');
    } finally {
      // Always restore original URLSearchParams
      window.URLSearchParams = originalURLSearchParams;
    }
  });
  
  it('renders incoming connection dialog when URL parameter is present', async () => {
    // Mock URLSearchParams directly since it's used in the actual code
    const originalURLSearchParams = window.URLSearchParams;
    const mockSearchParams = new Map([['connection', 'incoming-id']]);
    
    // @ts-ignore - Mock URLSearchParams
    window.URLSearchParams = class MockURLSearchParams {
      constructor(search: string) {
        // Empty
      }
      get(key: string) {
        return mockSearchParams.get(key) || null;
      }
    };
    
    try {
      // Create a fresh element to trigger the connection parameter handling
      const newElement = await fixture<ConnectionManagerComponent>(html`<connection-manager></connection-manager>`);
      newElement.connectionService = mockService;
      
      // Manually call the method that would be called in connectedCallback
      newElement.handleIncomingConnectionFromURL();
      
      // Wait for update
      await newElement.updateComplete;
      
      // Check that incoming connection dialog is shown
      const incomingDialog = newElement.shadowRoot!.querySelector('.incoming-connection-dialog');
      expect(incomingDialog).to.exist;
      
      // Check that it has a name input field
      const nameInput = incomingDialog!.querySelector('input');
      expect(nameInput).to.exist;
    } finally {
      // Always restore original URLSearchParams
      window.URLSearchParams = originalURLSearchParams;
    }
  });
  
  it('registers incoming connection when name is submitted', async () => {
    // Set up the component with a pending incoming connection
    element.showIncomingConnectionDialog = true;
    element.incomingConnectionId = 'incoming-id';
    await element.updateComplete;
    
    // Check that incoming connection dialog is shown
    const incomingDialog = element.shadowRoot!.querySelector('.incoming-connection-dialog');
    expect(incomingDialog).to.exist;
    
    // Get the input field and set a name
    const nameInput = incomingDialog!.querySelector('input') as HTMLInputElement;
    expect(nameInput).to.exist;
    
    nameInput.value = 'Friend Who Invited Me';
    nameInput.dispatchEvent(new Event('input'));
    await element.updateComplete;
    
    // Get the form and submit it
    const form = incomingDialog!.querySelector('form');
    expect(form).to.exist;
    
    // Create a spy for the registerIncomingConnection method
    let registerCalled = false;
    let registeredId = '';
    let registeredName = '';
    
    const originalRegister = mockService.registerIncomingConnection;
    mockService.registerIncomingConnection = (id: string, name: string) => {
      registerCalled = true;
      registeredId = id;
      registeredName = name;
      return originalRegister.call(mockService, id, name);
    };
    
    // Submit the form
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check that registerIncomingConnection was called with the correct parameters
    expect(registerCalled).to.be.true;
    expect(registeredId).to.equal('incoming-id');
    expect(registeredName).to.equal('Friend Who Invited Me');
    
    // Check that the dialog is hidden
    const incomingDialogAfterSubmit = element.shadowRoot!.querySelector('.incoming-connection-dialog');
    expect(incomingDialogAfterSubmit).to.not.exist;
    
    // Check that the connections list tab is active
    const connectionsListTab = element.shadowRoot!.querySelector('.tab-button[data-tab="connections-list"]');
    expect(connectionsListTab!.classList.contains('active')).to.be.true;
  });
});