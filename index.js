const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel} = require('@discordjs/voice');
const play = require('play-dl');
const { token } = require('./token.json');
const { prefix } = require('./config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.MessageContent
    ]});
client.login(token).then(r => {
    console.log(`Logged in as ${client.user.tag}!`);
});

class Bot {
    constructor() {
        this.connection = {};
        this.player = {};
        this.queue = {};
        this.isPlaying = {};
        this.resourceMsg = {};
    }
    async play(msg) {
        if (this.connection[msg.guildId] == null || this.connection[msg.guildId].state.status === "destroyed") {
            this.connection[msg.guildId] = joinVoiceChannel({
                channelId: msg.member.voice.channel.id,
                guildId: msg.guild.id,
                adapterCreator: msg.guild.voiceAdapterCreator
            });
            this.player[msg.guildId] = createAudioPlayer();
            this.connection[msg.guildId].subscribe(this.player[msg.guildId]);
            this.resourceMsg[msg.guildId] = msg;
        }
        const musicURL = msg.content.replace(`${prefix}p`, '').trim();
        try {
            let info = await play.video_info(musicURL);
            let stream = await play.stream_from_info(info);
            if (!this.queue[msg.guildId]) {
                this.queue[msg.guildId] = [];
            }
            this.queue[msg.guildId].push({
                queuedMsg: msg,
                name: info.video_details.title,
                url: musicURL,
                stream: stream
            })
            if (this.isPlaying[msg.guildId]) {
                msg.channel.send({embeds:[new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('Track queued:')
                        .setDescription(info.video_details.title)
                        .setURL(musicURL)
                        .setTimestamp()
                    ]});
            } else {
                this.isPlaying[msg.guildId] = true;
                msg.channel.send({embeds:[new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('Now playing:')
                        .setDescription(this.queue[msg.guildId][0].name)
                        .setURL(this.queue[msg.guildId][0].url)
                        .setTimestamp()
                    ]});
                this.player[msg.guildId].play(createAudioResource(this.queue[msg.guildId][0].stream.stream, {inputType: this.queue[msg.guildId][0].stream.type}));
                this.queue[msg.guildId].shift();
                this.player[msg.guildId].on("idle", () => {
                    if (this.queue[msg.guildId].length > 0) {
                        this.queue[msg.guildId][0].queuedMsg.channel.send({embeds:[new EmbedBuilder()
                                .setColor('#3498DB')
                                .setTitle('Now playing:')
                                .setDescription(this.queue[msg.guildId][0].name)
                                .setURL(this.queue[msg.guildId][0].url)
                                .setTimestamp()
                            ]});
                        this.player[msg.guildId].play(createAudioResource(this.queue[msg.guildId][0].stream.stream, {inputType: this.queue[msg.guildId][0].stream.type}));
                        this.queue[msg.guildId].shift();
                    } else {
                        if (this.isPlaying[msg.guildId] === true) {
                            this.isPlaying[msg.guildId] = false;
                            this.resourceMsg[msg.guildId].channel.send({embeds:[new EmbedBuilder()
                                    .setColor('#3498DB')
                                    .setTitle('End of queue')
                                    .setDescription('.help for commands')
                                    .setTimestamp()]});
                            this.connection[msg.guildId].destroy();
                        }
                    }
                });
            }
        } catch(e) {
            console.log(e);
        }
    }
    resume(msg) {
        if (this.player[msg.guildId]) {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Resume playing')
                    .setTimestamp()
                ]});
            this.player[msg.guildId].unpause();
        }
    }
    pause(msg) {
        if (this.player[msg.guildId]) {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Pause playing')
                    .setTimestamp()
                ]});
            this.player[msg.guildId].pause();
        }
    }
    skip(msg) {
        if (this.player[msg.guildId]) {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Skip current track')
                    .setTimestamp()
                ]});
            this.player[msg.guildId].stop(true);
        }
    }
    viewQueue(msg) {
        if (this.queue[msg.guildId] && this.queue[msg.guildId].length > 0) {
            const queueString = this.queue[msg.guildId].map((item, index) => `\n[${index+1}] ${item.name}`).join();
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Current queue:')
                    .setDescription(queueString)
                    .setTimestamp()
                ]});
        } else {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('There\'s no track in queue')
                    .setDescription('.help for commands')
                ]});
        }
    }
    leave(msg) {
        if (this.connection[msg.guildId] && this.connection[msg.guildId].state.status === "ready") {
            if (this.queue.hasOwnProperty(msg.guildId)) {
                delete this.queue[msg.guildId];
                this.isPlaying[msg.guildId] = false;
            }
            this.connection[msg.guildId].destroy();
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('ヾ(￣▽￣)Bye~Bye~')
                    .setTimestamp()
                ]});
        } else {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('I\'m not in any channel')
                    .setDescription('.help for commands')
                    .setTimestamp()
                ]});
        }
    }
}
const bot = new Bot();
client.on('messageCreate', async (msg) => {
    if (msg.content.indexOf(`${prefix}p`) > -1) {
        if (msg.content === `${prefix}pause`){
        } else if (msg.member.voice.channel != null) {
            await bot.play(msg);
        } else {
            msg.channel.send({embeds:[new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Please join a channel first')
                    .setDescription('.help for commands')
                    .setTimestamp()
                ]});
        }
    }
    //.resume
    if (msg.content === `${prefix}resume`) {
        bot.resume(msg);
    }
    //.pause
    if (msg.content === `${prefix}pause`) {
        bot.pause(msg);
    }
    //.skip / .next
    if (msg.content === `${prefix}skip` || msg.content === `${prefix}next`) {
        bot.skip(msg);
    }
    //.queue
    if (msg.content === `${prefix}queue`) {
        bot.viewQueue(msg);
    }
    //.leave
    if (msg.content === `${prefix}leave` || msg.content === `${prefix}die`) {
        bot.leave(msg);
    }
    //.help
    if (msg.content === `${prefix}help`) {
        msg.channel.send({embeds:[new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('Commands:')
                .setDescription(
                    `${prefix}p - start playing music :D\n` +
                    `${prefix}resume - resume music from playing\n` +
                    `${prefix}pause - pause music from playing\n` +
                    `${prefix}skip - skip current track\n` +
                    `${prefix}queue - view queue\n` +
                    `${prefix}leave - make bot leave voice channel`)
                .setTimestamp()
            ]});
    }
});