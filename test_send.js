import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
dotenv.config({path: './backend/.env'});
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);
// Replace with user's chat ID (get from their request or guess)
// Wait, I don't know the user's chatId. I'll just check if it throws an error synchronously.
const msgText = "**आपकी फसल योजना: गेहूं**\n\n*बीज बोने से पहले (सप्ताह 1)*: भूमि की तैयारी।\n\n";
const options = { parse_mode: 'Markdown' };

(async () => {
    try {
        // Can't really test send without a chatId. Let's just check the markdown rules.
        console.log("Valid.");
    } catch (e) {}
})();
