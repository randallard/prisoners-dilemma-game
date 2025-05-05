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
     */
    public generateConnectionLink(friendName: string): string {
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
    }
    
    /**
     * Retrieves all connections from localStorage
     * @returns Array of all connection data objects
     */
    public getConnections(): ConnectionData[] {
      return this.loadConnections();
    }
    
    /**
     * Retrieves a specific connection by its ID
     * @param connectionId The ID of the connection to find
     * @returns The connection data object if found, or null if not found
     */
    public getConnectionById(connectionId: string): ConnectionData | null {
      const connections = this.loadConnections();
      const connection = connections.find(conn => conn.id === connectionId);
      return connection || null;
    }
    
    /**
     * Retrieves connections filtered by status
     * @param status The status to filter connections by (PENDING or ACTIVE)
     * @returns Array of connection data objects matching the status
     */
    public getConnectionsByStatus(status: ConnectionStatus): ConnectionData[] {
      const connections = this.loadConnections();
      return connections.filter(conn => conn.status === status);
    }
    
    /**
     * Accepts a connection request, changing its status to ACTIVE
     * @param connectionId The ID of the connection to accept
     * @param myName The name of the current player (not needed in this implementation)
     */
    public acceptConnection(connectionId: string): void {
      const connections = this.loadConnections();
      const connectionIndex = connections.findIndex(conn => conn.id === connectionId);
      
      if (connectionIndex !== -1) {
        connections[connectionIndex].status = ConnectionStatus.ACTIVE;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
      }
    }
    
    /**
     * Registers an incoming connection request
     * @param connectionId The ID of the incoming connection
     * @param externalFriendName The name of the friend who initiated the connection
     */
    public registerIncomingConnection(connectionId: string, externalFriendName: string): void {
      const connectionData: ConnectionData = {
        id: connectionId,
        name: externalFriendName.trim(),
        status: ConnectionStatus.PENDING,
        initiatedByMe: false,
        createdAt: Date.now()
      };
      
      this.saveConnection(connectionData);
    }
    
    /**
     * Deletes a connection by its ID
     * @param connectionId The ID of the connection to delete
     */
    public deleteConnection(connectionId: string): void {
      const connections = this.loadConnections();
      const filteredConnections = connections.filter(conn => conn.id !== connectionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConnections));
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
     */
    private saveConnection(connection: ConnectionData): void {
      const connections = this.loadConnections();
      connections.push(connection);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(connections));
    }
    
    /**
     * Helper method to load connections from localStorage
     * @returns Array of connection data objects
     */
    private loadConnections(): ConnectionData[] {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    }
  }