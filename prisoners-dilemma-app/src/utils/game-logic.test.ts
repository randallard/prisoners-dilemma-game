import { describe, it, expect } from 'vitest';
import { calculateScore, PlayerChoice } from './game-logic';

describe('Game Logic', () => {
  it('calculates correct score when both cooperate', () => {
    const playerChoice: PlayerChoice = 'cooperate';
    const opponentChoice: PlayerChoice = 'cooperate';
    expect(calculateScore(playerChoice, opponentChoice)).toBe(3);
  });
  
  it('calculates correct score when player cooperates and opponent defects', () => {
    const playerChoice: PlayerChoice = 'cooperate';
    const opponentChoice: PlayerChoice = 'defect';
    expect(calculateScore(playerChoice, opponentChoice)).toBe(0);
  });
  
  it('calculates correct score when player defects and opponent cooperates', () => {
    const playerChoice: PlayerChoice = 'defect';
    const opponentChoice: PlayerChoice = 'cooperate';
    expect(calculateScore(playerChoice, opponentChoice)).toBe(5);
  });
  
  it('calculates correct score when both defect', () => {
    const playerChoice: PlayerChoice = 'defect';
    const opponentChoice: PlayerChoice = 'defect';
    expect(calculateScore(playerChoice, opponentChoice)).toBe(1);
  });
});