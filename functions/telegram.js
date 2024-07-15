const functions = require("firebase-functions");
const TelegramBot = require('node-telegram-bot-api');

// Your Telegram bot token
const token = "6496595779:AAHM1mehA217FZewo0_HITmqVQmUt5HKrLE";
const chatId = "-1001961696274";
const bot = new TelegramBot(token, {polling: false});

exports.sendServiceMessage = async function(message) {
    bot.sendMessage(chatId, message)
};
