import { createProxyCache } from 'dd-cache-proxy';
import { createBot, Bot, Intents, Collection, type Member } from '@discordeno/bot';
import { addDesiredProperties } from './desiredProperties';

if (!process.env['TOKEN']) throw new Error('Missing TOKEN in env');

const outsideMemoryDatabase: { members: { [key: string]: { [key: string]: Member } } } = {
    members: {},
};

const getProxyCacheBot = (bot: Bot) =>
    createProxyCache(bot, {
        desiredProps: {
            guilds: ['channels', 'icon', 'id', 'name', 'roles'],
            users: ['avatar', 'id', 'username'],
        },
        cacheInMemory: {
            guilds: true,
            roles: true,
            channels: true,
            users: true,
            // members: true, // Fun fact: This doesn't work with the library for some reason.
            default: false,
        },
        cacheOutsideMemory: {
            members: true,
            default: false,
        },
        // @ts-ignore
        getItem: async (table, id, guildId) => {
            if (table === 'members') return outsideMemoryDatabase.members[guildId.toString()]?.[id.toString()];
            throw new Error('This should not be reaching here');
        },
        setItem: async (table, item) => {
            if (table === 'members') {
                let guild = outsideMemoryDatabase.members[item.guildId.toString()];
                if (!guild) guild = outsideMemoryDatabase.members[item.guildId.toString()] = {};
                guild[item.id] = item;
            }
        },
    });

const bot = getProxyCacheBot(
    createBot({
        token: process.env.TOKEN,
        intents: 
            Intents.Guilds |
            Intents.GuildMembers |
            Intents.GuildMessages,
        events: {
            messageCreate: async message => console.log('member talked', await bot.cache.users.get(message.author.id), message.guildId ? await bot.cache.members.get(message.author.id, message.guildId) : 'not in guild'),

            guildCreate: async guild => console.log('guild created', await bot.cache.guilds.get(guild.id)),
            guildUpdate: async guild => console.log('guild updated', await bot.cache.guilds.get(guild.id)),
            guildDelete: async guildId => console.log('guild deleted (should be undefined ->)', await bot.cache.guilds.get(guildId)),

            roleCreate: async role => console.log('role created', await bot.cache.roles.get(role.id)),
            roleUpdate: async role => console.log('role updated', await bot.cache.roles.get(role.id)),
            roleDelete: async ({ roleId }) => console.log('role deleted (should be undefined ->)', await bot.cache.roles.get(roleId)),

            channelCreate: async channel => console.log('channel created', await bot.cache.channels.get(channel.id)),
            channelUpdate: async channel => console.log('channel updated', await bot.cache.channels.get(channel.id)),
            channelDelete: async channel => console.log('channel deleted (should be undefined ->)', await bot.cache.channels.get(channel.id)),

            guildMemberAdd: async member => console.log('member add', await bot.cache.members.get(member.id, member.guildId)),
            guildMemberUpdate: async member => console.log('member update', await bot.cache.members.get(member.id, member.guildId)),
            guildMemberRemove: async (user, guildId) => console.log('member removed (should be undefined ->)', await bot.cache.members.get(user.id, guildId)),
        }
    })
);

addDesiredProperties(bot);

bot.start();
