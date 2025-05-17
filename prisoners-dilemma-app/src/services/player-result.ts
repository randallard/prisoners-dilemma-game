/**
 * Player error types
 */
export enum PlayerErrorType {
  INVALID_ID = 'invalid_id',
  INVALID_NAME = 'invalid_name',
  STORAGE_ERROR = 'storage_error',
  PLAYER_NOT_FOUND = 'player_not_found',
  DATA_CORRUPTION = 'data_corruption'
}

/**
 * Player error with type and message
 */
export class PlayerError extends Error {
  constructor(public type: PlayerErrorType, message: string) {
    super(message);
    this.name = 'PlayerError';
  }
}