import { expect } from 'vitest';
import { ApiErrorType, ApiError } from '../../../src/services/api/api-error';

describe('ApiErrorType', () => {
  it('should define all required error types', () => {
    expect(ApiErrorType).toBeDefined();
    expect(ApiErrorType.NETWORK_ERROR).toBeDefined();
    expect(ApiErrorType.SERVER_ERROR).toBeDefined();
    expect(ApiErrorType.AUTHENTICATION_ERROR).toBeDefined();
    expect(ApiErrorType.REQUEST_ERROR).toBeDefined();
    expect(ApiErrorType.CONNECTION_NOT_FOUND).toBeDefined();
    expect(ApiErrorType.EXPIRED_CONNECTION).toBeDefined();
    expect(ApiErrorType.INVALID_FORMAT).toBeDefined();
    expect(ApiErrorType.UNKNOWN_ERROR).toBeDefined();
  });
});

describe('ApiError', () => {
  it('should create an instance with error type and message', () => {
    const error = new ApiError(ApiErrorType.NETWORK_ERROR, 'Failed to connect to server');
    
    expect(error).toBeInstanceOf(ApiError);
    expect(error.type).toBe(ApiErrorType.NETWORK_ERROR);
    expect(error.message).toBe('Failed to connect to server');
    expect(error.statusCode).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should allow setting optional status code and details', () => {
    const details = { requestId: '123', timestamp: new Date().toISOString() };
    const error = new ApiError(
      ApiErrorType.SERVER_ERROR, 
      'Internal server error', 
      500, 
      details
    );
    
    expect(error.type).toBe(ApiErrorType.SERVER_ERROR);
    expect(error.message).toBe('Internal server error');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual(details);
  });

  it('should provide toString method for error formatting', () => {
    const error = new ApiError(
      ApiErrorType.REQUEST_ERROR, 
      'Invalid request format', 
      400
    );
    
    const errorString = error.toString();
    expect(errorString).toContain('REQUEST_ERROR');
    expect(errorString).toContain('Invalid request format');
    expect(errorString).toContain('400');
  });

  it('should map HTTP status code to error type correctly', () => {
    expect(ApiError.fromStatusCode(401).type).toBe(ApiErrorType.AUTHENTICATION_ERROR);
    expect(ApiError.fromStatusCode(404).type).toBe(ApiErrorType.CONNECTION_NOT_FOUND);
    expect(ApiError.fromStatusCode(410).type).toBe(ApiErrorType.EXPIRED_CONNECTION);
    expect(ApiError.fromStatusCode(400).type).toBe(ApiErrorType.REQUEST_ERROR);
    expect(ApiError.fromStatusCode(422).type).toBe(ApiErrorType.INVALID_FORMAT);
    expect(ApiError.fromStatusCode(500).type).toBe(ApiErrorType.SERVER_ERROR);
    expect(ApiError.fromStatusCode(503).type).toBe(ApiErrorType.SERVER_ERROR);
    expect(ApiError.fromStatusCode(599).type).toBe(ApiErrorType.UNKNOWN_ERROR);
  });
});