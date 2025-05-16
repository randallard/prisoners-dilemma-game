import { ConnectionData } from '../../models/connection-data';
import { ConnectionStatus } from '../../models/connection-status';
import { ConnectionApiData } from './connection-api-service';

/**
 * Utility class for mapping between local and API connection data models
 */
export class ConnectionDataMapper {
  /**
   * Converts a local ConnectionData to API-compatible ConnectionApiData
   * 
   * @param localData Local connection data
   * @returns API-compatible connection data
   */
  static toApiModel(localData: ConnectionData): ConnectionApiData {
    return {
      id: localData.id,
      name: localData.name, // Added missing 'name' property
      playerID: localData.playerID,
      connectedPlayerID: localData.connectedPlayerID,
      status: localData.status,
      createdAt: localData.createdAt.toISOString(),
      updatedAt: localData.lastUpdated?.toISOString() // Fixed 'updatedAt' to 'lastUpdated'
    };
  }

  /**
   * Converts API ConnectionApiData to local ConnectionData
   * 
   * @param apiData API connection data
   * @param name Optional custom name for the connection (if not provided, a default is generated)
   * @returns Local connection data
   */
  static fromApiModel(apiData: ConnectionApiData, name?: string): ConnectionData {
    // Generate a default name if not provided
    const defaultName = name || ConnectionDataMapper.generateDefaultName(apiData);

    return {
      id: apiData.id,
      name: defaultName,
      playerID: apiData.playerID,
      connectedPlayerID: apiData.connectedPlayerID,
      status: apiData.status as ConnectionStatus, // Cast status to ConnectionStatus
      createdAt: new Date(apiData.createdAt),
      lastUpdated: apiData.updatedAt ? new Date(apiData.updatedAt) : undefined
    };
  }

  /**
   * Updates a local ConnectionData with data from the API while preserving the custom name
   * 
   * @param localData Existing local connection data
   * @param apiData New API connection data
   * @returns Updated local connection data
   */
  static updateLocalFromApi(localData: ConnectionData, apiData: ConnectionApiData): ConnectionData {
    return {
      ...ConnectionDataMapper.fromApiModel(apiData),
      name: localData.name // Preserve the custom name from local data
    };
  }

  /**
   * Generates a default name for a connection based on API data
   * 
   * @param apiData API connection data
   * @returns Generated default name
   */
  private static generateDefaultName(apiData: ConnectionApiData): string {
    if (apiData.connectedPlayerID) {
      return `Connection with ${apiData.connectedPlayerID}`;
    } else if (apiData.status === ConnectionStatus.PENDING) {
      return 'Pending Connection';
    } else if (apiData.status === ConnectionStatus.EXPIRED) {
      return 'Expired Connection';
    } else {
      return `Connection ${apiData.id}`;
    }
  }
}