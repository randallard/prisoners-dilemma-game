import { html, fixture, expect, oneEvent, waitUntil } from '@open-wc/testing';
import { ConnectionListComponent } from '../../src/components/connection/connection-list';
import { ConnectionStatus, ConnectionData } from '../../src/services/connection.service';
import { Result } from '../../src/services/connection-result';
import { ConnectionError, ConnectionErrorType } from '../../src/services/connection-result';
import { MockConnectionService } from './mock-connection-service';

// Make sure the component definition is registered
import '../../src/components/connection/connection-list';

describe('ConnectionListComponent', () => {
  let element: ConnectionListComponent;
  let mockService: MockConnectionService;
  
  beforeEach(async () => {
    // Reset the mock service for each test
    mockService = new MockConnectionService();
    
    // Create element with fixture
    element = await fixture<ConnectionListComponent>(html`<connection-list></connection-list>`);
    
    // Replace the service with our mock
    element.connectionService = mockService;
    
    // Wait for update to complete
    await element.updateComplete;
  });
  
  it('shows empty state when no connections exist', async () => {
    // Ensure no connections exist
    mockService.clearMockConnections();
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Check that empty state message is displayed
    const emptyState = element.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).to.exist;
    expect(emptyState!.textContent!.trim()).to.include('No connections found');
  });
  
  it('shows loading state while loading connections', async () => {
    // Set component to loading state manually for testing
    element.loading = true;
    await element.updateComplete;
    
    // Check that loading message is displayed
    const loadingIndicator = element.shadowRoot!.querySelector('.loading-indicator');
    expect(loadingIndicator).to.exist;
    
    // Check that connections list is not displayed during loading
    const connectionsList = element.shadowRoot!.querySelector('.connections-list');
    expect(connectionsList).to.not.exist;
  });
  
  it('shows connections when connections exist', async () => {
    // Set up mock data
    const mockData: ConnectionData[] = [
      {
        id: 'connection-1',
        name: 'Friend 1',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000 // 1 second ago
      },
      {
        id: 'connection-2',
        name: 'Friend 2',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: false,
        createdAt: Date.now() - 2000 // 2 seconds ago
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Check that connections list exists
    const connectionsList = element.shadowRoot!.querySelector('.connections-list');
    expect(connectionsList).to.exist;
    
    // Check that the correct number of connection items are displayed
    const connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    expect(connectionItems.length).to.equal(2);
    
    // Check that connection details are correctly displayed
    const firstConnectionName = connectionItems[0].querySelector('.connection-name');
    expect(firstConnectionName!.textContent!.trim()).to.equal('Friend 1');
    
    const secondConnectionName = connectionItems[1].querySelector('.connection-name');
    expect(secondConnectionName!.textContent!.trim()).to.equal('Friend 2');
  });
  
  it('displays appropriate status indicators for different connection states', async () => {
    // Set up mock data with different statuses
    const mockData: ConnectionData[] = [
      {
        id: 'pending-connection',
        name: 'Pending Friend',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      },
      {
        id: 'active-connection',
        name: 'Active Friend',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: false,
        createdAt: Date.now() - 2000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Get all connection items
    const connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    
    // Check status indicators
    const pendingStatusIndicator = connectionItems[0].querySelector('.status-indicator');
    expect(pendingStatusIndicator!.classList.contains('pending')).to.be.true;
    expect(pendingStatusIndicator!.textContent!.trim()).to.include('Pending');
    
    const activeStatusIndicator = connectionItems[1].querySelector('.status-indicator');
    expect(activeStatusIndicator!.classList.contains('active')).to.be.true;
    expect(activeStatusIndicator!.textContent!.trim()).to.include('Active');
  });
  
  it('shows different actions based on connection status and who initiated', async () => {
    // Set up mock data with different scenarios
    const mockData: ConnectionData[] = [
      { 
        id: 'pending-by-me',
        name: 'Friend (I invited)',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      },
      {
        id: 'pending-by-them',
        name: 'Friend (They invited)',
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now() - 2000
      },
      {
        id: 'active-connection',
        name: 'Active Friend',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: true,
        createdAt: Date.now() - 3000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Get all connection items
    const connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    
    // 1. Pending connection initiated by me should have cancel/delete option
    const pendingByMeActions = connectionItems[0].querySelector('.connection-actions');
    const pendingByMeDeleteButton = pendingByMeActions!.querySelector('.delete-button');
    expect(pendingByMeDeleteButton).to.exist;
    expect(pendingByMeActions!.querySelector('.accept-button')).to.not.exist;
    
    // 2. Pending connection initiated by them should have accept option
    const pendingByThemActions = connectionItems[1].querySelector('.connection-actions');
    const pendingByThemAcceptButton = pendingByThemActions!.querySelector('.accept-button');
    expect(pendingByThemAcceptButton).to.exist;
    
    // 3. Active connection should have play option
    const activeConnectionActions = connectionItems[2].querySelector('.connection-actions');
    const activeConnectionPlayButton = activeConnectionActions!.querySelector('.play-button');
    expect(activeConnectionPlayButton).to.exist;
  });
  
  it('shows view/copy link option for pending connections initiated by me', async () => {
    // Set up mock data with a pending connection initiated by me
    const mockData: ConnectionData[] = [
      { 
        id: 'pending-by-me',
        name: 'Friend I invited',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Get the connection item
    const connectionItem = element.shadowRoot!.querySelector('.connection-item');
    expect(connectionItem).to.exist;
    
    // Check for view/copy link option
    const viewLinkButton = connectionItem!.querySelector('.view-link-button');
    expect(viewLinkButton).to.exist;
    expect(viewLinkButton!.textContent!.trim()).to.include('View Link');
    
    // Click the view link button
    viewLinkButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that the link is displayed
    const linkDisplay = connectionItem!.querySelector('.connection-link-display');
    expect(linkDisplay).to.exist;
    
    // Check for copy link button
    const copyLinkButton = linkDisplay!.querySelector('.copy-link-button');
    expect(copyLinkButton).to.exist;
  });
  
  it('indicates that pending connection links can be reshared', async () => {
    // Set up mock data with a pending connection initiated by me
    const mockData: ConnectionData[] = [
      { 
        id: 'pending-by-me',
        name: 'Friend I invited',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Get the connection item
    const connectionItem = element.shadowRoot!.querySelector('.connection-item');
    expect(connectionItem).to.exist;
    
    // Click the view link button
    const viewLinkButton = connectionItem!.querySelector('.view-link-button');
    viewLinkButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check for reshare indication
    const linkDisplay = connectionItem!.querySelector('.connection-link-display');
    const reshareMessage = linkDisplay!.querySelector('.reshare-message');
    expect(reshareMessage).to.exist;
    expect(reshareMessage!.textContent!.trim()).to.include('can be reshared');
  });
  
  it('allows copying connection link for pending connections', async () => {
    // Mock the clipboard API
    const originalClipboard = navigator.clipboard;
    
    const mockClipboard = {
      writeText: async () => Promise.resolve()
    };
    
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: mockClipboard
    });
    
    try {
      // Set up mock data
      const mockData: ConnectionData[] = [
        { 
          id: 'pending-connection-id',
          name: 'Friend to invite',
          status: ConnectionStatus.PENDING,
          initiatedByMe: true,
          createdAt: Date.now() - 1000
        }
      ];
      
      mockService.setMockConnections(mockData);
      
      // Set up the mock connection link
      mockService.setMockConnectionLink('pending-connection-id', 'https://example.com/game?connection=pending-connection-id');
      
      // Force refresh
      element.refreshConnections();
      await element.updateComplete;
      
      // Get the connection item and click view link
      const connectionItem = element.shadowRoot!.querySelector('.connection-item');
      const viewLinkButton = connectionItem!.querySelector('.view-link-button');
      viewLinkButton!.dispatchEvent(new Event('click'));
      await element.updateComplete;
      
      // Click the copy link button
      const copyLinkButton = connectionItem!.querySelector('.copy-link-button');
      expect(copyLinkButton).to.exist;
      copyLinkButton!.dispatchEvent(new Event('click'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Wait for update
      await element.updateComplete;
      
      // Check for copy confirmation
      const copyConfirmation = connectionItem!.querySelector('.copy-confirmation');
      expect(copyConfirmation).to.exist;
      expect(copyConfirmation!.textContent!.trim()).to.include('Copied');
    } finally {
      // Restore original clipboard
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        configurable: true,
        value: originalClipboard
      });
    }
  });
  
  it('allows filtering connections by status', async () => {
    // Set up mock data with different statuses
    const mockData: ConnectionData[] = [
      {
        id: 'pending-connection-1',
        name: 'Pending Friend 1',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      },
      {
        id: 'pending-connection-2',
        name: 'Pending Friend 2',
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now() - 2000
      },
      {
        id: 'active-connection',
        name: 'Active Friend',
        status: ConnectionStatus.ACTIVE,
        initiatedByMe: true,
        createdAt: Date.now() - 3000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh initially to load all connections
    element.refreshConnections();
    await element.updateComplete;
    
    // Verify all connections are shown initially
    let connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    expect(connectionItems.length).to.equal(3);
    
    // Filter by active status
    const statusFilter = element.shadowRoot!.querySelector('select.status-filter') as HTMLSelectElement;
    expect(statusFilter).to.exist;
    
    // Change filter to show only active connections
    statusFilter.value = ConnectionStatus.ACTIVE;
    statusFilter.dispatchEvent(new Event('change'));
    await element.updateComplete;
    
    // Verify only active connections are shown
    connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    expect(connectionItems.length).to.equal(1);
    const connectionName = connectionItems[0].querySelector('.connection-name');
    expect(connectionName!.textContent!.trim()).to.equal('Active Friend');
    
    // Change filter to show only pending connections
    statusFilter.value = ConnectionStatus.PENDING;
    statusFilter.dispatchEvent(new Event('change'));
    await element.updateComplete;
    
    // Verify only pending connections are shown
    connectionItems = element.shadowRoot!.querySelectorAll('.connection-item');
    expect(connectionItems.length).to.equal(2);
  });
  
  it('handles accepting a connection request', async () => {
    // Set up a pending connection that wasn't initiated by the user
    const pendingConnection: ConnectionData = {
      id: 'pending-connection',
      name: 'Friend Request',
      status: ConnectionStatus.PENDING,
      initiatedByMe: false,
      createdAt: Date.now() - 1000
    };
    
    mockService.setMockConnections([pendingConnection]);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Find and click the accept button
    const acceptButton = element.shadowRoot!.querySelector('.accept-button');
    expect(acceptButton).to.exist;
    
    // Create a promise that will resolve when the refresh-connections event is fired
    const refreshPromise = oneEvent(element, 'refresh-connections');
    
    // Click the accept button
    acceptButton!.dispatchEvent(new Event('click'));
    
    // Wait for the refresh event
    await refreshPromise;
    
    // Get the updated connection from the mock service
    const connectionsResult = mockService.getConnections();
    expect(connectionsResult.isSuccess()).to.be.true;
    const connections = connectionsResult.getValue();
    
    // Verify the connection status was updated
    expect(connections.length).to.equal(1);
    expect(connections[0].id).to.equal('pending-connection');
    expect(connections[0].status).to.equal(ConnectionStatus.ACTIVE);
  });
  
  it('handles deleting a connection', async () => {
    // Set up a connection to delete
    const connectionToDelete: ConnectionData = {
      id: 'connection-to-delete',
      name: 'Friend to Remove',
      status: ConnectionStatus.PENDING,
      initiatedByMe: true,
      createdAt: Date.now() - 1000
    };
    
    mockService.setMockConnections([connectionToDelete]);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Find and click the delete button
    const deleteButton = element.shadowRoot!.querySelector('.delete-button');
    expect(deleteButton).to.exist;
    
    // Create a promise that will resolve when the confirm-delete-connection event is fired
    const confirmDeletePromise = oneEvent(element, 'confirm-delete-connection');
    
    // Click the delete button
    deleteButton!.dispatchEvent(new Event('click'));
    
    // Wait for the confirm event
    const { detail: connectionToConfirmDelete } = await confirmDeletePromise;
    
    // Verify the correct connection ID was included in the event
    expect(connectionToConfirmDelete.connectionId).to.equal('connection-to-delete');
    
    // Create a promise that will resolve when the refresh-connections event is fired
    const refreshPromise = oneEvent(element, 'refresh-connections');
    
    // Confirm deletion by calling the component method directly (simulating confirmation dialog)
    element.confirmDelete('connection-to-delete');
    
    // Wait for the refresh event
    await refreshPromise;
    
    // Get the updated connections from the mock service
    const connectionsResult = mockService.getConnections();
    expect(connectionsResult.isSuccess()).to.be.true;
    const connections = connectionsResult.getValue();
    
    // Verify the connection was deleted
    expect(connections.length).to.equal(0);
  });
  
  it('displays appropriate error message when connection operation fails', async () => {
    // Set up mock data
    const mockData: ConnectionData[] = [
      {
        id: 'connection-1',
        name: 'Friend 1',
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now() - 1000
      }
    ];
    
    mockService.setMockConnections(mockData);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Force an error for testing the error message display
    element.showError('Failed to accept connection');
    await element.updateComplete;
    
    // Check that error message is displayed
    const errorMessage = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessage).to.exist;
    expect(errorMessage!.textContent!.trim()).to.include('Failed to accept connection');
    
    // Test that dismiss error button works
    const dismissButton = errorMessage!.querySelector('.dismiss-error-button');
    expect(dismissButton).to.exist;
    
    dismissButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that error message is gone
    const errorMessageAfterDismiss = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessageAfterDismiss).to.not.exist;
  });
  
  it('emits an event when a connection play button is clicked', async () => {
    // Set up an active connection
    const activeConnection: ConnectionData = {
      id: 'active-connection',
      name: 'Play Friend',
      status: ConnectionStatus.ACTIVE,
      initiatedByMe: true,
      createdAt: Date.now() - 1000
    };
    
    mockService.setMockConnections([activeConnection]);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Find and click the play button
    const playButton = element.shadowRoot!.querySelector('.play-button');
    expect(playButton).to.exist;
    
    // Create a promise that will resolve when the play-with-connection event is fired
    const playPromise = oneEvent(element, 'play-with-connection');
    
    // Click the play button
    playButton!.dispatchEvent(new Event('click'));
    
    // Wait for the play event
    const { detail } = await playPromise;
    
    // Verify the correct connection ID was included in the event
    expect(detail.connectionId).to.equal('active-connection');
  });

  it('should toggle connection link display when clicking view/hide link', async () => {
    // Set up mock data with a pending connection initiated by me
    const mockData: ConnectionData[] = [
      { 
        id: 'pending-by-me',
        name: 'Friend I invited',
        status: ConnectionStatus.PENDING,
        initiatedByMe: true,
        createdAt: Date.now() - 1000
      }
    ];
    
    // Set up the mock link
    const mockLink = 'https://example.com/game?connection=pending-by-me';
    mockService.setMockConnections(mockData);
    mockService.setMockConnectionLink('pending-by-me', mockLink);
    
    // Force refresh
    element.refreshConnections();
    await element.updateComplete;
    
    // Get the connection item
    const connectionItem = element.shadowRoot!.querySelector('.connection-item');
    expect(connectionItem).to.exist;
    
    // Check that the link is initially hidden
    let linkDisplay = connectionItem!.querySelector('.connection-link-display');
    expect(linkDisplay).to.not.exist;
    
    // Click the view link button to show the link
    const viewLinkButton = connectionItem!.querySelector('.view-link-button');
    viewLinkButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that the link is now displayed
    linkDisplay = connectionItem!.querySelector('.connection-link-display');
    expect(linkDisplay).to.exist;
    
    // Click the button again to hide the link
    viewLinkButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that the link is hidden again
    linkDisplay = connectionItem!.querySelector('.connection-link-display');
    expect(linkDisplay).to.not.exist;
  });
});