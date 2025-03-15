import { TonProofService } from "../services/ton/ton-proof.service";
import { TonApiService } from "../services/ton/ton-api.service";
import {
  type AuthToken,
  createAuthToken,
  createPayloadToken,
  decodeAuthToken,
  verifyToken,
} from "../lib/jwt";
import { Address } from "@ton/ton";
import { withRetry } from "../utils/retry";
import { Controller } from "./controller";
import { Observable, catchError, from, map, of, switchMap } from "rxjs";
import { ApiError } from "../errors/api-error";
import { TYPES } from "../__di/types";
import {
  CheckProofRequestDto,
  CheckProofRequestSchema,
  CheckProofResponseDto,
  GeneratePayloadResponseDto,
  AccountInfoResponseDto,
  createSuccessResponse,
} from "../dto/ton.dto";
import { ApiResponse } from "./_types";
import { inject, injectable } from "inversify";
import Logger from "@app/logger";

// Define the account info structure based on TonApiService response
interface TonAccountInfo {
  account: {
    balance: {
      coins: string;
      currencies: Record<string, string>;
    };
    state: {
      type: string;
      data?: string | null;
      code?: string | null;
    };
  };
  block: {
    seqno: number;
    shard: string;
    rootHash: string;
    fileHash: string;
  };
}

/**
 * Controller for TON blockchain authentication
 */
@injectable()
export class TonController extends Controller {
  constructor(
    @inject(TYPES.TON_PROOF_SERVICE)
    private readonly tonProofService: TonProofService
  ) {
    // Create a controller-specific logger
    super(Logger.createLogger({ prefix: "TonController" }));
    this.setupRoutes();
    this.setupMiddlewares();
  }

  private setupRoutes(): void {
    // Generate payload route
    this.registerRoute<unknown, GeneratePayloadResponseDto>({
      path: "/auth/generate-payload",
      method: "GET",
      handler: (): Observable<ApiResponse<GeneratePayloadResponseDto>> => {
        return from(
          withRetry(() => this.tonProofService.generatePayload())
        ).pipe(
          switchMap((payload) => from(createPayloadToken({ payload }))),
          map((token) => {
            this.logger.debug("Generated auth payload token", {
              timestamp: new Date().toISOString(),
            });
            return createSuccessResponse<GeneratePayloadResponseDto>({ token });
          }),
          catchError((error) => {
            this.logger.error("Failed to generate auth payload", {
              error: error instanceof Error ? error.message : String(error),
            });
            throw ApiError.badRequest(
              "Failed to generate authentication payload",
              error
            );
          })
        );
      },
    });

    // Check proof route
    this.registerRoute<CheckProofRequestDto, CheckProofResponseDto>({
      path: "/auth/check-proof",
      method: "POST",
      validator: CheckProofRequestSchema,
      handler: (
        input: CheckProofRequestDto
      ): Observable<ApiResponse<CheckProofResponseDto>> => {
        return of(input).pipe(
          switchMap((validatedInput) => {
            const client = TonApiService.create(validatedInput.network);
            return from(
              withRetry(() =>
                this.tonProofService.checkProof(
                  validatedInput,
                  (address: string) => client.getWalletPublicKey(address)
                )
              )
            ).pipe(
              switchMap((isValid) => {
                if (!isValid) {
                  throw ApiError.badRequest("Invalid proof");
                }
                return from(verifyToken(validatedInput.proof.payload));
              }),
              switchMap((isValidToken) => {
                if (!isValidToken) {
                  throw ApiError.badRequest("Invalid token");
                }
                return from(
                  createAuthToken({
                    address: validatedInput.address,
                    network: validatedInput.network,
                  })
                );
              }),
              map((token) =>
                createSuccessResponse<CheckProofResponseDto>({ token })
              ),
              catchError((error) => {
                this.logger.error("Failed to check proof", {
                  error: error instanceof Error ? error.message : String(error),
                });
                throw ApiError.fromError(error);
              })
            );
          })
        );
      },
    });

    // Get account info route
    this.registerRoute<unknown, AccountInfoResponseDto>({
      path: "/auth/get-account-info",
      method: "GET",
      handler: (
        _input: unknown,
        headers?: Record<string, string>
      ): Observable<ApiResponse<AccountInfoResponseDto>> => {
        return of(headers).pipe(
          switchMap((headers) => {
            if (!headers) {
              throw ApiError.unauthorized("No headers provided");
            }

            const token = headers.authorization?.replace("Bearer ", "");
            if (!token) {
              throw ApiError.unauthorized("No token provided");
            }

            return from(verifyToken(token)).pipe(
              switchMap((isValid) => {
                if (!isValid) {
                  throw ApiError.unauthorized("Invalid token");
                }
                const payload = decodeAuthToken(token) as AuthToken;
                if (!payload?.address || !payload?.network) {
                  throw ApiError.unauthorized("Invalid token payload");
                }
                return of(payload);
              })
            );
          }),
          switchMap((payload) => {
            const client = TonApiService.create(payload.network);
            return from(
              withRetry(() => client.getAccountInfo(payload.address))
            ).pipe(
              map((accountInfoPromise) => {
                // Ensure we have the account info resolved
                return from(Promise.resolve(accountInfoPromise)).pipe(
                  map((accountInfo: TonAccountInfo) => {
                    const result: AccountInfoResponseDto = {
                      address: Address.parse(payload.address).toString(),
                      account: {
                        balance: accountInfo.account.balance,
                        state: accountInfo.account.state,
                      },
                    };
                    return createSuccessResponse<AccountInfoResponseDto>(
                      result
                    );
                  })
                );
              }),
              switchMap((observable) => observable)
            );
          }),
          catchError((error) => {
            this.logger.error("Failed to get account info", {
              error: error instanceof Error ? error.message : String(error),
            });
            throw ApiError.fromError(error);
          })
        );
      },
    });
  }

  private setupMiddlewares(): void {
    this.use((input) => {
      return of(void 0).pipe(
        map(() => {
          this.logger.debug("Request received", {
            timestamp: new Date().toISOString(),
            input,
          });
        })
      );
    });
  }
}
