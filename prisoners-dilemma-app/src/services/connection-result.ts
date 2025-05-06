// connection-result.ts
/**
 * Generic Result type for operations that can succeed or fail
 * @template T The type of the result value on success
 * @template E The type of the error on failure
 */
export class Result<T, E = Error> {
    private readonly _value?: T;
    private readonly _error?: E;
    private readonly _isSuccess: boolean;
  
    private constructor(isSuccess: boolean, value?: T, error?: E) {
      this._isSuccess = isSuccess;
      this._value = value;
      this._error = error;
    }
  
    /**
     * Creates a successful result
     * @param value The success value
     */
    public static success<T, E = Error>(value: T): Result<T, E> {
      return new Result<T, E>(true, value);
    }
  
    /**
     * Creates a failure result
     * @param error The error value
     */
    public static failure<T, E = Error>(error: E): Result<T, E> {
      return new Result<T, E>(false, undefined, error);
    }
  
    /**
     * Checks if the result is a success
     */
    public isSuccess(): boolean {
      return this._isSuccess;
    }
  
    /**
     * Checks if the result is a failure
     */
    public isFailure(): boolean {
      return !this._isSuccess;
    }
  
    /**
     * Gets the success value
     * @throws Error if the result is a failure
     */
    public getValue(): T {
      if (!this._isSuccess) {
        throw new Error('Cannot get value from a failure result');
      }
      return this._value as T;
    }
  
    /**
     * Gets the error
     * @throws Error if the result is a success
     */
    public getError(): E {
      if (this._isSuccess) {
        throw new Error('Cannot get error from a success result');
      }
      return this._error as E;
    }
  
    /**
     * Maps a success value to a new value
     * @param fn The mapping function
     */
    public map<U>(fn: (value: T) => U): Result<U, E> {
      if (this._isSuccess) {
        return Result.success<U, E>(fn(this._value as T));
      }
      return Result.failure<U, E>(this._error as E);
    }
  
    /**
     * Provides a default value if the result is a failure
     * @param defaultValue The default value
     */
    public getOrElse(defaultValue: T): T {
      return this._isSuccess ? (this._value as T) : defaultValue;
    }
  
    /**
     * Executes a function based on the result state
     * @param onSuccess Function to execute on success
     * @param onFailure Function to execute on failure
     */
    public fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): U {
      return this._isSuccess
        ? onSuccess(this._value as T)
        : onFailure(this._error as E);
    }
  }
  
  /**
   * Connection error types
   */
  export enum ConnectionErrorType {
    INVALID_ID = 'invalid_id',
    INVALID_NAME = 'invalid_name',
    STORAGE_ERROR = 'storage_error',
    CONNECTION_EXISTS = 'connection_exists',
    CONNECTION_NOT_FOUND = 'connection_not_found',
    INVALID_STATUS = 'invalid_status'
  }
  
  /**
   * Connection error with type and message
   */
  export class ConnectionError {
    constructor(
      public readonly type: ConnectionErrorType,
      public readonly message: string
    ) {}
  }