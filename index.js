const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
}

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan",
    adminID: ["61591564637714"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

const badWords = ["অহ তাই", "ওহ", "হুম", "ok", "hmm", "আহা", "হায়", "হ্যাঁ", "না"];

// ট্যাগ বা মেনশন বাদ দেওয়ার ফাংশন
function removeMentions(text) {
    if (!text) return "";
    return text.replace(/@[^\s]+/g, '').trim();
}

// 🎭 মানুষের মতো টাইপিং করার ফাংশন
function sendHumanLikeMessage(api, messageText, threadID, replyToMessageID) {
    const textLength = messageText.length;
    let typingTime = Math.min(Math.max(textLength * 60, 1200), 3500);

    api.sendTypingIndicator(threadID, (err) => {
        if (err) console.log("Typing indicator warning ignored.");
    });

    setTimeout(() => {
        api.sendMessage(messageText, threadID, replyToMessageID);
    }, typingTime);
}

console.log("🔄 বটের মেসেজে রিপ্লাই সাপোর্টসহ আপডেট বট চালু হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Smart Human Bot Active! Bot ID: ${botID}`);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkRead: true,
        updatePresence: true,
        forceLogin: true
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        if (event.type === "message" || event.type === "message_reply") {
            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            // বট নিজের অটো-মেসেজ প্রসেস করবে না
            if (senderID === botID) return;

            let cleanBody = removeMentions(rawBody).toLowerCase();

            // 🟢 ১. শুধু ট্যাগ বা মেনশন দিলে উত্তর
            if (rawBody.toLowerCase() === config.prefix.toLowerCase() || cleanBody === "") {
                const assistantReplies = [
                    "জি বলুন, কীভাবে সাহায্য করতে পারি? 😊",
                    "হুম বলুন, শুনছি।",
                    "জি বলুন, কি বলতে চান?"
                ];
                const randomReply = assistantReplies[Math.floor(Math.random() * assistantReplies.length)];
                return sendHumanLikeMessage(api, randomReply, threadID, event.messageID);
            }

            // 🟢 ২. ডাটাবেজে উত্তর মিললে সরাসরি মানুষের মতো টাইপ করে মেসেজ দেওয়া
            if (db[cleanBody]) {
                return sendHumanLikeMessage(api, db[cleanBody], threadID, event.messageID);
            }

            // 🟢 ৩. মেসেজে রিপ্লাই (Quote Reply) দিলে কীভাবে রেসপন্স করবে
            if (event.type === "message_reply" && event.messageReply) {
                const replyToSender = event.messageReply.senderID;
                const replyToMsg = event.messageReply.body ? event.messageReply.body.trim() : "";
                const cleanReplyTo = removeMentions(replyToMsg).toLowerCase();

                // (ক) ইউজার যদি বটের মেসেজে রিপ্লাই দিয়ে কিছু জিজ্ঞেস করে এবং ডাটাবেজে উত্তর থাকে
                if (replyToSender === botID && db[cleanBody]) {
                    return sendHumanLikeMessage(api, db[cleanBody], threadID, event.messageID);
                }

                // (খ) ইউজাররা নিজেদের মধ্যে বা অন্য কারও কথার রিপ্লাই দিয়ে শেখালে
                if (replyToSender !== botID && replyToMsg.length > 2 && cleanBody.length > 2 && !badWords.includes(cleanBody)) {
                    if (cleanReplyTo && !db[cleanReplyTo]) {
                        db[cleanReplyTo] = rawBody;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        console.log(`🧠 নতুন উত্তর সেভ হয়েছে: "${cleanReplyTo}" = "${rawBody}"`);
                    }
                }
            }
        }
    });
});
