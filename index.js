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

// অনর্থক বা ছোট কথা বাদ দেওয়ার ফিল্টার
const badWords = ["অহ তাই", "ওহ", "হুম", "ok", "hmm", "আহা", "হায়", "হ্যাঁ", "না", "ভালো তুমি?"];
const lastMessages = new Map();

console.log("🔄 অটো সেলফ-লার্নিং বট চালু হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Smart AI Active! Bot ID: ${botID}`);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkRead: true,
        listenTyping: true,
        updatePresence: true,
        forceLogin: true
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        if (event.type === "message" || event.type === "message_reply") {
            const body = event.body ? event.body.trim() : "";
            if (!body) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            const lowerBody = body.toLowerCase();
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            // বট নিজের মেসেজ ধরবে না
            if (senderID === botID) return;

            // ১. কাস্টম মেনশন প্রিফিক্স `@M Tusher Khan` দিলে উত্তর
            if (lowerBody === config.prefix.toLowerCase() || body.includes(config.prefix)) {
                const assistantReplies = [
                    "জি বলুন, কীভাবে সাহায্য করতে পারি? 😊",
                    "হুম বলুন, শুনছি।",
                    "জি বলুন, কি বলতে চান?"
                ];
                const randomReply = assistantReplies[Math.floor(Math.random() * assistantReplies.length)];

                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: randomReply }, threadID, event.messageID);
                    }, 1200);
                });
            }

            // ২. ডাটাবেজে সঠিক উত্তর মিললে রিপ্লাই দেবে
            if (db[lowerBody]) {
                const replyText = db[lowerBody];
                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: replyText }, threadID, event.messageID);
                    }, 1500);
                });
            }

            // 🟢 ৩. নিখুঁত অটো-লার্নিং লজিক (Reply Message Learning)
            // কেউ নির্দিষ্ট মেসেজে Reply দিলে কেবল তখনই শিখবে (ভুল শেখার সম্ভাবনা ০%)
            if (event.type === "message_reply" && event.messageReply) {
                const replyToMsg = event.messageReply.body ? event.messageReply.body.trim().toLowerCase() : "";
                
                // নিজের পাঠানো কথার রিপ্লাই হলে বা ফালতু কথা হলে শিখবে না
                if (event.messageReply.senderID !== botID && replyToMsg.length > 3 && lowerBody.length > 2 && !badWords.includes(lowerBody)) {
                    if (!db[replyToMsg]) {
                        db[replyToMsg] = body;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        console.log(`🧠 সঠিকভাবে নতুন শেখা হয়েছে: "${replyToMsg}" = "${body}"`);
                    }
                }
            }

            lastMessages.set(threadID, lowerBody);
        }
    });
});
