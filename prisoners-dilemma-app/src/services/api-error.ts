// src/services/api-error.ts
export enum ApiErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  REQUEST_FAILED = 'REQUEST_FAILED'
}

export class ApiError extends Error {
  readonly type: ApiErrorType;
  readonly statusCode?: number;
  readonly details?: Record<string, any>;
  
  constructor(
    type: ApiErrorType, 
    message: string, 
    statusCode?: number, 
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    
    // Needed for proper instanceof checks with extended Error classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Maps HTTP status codes to ApiErrorType
   */
  static fromStatusCode(statusCode: number, message?: string): ApiError {
    let type: ApiErrorType;
    
    switch (true) {
      case statusCode >= 500:
        type = ApiErrorType.SERVER_ERROR;
        break;
      case statusCode === 401 || statusCode === 403:
        type = ApiErrorType.AUTHENTICATION_FAILED;
        break;
      case statusCode === 408:
        type = ApiErrorType.TIMEOUT;
        break;
      default:
        type = ApiErrorType.REQUEST_FAILED;
    }
    
    return new ApiError(
      type, 
      message || `Request failed with status code ${statusCode}`, 
      statusCode
    );
  }

  /**
   * Creates an ApiError from an unknown error object
   */
  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new ApiError(ApiErrorType.COMMUNICATION_ERROR, message);
  }
}