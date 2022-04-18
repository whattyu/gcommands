import { setImmediate } from 'node:timers';
import { Client, ClientOptions, Snowflake } from 'discord.js';
import { Commands } from './managers/CommandManager';
import { Components } from './managers/ComponentManager';
import { Listeners } from './managers/ListenerManager';
import { Plugins } from './managers/PluginManager';
import { registerDirectories } from './util/registerDirectories';
import Responses from '../responses.json';

/**
 * Enum for auto defer feature.
 * Automatic defer if bot does not reply within more than 3s
 * * EPHEMERAL
 * * NORMAL
 * * UPDATE
 */
export enum AutoDeferType {
	/**
	 * @example interaction.deferReply({ ephemeral: true })
	 */
	'EPHEMERAL' = 1,
	/**
	 * @example interaction.deferReply()
	 */
	'NORMAL' = 2,
	/**
	 * @example interaction.deferUpdate()
	 */
	'UPDATE' = 3,
}

/**
 * Options for the GClient.
 * @extends {ClientOptions}
 */
export interface GClientOptions extends ClientOptions {
	/**
	 * Support for message commands.
	 * @type {boolean}
	 */
	messageSupport?: boolean;
	/**
	 * Prefix for message commands
	 * @requires {@link GClientOptions.messageSupport} to be enabled
	 * @type {string}
	 */
	messagePrefix?: string;
	/**
	 * Whether to send a message for a unknown command.
	 * @type {boolean}
	 */
	unknownCommandMessage?: boolean;
	/**
	 * Array of all folders to be loaded by GCommands.
	 *
	 * It can load from these folders:
	 * * Commands
	 * * Listeners (Events)
	 * * Components
	 *
	 * @type {string[]}
	 * @example
	 * ```typescript
	 * new GClient({
	 * 		dirs: [
	 * 			'commands',
	 * 			'events',
	 * 			'components',
	 * 		]
	 * })
	 * ```
	 */
	dirs?: Array<string>;
	/**
	 * The database to be used in the project.
	 *
	 * You can put whatever you want in this option, it only serves your purposes.
	 * The library itself does not use the database.
	 *
	 * @type {any}
	 */
	database?: any;
	/**
	 * The guild id that will serve as development server.
	 *
	 * All application commands are not automatically loaded as global, but only as guildOnly for this option.
	 * If you want to make the commands public, you need to delete this options.
	 *
	 * @type {Snowflake}
	 */
	devGuildId?: Snowflake;
}

/**
 * The base {@link Client} extension that makes GCommands work. To use GCommands, you must use this class or extend it.
 *
 * GCommands automatically loads everything.
 *
 * @see {@link GClientOptions} for all available options in GClient.
 *
 * @extends {Client}
 */
export class GClient<Ready extends boolean = boolean> extends Client<Ready> {
	/**
	 * Object of all basic messages if a problem occurs.
	 *
	 * However, you can customize these messages using the [@gcommands/plugin-language](https://github.com/Garlic-Team/gcommands-addons/tree/master/packages/plugin-language) plugin.
	 *
	 * @see {@link Responses}
	 */
	public responses: Record<string, string> = Responses;

	/**
	 * Object of all provided options.
	 */
	public declare options: GClientOptions;

	constructor(options: GClientOptions) {
		super(options);

		if (options.dirs) registerDirectories(options.dirs);
		if (this.options.database) {
			if (typeof this.options.database.init === 'function')
				this.options.database.init();
		}

		// Load all managers before login.
		setImmediate(async (): Promise<void> => {
			await Promise.all([
				Plugins.initiate(this),
				Commands.initiate(this),
				Components.initiate(this),
				Listeners.initiate(this),
			]);
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	/**
	 * The method that returns original types from {@link GClientOptions.database}
	 * @param {any} _ Prototype of your class to get types.
	 * @returns {Database}
	 * @example TypeScript example
	 * ```typescript
	 * import { MongoDBProvider } from 'gcommands/dist/providers/MongoDBProvider';
	 *
	 * const client = new GClient({
	 * 		..settings,
	 * 		database: new MongoDBProvider('mongodb://localhost:27017/database')
	 * })
	 *
	 * const db = client.getDatabase(MongoDBProvider.prototype);
	 * // Types working in `db`
	 * ```
	 * @example JavaScript example
	 * ```javascript
	 * const { MongoDBProvider } = require('gcommands/dist/providers/MongoDBProvider');
	 *
	 * const client = new GClient({
	 * 		..settings,
	 * 		database: new MongoDBProvider('mongodb://localhost:27017/database')
	 * })
	 *
	 * const db = client.getDatabase(MongoDBProvider.prototype);
	 * // Types working in `db`
	 * ```
	 */
	public getDatabase<Database>(_?: Database): Database {
		return this.options.database;
	}
}
