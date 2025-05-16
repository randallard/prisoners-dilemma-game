import { ConnectionStatus } from './connection-status';

/**
 * Interface representing connection data between players
 */
export interface ConnectionData {
  /** Unique identifier for the connection */
  id: string;
  
  /** Display name for the connection (user customizable) */
  name: string;
  
  /** ID of the player who created the connection */
  playerID: string;
  
  /** Current status of the connection */
  status: ConnectionStatus;
  
  /** When the connection was created */
  createdAt: Date;
  
  /** When the connection was last updated (if applicable) */
  lastUpdated?: Date; // Added optional lastUpdated property
  
  /** Server URL for the connection (if applicable) */
  serverUrl?: string; // Added optional serverUrl property
  
  /** ID of the player who joined the connection (if any) */
  connectedPlayerID?: string; // Added optional connectedPlayerID property
}