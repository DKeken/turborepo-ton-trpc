/**
 * Represents detailed information about a TON blockchain account.
 */
export interface AccountInfo {
  /**
   * Account-specific information.
   */
  account: {
    /**
     * Account balance information.
     */
    balance: {
      /**
       * Account balance in nanograms (as string to handle large numbers).
       */
      coins: string;
    };
    /**
     * Information about the last transaction.
     */
    last: {
      /**
       * Hash of the last transaction.
       */
      hash: string;
      /**
       * Logical time of the last transaction.
       */
      lt: string;
    };
    /**
     * Current state of the account.
     */
    state: {
      /**
       * Smart contract code (Base64 encoded).
       */
      code: string;
      /**
       * Smart contract data (Base64 encoded).
       */
      data: string;
      /**
       * Account state type (e.g., "active", "uninit", "frozen").
       */
      type: string;
    };
    /**
     * Storage statistics for the account.
     */
    storageStat: {
      /**
       * Due payment for storage, null if none.
       */
      duePayment: null;
      /**
       * Unix timestamp of the last storage payment.
       */
      lastPaid: number;
      /**
       * Storage usage metrics.
       */
      used: {
        /**
         * Number of bits used.
         */
        bits: number;
        /**
         * Number of cells used.
         */
        cells: number;
        /**
         * Number of public cells used.
         */
        publicCells: number;
      };
    };
  };
  /**
   * Information about the block containing this account state.
   */
  block: {
    /**
     * File hash of the block.
     */
    fileHash: string;
    /**
     * Root hash of the block.
     */
    rootHash: string;
    /**
     * Sequence number of the block.
     */
    seqno: number;
    /**
     * Shard identifier.
     */
    shard: string;
    /**
     * Workchain identifier.
     */
    workchain: number;
  };
  /**
   * Account address in standard TON format.
   */
  address: string;
}
