// Sol's Stat Tracker Webhook Client - 個人過濾版
const WebSocket = require('ws');
const { WebhookClient, Events, EmbedBuilder } = require('discord.js');

// 引入設定檔
const config = require('./config');

const {
    token, webhookURL,
    overrideUsername, overrideAvatarURL, colors, emojis,
    gatewayURL, maxReconnectInterval, reconnectOnDuplicateConnection, verboseLogging
} = config;

let reconnectInterval = 31_000;
const webhookClient = new WebhookClient({ url: webhookURL });

webhookClient.on(Events.Error, (error) => {
    console.error(`ID: ${webhookClient.id} | Webhook client error: ${error.message}`);
});

const connect = () => {
    const ws = new WebSocket(gatewayURL, { headers: { token: token } });

    ws.on('open', () => {
        console.log(`ID: ${webhookClient.id} | WS client connected: ${gatewayURL}`);
        reconnectInterval = 31_000;
        if (verboseLogging) {
            const connectedEmbed = new EmbedBuilder()
                .setDescription(`${emojis.success} **Sol's Stat Tracker** - Connected`)
                .setColor(colors.success);
            webhookClient.send({ embeds: [connectedEmbed] });
        }
    });

    ws.on('message', (rawData) => {
        try {
            const parsedData = JSON.parse(rawData.toString('utf8'));

            switch (parsedData.action) {
                case 'executeWebhook':
                    // --- 過濾器：只發送包含你 ID/用戶名的訊息 ---
                    if (config.targetUserId && parsedData.data.embeds && parsedData.data.embeds[0]) {
                        const embedString = JSON.stringify(parsedData.data.embeds[0]);
                        // 檢查公告內容是否包含你的 ID (記得在 config.js 裡加引號)
                        if (!embedString.includes(config.targetUserId.toString())) {
                            return; 
                        }
                    }

                    parsedData.data.username = overrideUsername ?? parsedData.data.username;
                    parsedData.data.avatarURL = overrideAvatarURL ?? parsedData.data.avatarURL;
                    parsedData.data.allowedMentions = { parse: [] };
                    
                    // 發送整包數據以維持「格子」格式
                    webhookClient.send(parsedData.data);
                    break;
                    
                case 'enabled':
                    webhookClient.send({ embeds: [new EmbedBuilder().setDescription(`${emojis.success} **Sol's Stat Tracker** - Enabled`).setColor(colors.success)] });
                    break;
                case 'disabled':
                    webhookClient.send({ embeds: [new EmbedBuilder().setDescription(`${emojis.error} **Sol's Stat Tracker** - Disabled`).setColor(colors.error)] });
                    break;
            }
        } catch (error) {
            console.error(`ID: ${webhookClient.id} | WS client message error: ${error.message}`);
        }
    });

    ws.on('close', async (code, reason) => {
        console.warn(`ID: ${webhookClient.id} | WS client disconnected: Code ${code}`);
        if (code === 4002) return console.error('Token 錯誤，請檢查 config.js');
        setTimeout(connect, reconnectInterval);
        reconnectInterval = Math.min(maxReconnectInterval, reconnectInterval * 2);
    });

    ws.on('error', (error) => ws.terminate());
};

connect();
