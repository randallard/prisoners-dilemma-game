import { html, fixture, expect, oneEvent } from '@open-wc/testing';
import { PlayerForm } from '../../src/components/player-registration/player-form';

// Using Vitest for the test framework
import { describe, it } from 'vitest';

describe('PlayerForm', () => {
  it('renders with the correct structure', async () => {
    const el = await fixture<PlayerForm>(html`<player-form></player-form>`);
    
    const form = el.shadowRoot!.querySelector('form');
    const input = el.shadowRoot!.querySelector('input');
    const button = el.shadowRoot!.querySelector('button');
    
    expect(form).to.exist;
    expect(input).to.exist;
    expect(input!.placeholder).to.equal('Enter your name');
    expect(button).to.exist;
    expect(button!.textContent).to.equal('Register');
  });
  
  it('dispatches a register event when the form is submitted', async () => {
    const el = await fixture<PlayerForm>(html`<player-form></player-form>`);
    
    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'Test Player';
    input.dispatchEvent(new Event('input'));
    
    setTimeout(() => {
      const form = el.shadowRoot!.querySelector('form')!;
      form.dispatchEvent(new Event('submit'));
    }, 0);
    
    const { detail } = await oneEvent(el, 'register');
    expect(detail.name).to.equal('Test Player');
  });
});