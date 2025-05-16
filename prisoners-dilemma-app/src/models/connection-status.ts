/**
 * Enum representing the possible states of a connection
 */
export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISCONNECTED = 'DISCONNECTED',
  EXPIRED = 'EXPIRED' // Added EXPIRED status to match the Rust model
}