import { Address, TonClient4 } from "@ton/ton";
import { CHAIN } from "@tonconnect/ui";
import { Buffer } from "node:buffer";
import { injectable, inject } from "inversify";
import { TYPES } from "@/__di/types";
import Logger from "@app/logger";
import {
  AccountInfoResponse,
  TonClientConfig,
  TON_ENDPOINTS,
} from "./dto/ton-api.dto";

/**
 * Service for interacting with the TON blockchain
 */
@injectable()
export class TonApiService {
  private readonly logger: Logger;
  private readonly client: TonClient4;

  /**
   * Create a new TonApiService instance
   * @param clientOrChain - TonClient4 instance or CHAIN enum value
   * @param logger - Logger instance
   * @returns TonApiService instance
   */
  public static create(
    clientOrChain: TonClient4 | CHAIN,
    logger?: Logger
  ): TonApiService {
    if (clientOrChain instanceof TonClient4) {
      return new TonApiService(clientOrChain, logger);
    }

    const config: TonClientConfig = {
      endpoint: TON_ENDPOINTS[clientOrChain],
    };

    return new TonApiService(new TonClient4(config), logger);
  }

  /**
   * Constructor
   * @param client - TonClient4 instance
   * @param logger - Logger instance
   */
  constructor(client: TonClient4, @inject(TYPES.LOGGER) logger?: Logger) {
    this.client = client;
    this.logger = logger || Logger.createLogger({ prefix: "TonApiService" });
  }

  /**
   * Retrieves the wallet's public key associated with the given address.
   * @param address - The TON wallet address
   * @returns Promise resolving to the public key as a Buffer
   * @throws Error if the address is invalid or request fails
   */
  public async getWalletPublicKey(address: string): Promise<Buffer> {
    try {
      const parsedAddress = Address.parse(address);
      const {
        last: { seqno },
      } = await this.client.getLastBlock();
      const result = await this.client.runMethod(
        seqno,
        parsedAddress,
        "get_public_key",
        []
      );

      const pubKeyHex = result.reader
        .readBigNumber()
        .toString(16)
        .padStart(64, "0");
      return Buffer.from(pubKeyHex, "hex");
    } catch (error: unknown) {
      const errorMessage = `Failed to get wallet public key: ${
        (error as Error).message
      }`;
      this.logger.error(errorMessage, { address });
      throw new Error(errorMessage);
    }
  }

  /**
   * Fetches detailed account information for the given address.
   * @param address - The TON wallet address
   * @returns Promise resolving to the account information
   * @throws Error if the address is invalid or request fails
   */
  public async getAccountInfo(address: string): Promise<AccountInfoResponse> {
    try {
      const parsedAddress = Address.parse(address);
      const {
        last: { seqno },
      } = await this.client.getLastBlock();
      return await this.client.getAccount(seqno, parsedAddress);
    } catch (error: unknown) {
      const errorMessage = `Failed to get account info: ${
        (error as Error).message
      }`;
      this.logger.error(errorMessage, { address });
      throw new Error(errorMessage);
    }
  }
}
