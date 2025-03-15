/**
 * Type-safe dependency injection types using InversifyJS
 */

/**
 * Service identifiers for dependency injection
 */
export const TYPES = {
  // Services
  TON_PROOF_SERVICE: Symbol.for("TonProofService"),
  TON_API_SERVICE: Symbol.for("TonApiService"),
  CACHE_SERVICE: Symbol.for("CacheService"),
  PUBSUB_SERVICE: Symbol.for("PubSubService"),
  USER_SERVICE: Symbol.for("UserService"),
  USER_STATUS_SERVICE: Symbol.for("UserStatusService"),

  // Infrastructure
  LOGGER: Symbol.for("Logger"),

  // Controllers
  TON_CONTROLLER: Symbol.for("TonController"),
} as const;

/**
 * Type for service identifiers
 */
export type ServiceIdentifier = symbol;
