import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface RegisterEventDetail {
  name: string;
}

@customElement('player-form')
export class PlayerForm extends LitElement {
  @property({ type: String }) 
  playerName = '';

  static styles = css`
    .form-container {
      @apply p-4 bg-gray-100 rounded shadow-md;
    }
    
    label {
      @apply block text-gray-700 text-sm font-bold mb-2;
    }
    
    input {
      @apply shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight;
    }
    
    button {
      @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4;
    }
  `;

  handleSubmit(e: Event): void {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent<RegisterEventDetail>('register', {
      detail: { name: this.playerName }
    }));
  }

  handleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.playerName = input.value;
  }

  render() {
    return html`
      <div class="form-container">
        <form @submit="${this.handleSubmit}">
          <div>
            <label for="playerName">Your Name</label>
            <input
              type="text"
              id="playerName"
              .value="${this.playerName}"
              @input="${this.handleInput}"
              placeholder="Enter your name"
              required
            />
          </div>
          <button type="submit">Register</button>
        </form>
      </div>
    `;
  }
}