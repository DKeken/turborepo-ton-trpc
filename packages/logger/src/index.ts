import pino from "pino";
import pretty from "pino-pretty";

interface LoggerOptions {
	prefix?: string;
	level?: string;
	customLevels?: Record<string, number>;
	customColors?: string;
}

interface LogMessage {
	level?: unknown;
	[key: string]: unknown;
}

class Logger {
	private logger: pino.Logger;
	private options: LoggerOptions;

	constructor(options: LoggerOptions = {}) {
		this.options = options;

		const stream = pretty({
			colorize: true,
			levelFirst: true,
			translateTime: "yyyy-MM-dd HH:mm:ss",
			ignore: "pid,hostname",
			messageFormat: (log: LogMessage) => {
				const level = log.level?.toString() || "";
				const prefix = options.prefix ? `[${options.prefix}]` : "";
				const message = log.msg ? log.msg.toString() : "";
				return `[${level.toUpperCase()}] ${prefix} ${message}`;
			},
			customColors:
				options.customColors ||
				"error:red,warn:yellow,info:blue,debug:gray,success:green",
			customLevels: {
				success: 35,
				...options.customLevels,
			},
		});

		this.logger = pino(
			{
				name: options.prefix,
				level: options.level || "info",
				timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
				formatters: {
					level(label) {
						return { level: label };
					},
				},
			},
			stream,
		);
	}

	private formatMessage(msg: string | Error, args: unknown[]) {
		if (msg instanceof Error) {
			const { message, stack, ...rest } = msg;
			return {
				err: {
					message,
					stack,
					...rest,
				},
				...(args.length && { data: args }),
			};
		}
		return args.length ? { msg, data: args } : msg;
	}

	trace(msg: string, ...args: unknown[]): void {
		this.logger.trace(this.formatMessage(msg, args));
	}

	debug(msg: string, ...args: unknown[]): void {
		this.logger.debug(this.formatMessage(msg, args));
	}

	info(msg: string, ...args: unknown[]): void {
		this.logger.info(this.formatMessage(msg, args));
	}

	success(msg: string, ...args: unknown[]): void {
		const formattedMsg = this.formatMessage(msg, args);
		this.logger.info({
			level: "success",
			...(typeof formattedMsg === "string"
				? { msg: formattedMsg }
				: formattedMsg),
		});
	}

	warn(msg: string | Error, ...args: unknown[]): void {
		this.logger.warn(this.formatMessage(msg, args));
	}

	error(msg: string | Error, ...args: unknown[]): void {
		this.logger.error(this.formatMessage(msg, args));
	}

	fatal(msg: string | Error, ...args: unknown[]): void {
		this.logger.fatal(this.formatMessage(msg, args));
		process.exit(1);
	}

	child(options: LoggerOptions): Logger {
		return new Logger({
			...this.options,
			...options,
			level: options.level || this.logger.level,
		});
	}

	static createLogger(options?: LoggerOptions): Logger {
		return new Logger(options);
	}
}

export default Logger;
