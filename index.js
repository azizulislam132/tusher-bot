const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// ১. ডাটাবেস ও কনফিগ লোড
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
}

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan", // আপনার কাস্টম প্রিফিক্স
    adminID: ["10008823902910"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

// Anti-Crash System
process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

// মেসেজের ইতিহাস মনে রাখার জন্য মেমোরি (অটো-লার্নিং এর জন্য)
const lastMessages = new Map();

// ২. ফেসবুক লগইন
console.log("🔄 হিউম্যান অ্যাসিস্ট্যান্ট বট চালু হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    console.log("✅ Smart Human AI Bot is Active!");

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
            const lowerBody = body.toLowerCase();
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            // 🟢 ১. কেউ যদি কাস্টম প্রিফিক্স `@M Tusher Khan` টাইপ করে
            if (lowerBody === config.prefix.toLowerCase()) {
                const assistantReplies = [
                    "জি বলুন, কীভাবে সাহায্য করতে পারি? 😊",
                    "হুম বলুন, শুনছি।",
                    "জি বলুন, কি বলতে চান?",
                    "ডাকলেন? বলুন কি অবস্থা?"
                ];
                const randomReply = assistantReplies[Math.floor(Math.random() * assistantReplies.length)];

                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: randomReply }, threadID, event.messageID);
                    }, 1200);
                });
            }

            // 🟢 ২. ডাটাবেজে আগে থেকে শেখা কোনো কথা থাকলে মানুষের মতো উত্তর দেওয়া
            if (db[lowerBody]) {
                const replyText = db[lowerBody];
                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: replyText }, threadID, event.messageID);
                    }, 1500);
                });
            }

            // 🟢 ৩. অটো সেলফ-লার্নিং (গ্রুপে নতুন কথা শুনলে স্বয়ংক্রিয়ভাবে শেখা)
            if (lastMessages.has(threadID)) {
                const previousMsg = lastMessages.get(threadID);

                // লিংক বা খুব ছোট কথা সেভ করবে না
                if (previousMsg && previousMsg.length > 2 && lowerBody.length > 1 && !previousMsg.startsWith("http")) {
                    if (!db[previousMsg]) {
                        db[previousMsg] = body; // স্বয়ংক্রিয়ভাবে সেভ হবে
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        console.log(`🧠 অটো নতুন কথা সেভ হয়েছে: "${previousMsg}" = "${body}"`);
                    }
                }
            }

            // বর্তমান কথাটি সেভ করে রাখা যাতে পরের রিপ্লাইকে উত্তর বানানো যায়
            lastMessages.set(threadID, lowerBody);
        }
    });
});
