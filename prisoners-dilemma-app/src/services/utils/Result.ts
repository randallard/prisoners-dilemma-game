// Result.ts
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
   * Checks if the result is an error
   */
  public isError(): boolean {
    return !this._isSuccess;
  }

  /**
   * Gets the success value
   * @throws Error if the result is a failure
   */
  public get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from error result');
    }
    return this._value as T;
  }

  /**
   * Gets the error value
   * @throws Error if the result is a success
   */
  public get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from success result');
    }
    return this._error as E;
  }

  /**
   * Maps the success value to a new value
   * @param fn The mapping function
   */
  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.success<U, E>(fn(this._value as T));
    }
    return Result.failure<U, E>(this._error as E);
  }

  /**
   * Maps the error value to a new error
   * @param fn The mapping function
   */
  public mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this._isSuccess) {
      return Result.success<T, F>(this._value as T);
    }
    return Result.failure<T, F>(fn(this._error as E));
  }

  /**
   * Returns the success value or a default value if the result is a failure
   * @param defaultValue The default value to return if the result is a failure
   */
  public getOrElse(defaultValue: T): T {
    if (this._isSuccess) {
      return this._value as T;
    }
    return defaultValue;
  }
}
