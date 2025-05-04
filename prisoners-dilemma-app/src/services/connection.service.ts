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
    
    public getConnections(): ConnectionData[] {
      // This will be implemented later
      throw new Error('Method not implemented');
    }
    
    public getConnectionById(connectionId: string): ConnectionData | null {
      // This will be implemented later
      throw new Error('Method not implemented');
    }
    
    public getConnectionsByStatus(status: ConnectionStatus): ConnectionData[] {
      // This will be implemented later
      throw new Error('Method not implemented');
    }
    
    public acceptConnection(connectionId: string, myName: string): void {
      // This will be implemented later
      throw new Error('Method not implemented');
    }
    
    public registerIncomingConnection(connectionId: string, externalFriendName: string): void {
      // This will be implemented later
      throw new Error('Method not implemented');
    }
    
    public deleteConnection(connectionId: string): void {
      // This will be implemented later
      throw new Error('Method not implemented');
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