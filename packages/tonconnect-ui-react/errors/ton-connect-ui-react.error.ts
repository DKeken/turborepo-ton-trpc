import { TonConnectUIError } from "@tonconnect/ui";

export class TonConnectUIReactError extends TonConnectUIError {
	constructor(...args: ConstructorParameters<typeof Error>) {
		super(...args);

		Object.setPrototypeOf(this, TonConnectUIReactError.prototype);
	}
}
