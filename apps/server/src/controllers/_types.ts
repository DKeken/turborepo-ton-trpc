import { Observable } from "rxjs";
import { z } from "zod";

/**
 * HTTP methods supported by the controllers
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS";

/**
 * Base response interface
 */
export interface Response {
  success: boolean;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T> extends Response {
  success: true;
  data: T;
}

/**
 * Error response interface
 */
export interface ErrorResponse extends Response {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    trace?: unknown;
  };
}

/**
 * API response type
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Route configuration interface
 */
export interface RouteConfig<TInput = unknown, TOutput = unknown> {
  path: string;
  method: HttpMethod;
  handler: (
    input: TInput,
    headers?: Record<string, string>
  ) => Observable<ApiResponse<TOutput>>;
  validator?: z.ZodType<TInput>;
  description?: string;
  tags?: string[];
}

/**
 * Middleware function type
 */
export interface MiddlewareFunction {
  (input: unknown): Observable<void>;
}

/**
 * Controller interface
 */
export interface IController {
  handleRequest(
    path: string,
    method: HttpMethod,
    input: unknown,
    headers: Record<string, string>
  ): Promise<ApiResponse>;
}
