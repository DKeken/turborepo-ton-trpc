import { Subject, catchError, from, mergeMap, of, tap } from "rxjs";
import Logger from "@app/logger";
import { ApiError } from "../errors/api-error";
import { inject, injectable } from "inversify";
import { TYPES } from "../__di/types";
import {
  ApiResponse,
  HttpMethod,
  IController,
  MiddlewareFunction,
  RouteConfig,
} from "./_types";

/**
 * Base controller class using RxJS and InversifyJS
 */
@injectable()
export abstract class Controller implements IController {
  protected readonly routes: Map<string, RouteConfig> = new Map();
  protected readonly middlewares: MiddlewareFunction[] = [];
  protected readonly requestSubject = new Subject<{
    path: string;
    method: HttpMethod;
    input: unknown;
    headers: Record<string, string>;
  }>();

  constructor(@inject(TYPES.LOGGER) protected readonly logger: Logger) {
    this.setupRequestHandler();
  }

  /**
   * Set up the request handler using RxJS
   */
  private setupRequestHandler(): void {
    this.requestSubject
      .pipe(
        tap(({ path, method, input }) => {
          this.logger.debug("Request received", {
            path,
            method,
            input,
            timestamp: new Date().toISOString(),
          });
        }),
        mergeMap(({ path, method, input, headers }) => {
          const routeKey = `${method}:${path}`;
          const route = this.routes.get(routeKey);

          if (!route) {
            return of(
              ApiError.notFound(
                `Route ${method} ${path} not found`
              ).toResponse()
            );
          }

          // Run middlewares
          const middlewareObservables = this.middlewares.map((middleware) =>
            middleware(input)
          );

          return from(middlewareObservables).pipe(
            mergeMap((observable) => observable),
            mergeMap(() => {
              // Validate input if validator exists
              if (route.validator) {
                const result = route.validator.safeParse(input);
                if (!result.success) {
                  return of(
                    ApiError.validationError(
                      "Invalid input",
                      result.error.format()
                    ).toResponse()
                  );
                }
                input = result.data;
              }

              // Execute handler
              return route.handler(input, headers).pipe(
                catchError((error) => {
                  const apiError = ApiError.fromError(error);
                  this.logger.error("Request handler error", {
                    error: apiError.message,
                    stack: apiError.stack,
                  });
                  return of(apiError.toResponse(true));
                })
              );
            }),
            catchError((error) => {
              const apiError = ApiError.fromError(error);
              this.logger.error("Middleware error", {
                error: apiError.message,
                stack: apiError.stack,
              });
              return of(apiError.toResponse(true));
            })
          );
        })
      )
      .subscribe();
  }

  /**
   * Handle an HTTP request
   * @param path - The request path
   * @param method - The HTTP method
   * @param input - The request input
   * @param headers - The request headers
   * @returns A promise that resolves to the response
   */
  public async handleRequest(
    path: string,
    method: HttpMethod,
    input: unknown,
    headers: Record<string, string>
  ): Promise<ApiResponse> {
    return new Promise((resolve) => {
      const subscription = this.requestSubject
        .pipe(
          tap(() => {
            // This is just to trigger the request processing
          }),
          mergeMap(({ path: reqPath, method: reqMethod }) => {
            if (reqPath === path && reqMethod === method) {
              const routeKey = `${method}:${path}`;
              const route = this.routes.get(routeKey);

              if (!route) {
                return of(
                  ApiError.notFound(
                    `Route ${method} ${path} not found`
                  ).toResponse()
                );
              }

              // Run middlewares
              const middlewareObservables = this.middlewares.map((middleware) =>
                middleware(input)
              );

              return from(middlewareObservables).pipe(
                mergeMap((observable) => observable),
                mergeMap(() => {
                  // Validate input if validator exists
                  let validatedInput = input;
                  if (route.validator) {
                    const result = route.validator.safeParse(input);
                    if (!result.success) {
                      return of(
                        ApiError.validationError(
                          "Invalid input",
                          result.error.format()
                        ).toResponse()
                      );
                    }
                    validatedInput = result.data;
                  }

                  // Execute handler
                  return route.handler(validatedInput, headers).pipe(
                    catchError((error) => {
                      const apiError = ApiError.fromError(error);
                      this.logger.error("Request handler error", {
                        error: apiError.message,
                        stack: apiError.stack,
                      });
                      return of(apiError.toResponse(true));
                    })
                  );
                }),
                catchError((error) => {
                  const apiError = ApiError.fromError(error);
                  this.logger.error("Middleware error", {
                    error: apiError.message,
                    stack: apiError.stack,
                  });
                  return of(apiError.toResponse(true));
                })
              );
            }
            return of(null);
          }),
          // Only take the first non-null result
          mergeMap((result) => (result ? of(result) : of())),
          // Take only one result
          tap((result) => {
            if (result) {
              resolve(result);
              subscription.unsubscribe();
            }
          })
        )
        .subscribe();

      // Emit the request
      this.requestSubject.next({ path, method, input, headers });
    });
  }

  /**
   * Register a route
   * @param config - The route configuration
   */
  protected registerRoute<TInput = unknown, TOutput = unknown>(
    config: RouteConfig<TInput, TOutput>
  ): void {
    const routeKey = `${config.method}:${config.path}`;
    this.routes.set(routeKey, config as RouteConfig);

    // Log when a route is registered
    this.logger.info(`Route registered: ${config.method} ${config.path}`, {
      method: config.method,
      path: config.path,
      routeKey,
      controller: this.constructor.name,
      description: config.description || "No description",
      tags: config.tags || [],
    });
  }

  /**
   * Register a middleware
   * @param middleware - The middleware function
   */
  protected use(middleware: MiddlewareFunction): void {
    this.middlewares.push(middleware);
  }
}
