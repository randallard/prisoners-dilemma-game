import { html, fixture, expect, oneEvent, waitUntil } from '@open-wc/testing';
import { PlayerForm } from '../../src/components/player-registration/player-form';

// Make sure the component definition is registered
import '../../src/components/player-registration/player-form';

describe('PlayerForm', () => {
  let element: PlayerForm;

  beforeEach(async () => {
    // Create a fresh component instance before each test
    element = await fixture<PlayerForm>(html`<player-form></player-form>`);
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Double-check that shadowRoot exists
    if (!element.shadowRoot) {
      throw new Error('Shadow root not found - component may not be using open shadow DOM');
    }
  });

// Updated test in player-form.test.ts
it('renders with the correct structure and instructions', async () => {
  const form = element.shadowRoot!.querySelector('form');
  const input = element.shadowRoot!.querySelector('input');
  const button = element.shadowRoot!.querySelector('button');
  const instructions = element.shadowRoot!.querySelector('.instructions');
  
  expect(form, 'Form element should exist').to.exist;
  expect(input, 'Input element should exist').to.exist;
  expect(input!.placeholder, 'Input placeholder should be "Enter your name"').to.equal('Enter your name');
  expect(button, 'Button element should exist').to.exist;
  expect(button!.textContent?.trim(), 'Button text should be "Register"').to.equal('Register');
  expect(instructions, 'Instructions element should exist').to.exist;
  expect(instructions!.textContent?.trim(), 'Instructions should match expected text').to.equal('Just enter your name to get started!');
});

  it('dispatches a register event when the form is submitted', async () => {
    // Set the player name
    element.playerName = 'Test Player';
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Create a promise that will resolve when the register event is fired
    const eventPromise = oneEvent(element, 'register');
    
    // Get the form element and submit it
    const form = element.shadowRoot!.querySelector('form');
    expect(form, 'Form element should exist').to.exist;
    form!.dispatchEvent(new Event('submit'));
    
    // Wait for the register event
    const { detail } = await eventPromise;
    expect(detail.name, 'Event detail should contain the player name').to.equal('Test Player');
  });
  
  it('updates playerName property when input changes', async () => {
    const input = element.shadowRoot!.querySelector('input');
    expect(input, 'Input element should exist').to.exist;
    
    // Set the input value and trigger the input event
    input!.value = 'Test Player';
    input!.dispatchEvent(new Event('input'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    expect(element.playerName, 'playerName property should be updated').to.equal('Test Player');
  });

  it('submits the form when Enter key is pressed in the input field', async () => {
    // Set the player name
    const input = element.shadowRoot!.querySelector('input');
    expect(input, 'Input element should exist').to.exist;
    
    // Set the input value and trigger the input event
    input!.value = 'Test Player';
    input!.dispatchEvent(new Event('input'));
    
    // Wait for Lit's update cycle to complete
    await element.updateComplete;
    
    // Create a promise that will resolve when the register event is fired
    const eventPromise = oneEvent(element, 'register');
    
    // Simulate pressing the Enter key in the input field
    const enterKeyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true,
      cancelable: true
    });
    input!.dispatchEvent(enterKeyEvent);
    
    // Wait for the register event
    const { detail } = await eventPromise;
    expect(detail.name, 'Event detail should contain the player name').to.equal('Test Player');
  });
});