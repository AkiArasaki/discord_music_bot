const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
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
let connection = null;
let player = createAudioPlayer();
let queue = [];
let isPlaying = false;
let resourceMsg;
client.on('messageCreate', async msg => {
    //contain .p
    if (msg.content.indexOf(`${prefix}p`) > -1) {
        if (connection == null || connection.state.status === "destroyed") {
            if (msg.member.voice.channel != null) {
                connection = joinVoiceChannel({
                    channelId: msg.member.voice.channel.id,
                    guildId: msg.guild.id,
                    adapterCreator: msg.guild.voiceAdapterCreator
                });
                connection.subscribe(player);
	            resourceMsg = msg;
            } else {
                msg.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#E74C3C')
                            .setTitle('Please join a channel first')
                            .setDescription('.help for commands')
                    ]
                });
            }
        }
        const musicURL = msg.content.replace(`${prefix}p`, '').trim();
        try {
            const res = await ytdl.getInfo(musicURL);
            const info = res.videoDetails;
            queue.push({
                queuedMsg: msg,
                name: info.title,
                url: musicURL
            })
            if (isPlaying) {
                msg.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#3498DB')
                            .setTitle('Track queued:')
                            .setDescription(info.title)
                            .setURL(musicURL)
                            .setTimestamp()
                    ]
                });
            } else {
                isPlaying = true;
                msg.channel.send({embeds: [
                    new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('Now playing:')
                        .setDescription(queue[0].name)
                        .setURL(queue[0].url)
                        .setTimestamp()
                    ]});
                player.play(createAudioResource(ytdl(queue[0].url, { filter: 'audioonly' })));
                queue.shift();
            }
        } catch(e) {
            console.log(e);
        }
    }
    //.resume
    if (msg.content === `${prefix}resume`) {
        if (player) {
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Resume playing')
                    .setTimestamp()
                ]});
            player.unpause();
        }
    }
    //.pause
    if (msg.content === `${prefix}pause`) {
        if (player) {
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Pause playing')
                    .setTimestamp()
                ]});
            player.pause();
        }
    }
    //.skip / .next
    if (msg.content === `${prefix}skip` || msg.content === `${prefix}next`) {
        if (player) {
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Skip current track')
                    .setTimestamp()
                ]});
            player.stop(true);
        }
    }
    //.queue
    if (msg.content === `${prefix}queue`) {
        if (queue && queue.length > 0) {
            const queueString = queue.map((item, index) => `\n[${index+1}] ${item.name}`).join();
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Current queue:')
                    .setDescription(queueString)
                    .setTimestamp()
                ]});
        } else {
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('There\'s no track in queue')
                    .setDescription('.help for commands')
                ]});
        }
    }
    //.leave
    if (msg.content === `${prefix}leave` || msg.content === `${prefix}die`) {
        if (connection != null && connection.state.status !== "destroyed") {
            connection.destroy();
            player.stop();
            queue = [];
            isPlaying = false;
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('ヾ(￣▽￣)Bye~Bye~')
                ]});
        } else {
            msg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('I\'m not in any channel')
                    .setDescription('.help for commands')
                ]});
        }
    }
    //.help
    if (msg.content === `${prefix}help`) {
        msg.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Commands:')
                    .setDescription(
                        `${prefix}p - start playing music :D\n` +
                        `${prefix}resume - resume music from playing\n` +
                        `${prefix}pause - pause music from playing\n` +
                        `${prefix}skip - skip current track\n` +
                        `${prefix}queue - view queue\n` +
                        `${prefix}leave - make bot leave voice channel`
                    )
            ]
        });
    }
    //.server
    if (msg.content === `${prefix}server`) {
        msg.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#50C878')
                    .setTitle('Server info:')
                    .setDescription(
                        'Server IP: AkiArasaki.aternos.me\n' +
                        'Latest mod pack: https://drive.google.com/file/d/1fz8-d2WO6oYY5Oa9jsC3hXECCdpYgQvR/view?usp=sharing'
                    )
            ]
        });
    }
})
//continue playing if there are still tracks in queue
player.on("idle", () => {
    if (queue.length > 0) {
        queue[0].queuedMsg.channel.send({embeds: [
                new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Now playing:')
                    .setDescription(queue[0].name)
                    .setURL(queue[0].url)
                    .setTimestamp()
            ]});
        resource = createAudioResource(ytdl(queue[0].url, { filter: 'audioonly' }));
        player.play(resource);
        queue.shift();
    } else {
        if (isPlaying === true) {
            isPlaying = false;
            resourceMsg.channel.send({embeds: [
                    new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('End of queue')
                        .setDescription('.help for commands')
                        .setTimestamp()
                ]});
            connection.destroy();
        }
    }
});