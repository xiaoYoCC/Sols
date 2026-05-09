const WebSocket = require('ws');
const { WebhookClient, Events, EmbedBuilder } = require('discord.js');
const {
    token, webhookURL, overrideUsername, overrideAvatarURL, colors, emojis,
    gatewayURL, maxReconnectInterval, reconnectOnDuplicateConnection, verboseLogging
} = require('./config');

const webhookClient = new WebhookClient({ url: webhookURL });

const connect = () => {
    const ws = new WebSocket(gatewayURL, { headers: { token: token } });

    ws.on('message', (rawData) => {
        try {
            const parsedData = JSON.parse(rawData.toString('utf8'));
            if (parsedData.action === 'executeWebhook') {
                // 這裡直接判斷內容有沒有你的名字，最簡單暴力且有效
                if (parsedData.data.embeds && parsedData.data.embeds[0]) {
                    const content = JSON.stringify(parsedData.data.embeds[0]);
                    if (!content.includes("alananjocarrie")) return;
                }
                parsedData.data.username = overrideUsername ?? parsedData.data.username;
                parsedData.data.avatarURL = overrideAvatarURL ?? parsedData.data.avatarURL;
                parsedData.data.allowedMentions = { parse: [] };
                webhookClient.send(parsedData.data);
            }
        } catch (e) {}
    });

    ws.on('close', () => setTimeout(connect, 30000));
    ws.on('error', () => ws.terminate());
};
connect();
