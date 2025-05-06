// uuid-utils.ts

/**
 * Utility class for UUID generation and validation
 */
export class UuidUtils {
    /**
     * Generates a RFC4122 version 4 UUID
     * @returns A UUID string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     */
    public static generateUUID(): string {
      // Implementation of RFC4122 version 4 UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  
    /**
     * Validates whether a string is a properly formatted UUID
     * @param uuid The string to validate
     * @returns True if the string is a valid UUID, false otherwise
     */
    public static isValidUUID(uuid: string): boolean {
      if (!uuid) {
        return false;
      }
      
      // UUID v4 regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidPattern.test(uuid);
    }
  }