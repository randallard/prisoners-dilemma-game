/**
 * Enum representing different types of API errors
 */
export enum ApiErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  REQUEST_ERROR = "REQUEST_ERROR",
  CONNECTION_NOT_FOUND = "CONNECTION_NOT_FOUND",
  EXPIRED_CONNECTION = "EXPIRED_CONNECTION",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_ID = "INVALID_ID",
  STORAGE_ERROR = "STORAGE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

/**
 * Class representing an API error with type, message, status code, and optional details
 */
export class ApiError {
  readonly type: ApiErrorType;
  readonly message: string;
  readonly statusCode?: number;
  readonly details?: Record<string, any>;

  /**
   * Creates a new ApiError instance
   * 
   * @param type The type of API error
   * @param message Human-readable error message
   * @param statusCode Optional HTTP status code associated with the error
   * @param details Optional additional error details
   */
  constructor(
    type: ApiErrorType,
    message: string,
    statusCode?: number,
    details?: Record<string, any>
  ) {
    this.type = type;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Returns a formatted string representation of the error
   */
  toString(): string {
    let result = `ApiError: ${this.type} - ${this.message}`;
    if (this.statusCode) {
      result += ` (Status: ${this.statusCode})`;
    }
    if (this.details) {
      result += ` Details: ${JSON.stringify(this.details)}`;
    }
    return result;
  }

  /**
   * Creates an ApiError instance from an HTTP status code
   * 
   * @param statusCode HTTP status code
   * @param message Optional error message (defaults to status code description)
   * @param details Optional additional error details
   * @returns ApiError instance with the appropriate error type
   */
  static fromStatusCode(
    statusCode: number,
    message?: string,
    details?: Record<string, any>
  ): ApiError {
    let type: ApiErrorType;
    let defaultMessage: string;

    switch (true) {
      case statusCode === 401 || statusCode === 403:
        type = ApiErrorType.AUTHENTICATION_ERROR;
        defaultMessage = "Authentication failed";
        break;
      case statusCode === 404:
        type = ApiErrorType.CONNECTION_NOT_FOUND;
        defaultMessage = "Connection not found";
        break;
      case statusCode === 410:
        type = ApiErrorType.EXPIRED_CONNECTION;
        defaultMessage = "Connection has expired";
        break;
      case statusCode === 400:
        type = ApiErrorType.REQUEST_ERROR;
        defaultMessage = "Invalid request";
        break;
      case statusCode === 422:
        type = ApiErrorType.INVALID_FORMAT;
        defaultMessage = "Invalid data format";
        break;
      case statusCode >= 500 && statusCode < 600:
        type = ApiErrorType.SERVER_ERROR;
        defaultMessage = "Server error occurred";
        break;
      default:
        type = ApiErrorType.UNKNOWN_ERROR;
        defaultMessage = "Unknown error occurred";
    }

    return new ApiError(
      type,
      message || defaultMessage,
      statusCode,
      details
    );
  }
}