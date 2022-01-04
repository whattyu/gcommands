import {Collection, CommandInteraction, ContextMenuInteraction} from 'discord.js';
import {AutoDeferType, GClient} from '../lib/GClient';
import {CommandContext} from '../lib/structures/contexts/CommandContext';
import {Handlers} from '../lib/managers/HandlerManager';
import {Commands} from '../lib/managers/CommandManager';
import Logger from 'js-logger';

const cooldowns = new Collection<string, Collection<string, number>>();

export async function InteractionCommandHandler(interaction: CommandInteraction | ContextMenuInteraction) {
	const client = interaction.client as GClient;

	const command = Commands.get(interaction.commandName);
	if (!command && client.options?.unknownCommandMessage) return interaction.reply({
		content: client.responses.NOT_FOUND,
		ephemeral: true
	});

	if (command.cooldown) {
		const cooldown = Handlers.cooldownHandler(interaction.user.id, command, cooldowns);
		if (cooldown) return interaction.reply({
			content: client.responses.COOLDOWN.replace('{time}', String(cooldown)).replace('{name}', command.name + ' command'),
			ephemeral: true,
		});
	}

	const ctx = new CommandContext(client, {
		channel: interaction.channel,
		createdAt: interaction.createdAt,
		createdTimestamp: interaction.createdTimestamp,
		guild: interaction.guild,
		guildId: interaction.guildId,
		user: interaction.user,
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		member: interaction.member,
		command: command,
		// @ts-expect-error Further research into this is required.
		arguments: interaction.options,
		deferReply: interaction.deferReply.bind(interaction),
		deleteReply: interaction.deleteReply.bind(interaction),
		editReply: interaction.editReply.bind(interaction),
		fetchReply: interaction.fetchReply.bind(interaction),
		followUp: interaction.followUp.bind(interaction),
		reply: interaction.reply.bind(interaction),
	});

	if (!await command.inhibit(ctx)) return;

	let autoDeferTimeout;
	if (command.autoDefer) autoDeferTimeout = setTimeout(() => {
		ctx.deferReply({ephemeral: command.autoDefer === AutoDeferType.EPHEMERAL});
	}, 2500 - client.ws.ping);

	await Promise.resolve(command.run(ctx)).catch(async (error) => {
		Logger.error(error.code, error.message);
		if (error.stack) Logger.trace(error.stack);
		const errorReply = () => (ctx.replied || ctx.deferred) ? ctx.editReply(client.responses.ERROR) : ctx.reply({
			content: client.responses.ERROR,
			ephemeral: true,
		});

		if (typeof command.onError === 'function') await Promise.resolve(command.onError(ctx, error)).catch(async () => await errorReply());
		else await errorReply();
	}).then(() => {
		if (autoDeferTimeout) clearTimeout(autoDeferTimeout);
		Logger.debug(`Successfully ran command (${command.name}) for ${interaction.user.username}`);
	});
}
