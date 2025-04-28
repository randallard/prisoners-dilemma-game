export type PlayerChoice = 'cooperate' | 'defect';

export const calculateScore = (playerChoice: PlayerChoice, opponentChoice: PlayerChoice): number => {
  if (playerChoice === 'cooperate' && opponentChoice === 'cooperate') {
    return 3; // Both cooperate
  } else if (playerChoice === 'cooperate' && opponentChoice === 'defect') {
    return 0; // Player cooperates, opponent defects
  } else if (playerChoice === 'defect' && opponentChoice === 'cooperate') {
    return 5; // Player defects, opponent cooperates
  } else {
    return 1; // Both defect
  }
};