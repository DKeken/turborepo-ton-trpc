import { Container } from "inversify";
import { TYPES } from "./types";
import Logger from "@app/logger";
import { TonController } from "@/controllers/ton.controller";
import { CacheService } from "@/services/cache/cache.service";
import { PubSubService } from "@/services/pubsub/pubsub.service";
import { UserStatusService } from "@/services/users/user-status.service";
import { UserRepository } from "@/repositories/user.repository";
import { UsersService } from "@/services/users/users.service";
import { TonProofService } from "@/services/ton/ton-proof.service";
import { TonApiService } from "@/services/ton/ton-api.service";
import { CHAIN } from "@tonconnect/ui";
import { TonClient4 } from "@ton/ton";
import { TON_ENDPOINTS } from "@/services/ton/dto/ton-api.dto";

// Create container instance
export const container = new Container({
  defaultScope: "Singleton",
});

/**
 * Configure the InversifyJS container
 * @returns Configured InversifyJS container
 */
export function configureContainer(): Container {
  // Register infrastructure
  container
    .bind<Logger>(TYPES.LOGGER)
    .toDynamicValue(() => Logger.createLogger({ prefix: "App" }))
    .inSingletonScope();

  // Register repositories
  container
    .bind<UserRepository>(UserRepository)
    .to(UserRepository)
    .inSingletonScope();

  // Register services
  container
    .bind<TonProofService>(TYPES.TON_PROOF_SERVICE)
    .to(TonProofService)
    .inSingletonScope();

  // Create a TonApiService with mainnet configuration
  const mainnetClient = new TonClient4({
    endpoint: TON_ENDPOINTS[CHAIN.MAINNET],
  });

  container
    .bind<TonApiService>(TYPES.TON_API_SERVICE)
    .toDynamicValue(() => {
      const logger = container.get<Logger>(TYPES.LOGGER);
      return new TonApiService(mainnetClient, logger);
    })
    .inSingletonScope();

  container
    .bind<CacheService>(TYPES.CACHE_SERVICE)
    .to(CacheService)
    .inSingletonScope();

  container
    .bind<PubSubService>(TYPES.PUBSUB_SERVICE)
    .to(PubSubService)
    .inSingletonScope();

  container
    .bind<UserStatusService>(TYPES.USER_STATUS_SERVICE)
    .to(UserStatusService)
    .inSingletonScope();

  container
    .bind<UsersService>(TYPES.USER_SERVICE)
    .to(UsersService)
    .inSingletonScope();

  // Register controllers
  container
    .bind<TonController>(TYPES.TON_CONTROLLER)
    .to(TonController)
    .inSingletonScope();

  return container;
}
