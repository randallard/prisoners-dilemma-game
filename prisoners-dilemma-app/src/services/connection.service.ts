// connection.service.ts
export enum ConnectionStatus {
    PENDING = 'pending',
    ACTIVE = 'active'
  }
  
  export interface ConnectionData {
    id: string;
    name: string;
    status: ConnectionStatus;
    initiatedByMe: boolean;
    createdAt: number;
  }
  
  export class ConnectionService {
    private readonly STORAGE_KEY = 'prisonersDilemma_connections';
    
    /**
     * Generates a connection link for sharing with a friend
     * @param friendName The name of the friend to connect with
     * @returns The connection link URL as a string
     * @throws Error if localStorage is not available or friendName is empty
     */
    public generateConnectionLink(friendName: string): string {
      if (!friendName || friendName.trim() === '') {
        throw new Error('Friend name cannot be empty');
      }
      
      try {
        // Generate a UUID for the connection
        const connectionId = this.generateUUID();
        
        // Create the connection data
        const connectionData: ConnectionData = {
          id: connectionId,
          name: friendName.trim(),
          status: ConnectionStatus.PENDING,
          initiatedByMe: true,
          createdAt: Date.now()
        };
        
        // Store the connection data in localStorage
        this.saveConnection(connectionData);
        
        // Generate a URL with the connection ID
        const baseUrl = window.location.origin + window.location.pathname;
        const connectionLink = `${baseUrl}?connection=${connectionId}`;
        
        return connectionLink;
      } catch (error) {
        console.error('Failed to generate connection link:', error);
        throw new Error('Failed to generate connection link. Local storage may not be available.');
      }
    }
    
    /**
     * Retrieves all connections from localStorage
     * @returns Array of all connection data objects
     * @throws Error if localStorage is not available or data is corrupted
     */
    public getConnections(): ConnectionData[] {
      try {
        return this.loadConnections();
      } catch (error) {
        console.error('Failed to retrieve connections:', error);
        throw new Error('Failed to retrieve connections. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Retrieves a specific connection by its ID
     * @param connectionId The ID of the connection to find
     * @returns The connection data object if found, or null if not found
     * @throws Error if localStorage is not available or data is corrupted
     */
    public getConnectionById(connectionId: string): ConnectionData | null {
      if (!connectionId) {
        throw new Error('Connection ID cannot be empty');
      }
      
      try {
        const connections = this.loadConnections();
        const connection = connections.find(conn => conn.id === connectionId);
        return connection || null;
      } catch (error) {
        console.error(`Failed to retrieve connection with ID ${connectionId}:`, error);
        throw new Error('Failed to retrieve connection. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Retrieves connections filtered by status
     * @param status The status to filter connections by (PENDING or ACTIVE)
     * @returns Array of connection data objects matching the status
     * @throws Error if localStorage is not available or data is corrupted
     */
    public getConnectionsByStatus(status: ConnectionStatus): ConnectionData[] {
      if (!Object.values(ConnectionStatus).includes(status)) {
        throw new Error('Invalid connection status');
      }
      
      try {
        const connections = this.loadConnections();
        return connections.filter(conn => conn.status === status);
      } catch (error) {
        console.error(`Failed to retrieve connections with status ${status}:`, error);
        throw new Error('Failed to retrieve connections. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Accepts a connection request, changing its status to ACTIVE
     * @param connectionId The ID of the connection to accept
     * @returns True if connection was successfully accepted, false if connection not found
     * @throws Error if localStorage is not available, data is corrupted, or connectionId is empty
     */
    public acceptConnection(connectionId: string): boolean {
      if (!connectionId) {
        throw new Error('Connection ID cannot be empty');
      }
      
      try {
        const connections = this.loadConnections();
        const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
        
        if (connectionIndex === -1) {
          return false;
        }
        
        connections[connectionIndex].status = ConnectionStatus.ACTIVE;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
        return true;
      } catch (error) {
        console.error(`Failed to accept connection with ID ${connectionId}:`, error);
        throw new Error('Failed to accept connection. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Registers an incoming connection request
     * @param connectionId The ID of the incoming connection
     * @param externalFriendName The name of the friend who initiated the connection
     * @returns True if connection was successfully registered
     * @throws Error if localStorage is not available, data is corrupted, or parameters are invalid
     */
    public registerIncomingConnection(connectionId: string, externalFriendName: string): boolean {
      if (!connectionId) {
        throw new Error('Connection ID cannot be empty');
      }
      
      if (!externalFriendName || externalFriendName.trim() === '') {
        throw new Error('Friend name cannot be empty');
      }
      
      // Check if connection already exists - this check needs to be outside the try/catch
      // so that we can throw the specific error message the test is expecting
      const existingConnection = this.getConnectionById(connectionId);
      if (existingConnection) {
        throw new Error('Connection with this ID already exists');
      }
      
      try {
        const connectionData: ConnectionData = {
          id: connectionId,
          name: externalFriendName.trim(),
          status: ConnectionStatus.PENDING,
          initiatedByMe: false,
          createdAt: Date.now()
        };
        
        this.saveConnection(connectionData);
        return true;
      } catch (error) {
        console.error('Failed to register incoming connection:', error);
        throw new Error('Failed to register incoming connection. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Deletes a connection by its ID
     * @param connectionId The ID of the connection to delete
     * @returns True if connection was successfully deleted, false if connection not found
     * @throws Error if localStorage is not available, data is corrupted, or connectionId is empty
     */
    public deleteConnection(connectionId: string): boolean {
      if (!connectionId) {
        throw new Error('Connection ID cannot be empty');
      }
      
      try {
        const connections = this.loadConnections();
        const initialLength = connections.length;
        const filteredConnections = connections.filter(conn => conn.id !== connectionId);
        
        if (filteredConnections.length === initialLength) {
          return false; // No connection was deleted
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConnections));
        return true;
      } catch (error) {
        console.error(`Failed to delete connection with ID ${connectionId}:`, error);
        throw new Error('Failed to delete connection. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Generates a UUID v4
     * @returns A UUID string
     */
    protected generateUUID(): string {
      // Implementation of RFC4122 version 4 UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    /**
     * Helper method to save a connection to localStorage
     * @param connection The connection data to save
     * @throws Error if localStorage is not available
     */
    private saveConnection(connection: ConnectionData): void {
      try {
        const connections = this.loadConnections();
        
        // Validate connection data
        if (!connection.id || !connection.name) {
          throw new Error('Invalid connection data');
        }
        
        connections.push(connection);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
      } catch (error) {
        console.error('Failed to save connection:', error);
        throw new Error('Failed to save connection. Local storage may not be available.');
      }
    }
    
    /**
     * Helper method to load connections from localStorage
     * @returns Array of connection data objects
     * @throws Error if localStorage is not available or data is corrupted
     */
    private loadConnections(): ConnectionData[] {
      try {
        const storedData = localStorage.getItem(this.STORAGE_KEY);
        if (!storedData) {
          return [];
        }
        
        const parsedData = JSON.parse(storedData);
        
        // Validate that the parsed data is an array
        if (!Array.isArray(parsedData)) {
          console.warn('Stored connection data is not an array, returning empty array');
          return [];
        }
        
        // Validate each connection object
        return parsedData.filter(item => this.isValidConnectionData(item));
      } catch (error) {
        console.error('Failed to load connections:', error);
        throw new Error('Failed to load connections. Local storage may not be available or data may be corrupted.');
      }
    }
    
    /**
     * Validates that an object conforms to the ConnectionData interface
     * @param item The object to validate
     * @returns True if the object is valid ConnectionData
     */
    private isValidConnectionData(item: any): boolean {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Object.values(ConnectionStatus).includes(item.status) &&
        typeof item.initiatedByMe === 'boolean' &&
        typeof item.createdAt === 'number'
      );
    }
  }