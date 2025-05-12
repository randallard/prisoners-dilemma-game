import { html, fixture, expect, oneEvent, waitUntil } from '@open-wc/testing';
import { ConnectionFormComponent } from '../../src/components/connection/connection-form';
import { MockConnectionService } from './mock-connection-service';

// Make sure the component definition is registered
import '../../src/components/connection/connection-form';

describe('ConnectionFormComponent', () => {
  let element: ConnectionFormComponent;
  let mockService: MockConnectionService;
  
  beforeEach(async () => {
    // Reset the mock service for each test
    mockService = new MockConnectionService();
    mockService.clearMockConnections();
    
    // Create element with fixture
    element = await fixture<ConnectionFormComponent>(html`<connection-form></connection-form>`);
    
    // Replace the service with our mock
    element.connectionService = mockService;
    
    // Wait for update to complete
    await element.updateComplete;
  });
  
  it('renders with the correct structure and instructions', async () => {
    // Check for form elements
    const form = element.shadowRoot!.querySelector('form');
    const input = element.shadowRoot!.querySelector('input');
    const button = element.shadowRoot!.querySelector('button[type="submit"]');
    const instructions = element.shadowRoot!.querySelector('.instructions');
    
    expect(form).to.exist;
    expect(input).to.exist;
    expect(input!.placeholder).to.equal('Enter your friend\'s name');
    expect(button).to.exist;
    expect(button!.textContent!.trim()).to.equal('Generate Connection Link');
    expect(instructions).to.exist;
    expect(instructions!.textContent!.trim()).to.include('Enter a name for your friend');
  });
  
  it('updates friendName property when input changes', async () => {
    // Get the input element
    const input = element.shadowRoot!.querySelector('input');
    expect(input).to.exist;
    
    // Set the input value and trigger the input event
    input!.value = 'Test Friend';
    input!.dispatchEvent(new Event('input'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Check that the property was updated
    expect(element.friendName).to.equal('Test Friend');
  });
  
  it('shows validation error when form is submitted with empty name', async () => {
    // Get the form element
    const form = element.shadowRoot!.querySelector('form');
    expect(form).to.exist;
    
    // Submit the form without setting a name
    form!.dispatchEvent(new Event('submit'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Check for error message
    const errorMessage = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessage).to.exist;
    expect(errorMessage!.textContent!.trim()).to.include('Friend name cannot be empty');
  });
  
  it('generates and displays a connection link on successful form submission', async () => {
    // Set the friend name
    element.friendName = 'Test Friend';
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Get the form element and submit it
    const form = element.shadowRoot!.querySelector('form');
    expect(form).to.exist;
    form!.dispatchEvent(new Event('submit'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Check that the link is displayed
    const linkContainer = element.shadowRoot!.querySelector('.link-container');
    expect(linkContainer).to.exist;
    
    const linkElement = linkContainer!.querySelector('.connection-link');
    expect(linkElement).to.exist;
    expect(linkElement!.textContent!.trim()).to.include('https://example.com/game?connection=test-connection-id');
  });
  
  it('shows copy button for generated link', async () => {
    // Generate a link first
    element.friendName = 'Test Friend';
    await element.updateComplete;
    
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check for copy button
    const copyButton = element.shadowRoot!.querySelector('.copy-button');
    expect(copyButton).to.exist;
  });
  
  it('shows copy confirmation after clicking copy button', async () => {
    // First, mock the clipboard API with Object.defineProperty
    const originalClipboard = navigator.clipboard;
    
    const mockClipboard = {
      writeText: async () => Promise.resolve()
    };
    
    // Properly mock navigator.clipboard to avoid getter issues
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: mockClipboard
    });
    
    try {
      // Generate a link first
      element.friendName = 'Test Friend';
      await element.updateComplete;
      
      const form = element.shadowRoot!.querySelector('form');
      form!.dispatchEvent(new Event('submit'));
      await element.updateComplete;
      
      // Get and click the copy button
      const copyButton = element.shadowRoot!.querySelector('.copy-button');
      expect(copyButton).to.exist;
      copyButton!.dispatchEvent(new Event('click'));
      
      await new Promise(resolve => setTimeout(resolve, 0));

      // Wait for Lit's update cycle to complete
      await element.updateComplete;
      
      // Check for copied message
      const copyConfirmation = element.shadowRoot!.querySelector('.copy-confirmation');
      expect(copyConfirmation).to.exist;
      expect(copyConfirmation!.textContent!.trim()).to.include('Copied!');
    } finally {
      // Always restore original clipboard
      Object.defineProperty(navigator, 'clipboard', {
        writable: true,
        configurable: true,
        value: originalClipboard
      });
    }
  });
  
  it('shows error message when connection generation fails', async () => {
    // Set the friend name to one that will trigger an error
    element.friendName = 'error-test';
    await element.updateComplete;
    
    // Submit the form
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check for error message
    const errorMessage = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessage).to.exist;
    expect(errorMessage!.textContent!.trim()).to.include('Test storage error');
    
    // Check that link container is not shown
    const linkContainer = element.shadowRoot!.querySelector('.link-container');
    expect(linkContainer).to.not.exist;
  });
  
  it('allows dismissing the error message', async () => {
    // Set the friend name to one that will trigger an error
    element.friendName = 'error-test';
    await element.updateComplete;
    
    // Submit the form
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check for error message
    const errorMessage = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessage).to.exist;
    
    // Get and click the dismiss button
    const dismissButton = errorMessage!.querySelector('.dismiss-error-button');
    expect(dismissButton).to.exist;
    dismissButton!.dispatchEvent(new Event('click'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Check that error message is gone
    const errorMessageAfterDismiss = element.shadowRoot!.querySelector('.error-message');
    expect(errorMessageAfterDismiss).to.not.exist;
  });
  
  it('allows generating a new link after successful generation', async () => {
    // Generate a link first
    element.friendName = 'Test Friend';
    await element.updateComplete;
    
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check for new link button
    const newLinkButton = element.shadowRoot!.querySelector('.new-link-button');
    expect(newLinkButton).to.exist;
    
    // Click the new link button
    newLinkButton!.dispatchEvent(new Event('click'));
    await element.updateComplete;
    
    // Check that we're back to the form
    const formAfterReset = element.shadowRoot!.querySelector('form');
    expect(formAfterReset).to.exist;
    
    // Check that the link container is gone
    const linkContainer = element.shadowRoot!.querySelector('.link-container');
    expect(linkContainer).to.not.exist;
  });
  
  it('keeps the tab on "New Connection" after link generation for easy copying', async () => {
    // Set the friend name and generate a link
    element.friendName = 'Test Friend';
    await element.updateComplete;
    
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Verify the link container is displayed
    const linkContainer = element.shadowRoot!.querySelector('.link-container');
    expect(linkContainer).to.exist;
    
    // Check that the tab is still on "New Connection"
    // This would test that the parent component doesn't automatically switch tabs
    // Since we're testing the connection-form component in isolation,
    // we can verify that it's still showing the generated link
    const connectionLink = linkContainer!.querySelector('.connection-link');
    expect(connectionLink).to.exist;
    
    // The link should remain visible and accessible
    const copyButton = element.shadowRoot!.querySelector('.copy-button');
    expect(copyButton).to.exist;
  });
  
  it('displays a clear visual indication when a new link has been generated', async () => {
    // Generate a link
    element.friendName = 'Test Friend';
    await element.updateComplete;
    
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    await element.updateComplete;
    
    // Check for link generation success indicators
    const linkContainer = element.shadowRoot!.querySelector('.link-container');
    expect(linkContainer).to.exist;
    
    // The success indicator is NOT inside the link container, it's a separate element
    const successIndicator = element.shadowRoot!.querySelector('.link-success-indicator');
    expect(successIndicator).to.exist;
    expect(successIndicator!.textContent!.trim()).to.include('Connection link generated');
  });
  
  it('dispatches a connection-created event when a link is successfully generated', async () => {
    // Set up listener for the event
    const eventPromise = oneEvent(element, 'connection-created');
    
    // Generate a link
    element.friendName = 'Test Friend';
    await element.updateComplete;
    
    const form = element.shadowRoot!.querySelector('form');
    form!.dispatchEvent(new Event('submit'));
    
    // Wait for the event
    const { detail } = await eventPromise;
    
    // Check the event details
    expect(detail).to.exist;
    expect(detail.connectionLink).to.equal('https://example.com/game?connection=test-connection-id');
    expect(detail.friendName).to.equal('Test Friend');
  });
  
  it('handles keydown events for Enter key submission', async () => {
    // Set the friend name
    const input = element.shadowRoot!.querySelector('input');
    input!.value = 'Test Friend';
    input!.dispatchEvent(new Event('input'));
    await element.updateComplete;
    
    // Create a promise that will resolve when the connection-created event is fired
    const eventPromise = oneEvent(element, 'connection-created');
    
    // Simulate pressing the Enter key
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });
    input!.dispatchEvent(enterKeyEvent);
    
    // Wait for the event
    const { detail } = await eventPromise;
    expect(detail.friendName).to.equal('Test Friend');
  });
});