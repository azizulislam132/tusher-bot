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
    adminID: ["10008823902910"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

const badWords = ["অহ তাই", "ওহ", "হুম", "ok", "hmm", "আহা", "হায়", "হ্যাঁ", "না"];

console.log("🔄 পারফেক্ট ফিল্টারসহ বট চালু হচ্ছে...");
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
            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            // ১. বট নিজের পাঠানো কোনো বার্তা প্রসেস করবে না
            if (senderID === botID) return;

            // ট্যাগ বাদ দিয়ে আসল টেক্সট বের করা
            let cleanBody = rawBody.replace(new RegExp(config.prefix, 'gi'), '').trim().toLowerCase();

            // ২. যদি ইউজার শুধু নাম ধরে ডাকে বা শুধু ট্যাগ দেয়
            if (rawBody.toLowerCase() === config.prefix.toLowerCase() || cleanBody === "") {
                const assistantReplies = [
                    "জি বলুন, কীভাবে সাহায্য করতে পারি? 😊",
                    "হুম বলুন, শুনছি।",
                    "জি বলুন, কি বলতে চান?"
                ];
                const randomReply = assistantReplies[Math.floor(Math.random() * assistantReplies.length)];

                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: randomReply }, threadID, event.messageID);
                    }, 1000);
                });
            }

            // ৩. ডাটাবেজে উত্তর থাকলে উত্তর দেওয়া
            if (db[cleanBody]) {
                const replyText = db[cleanBody];
                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: replyText }, threadID, event.messageID);
                    }, 1200);
                });
            }

            // 🟢 ৪. স্মার্ট অটো-লার্নিং লজিক (Reply Learning)
            // কেউ কোনো নির্দিষ্ট মেসেজে রিপ্লাই দিয়ে উত্তর দিলে বট শিখবে
            if (event.type === "message_reply" && event.messageReply) {
                const replyToSender = event.messageReply.senderID;
                const replyToMsg = event.messageReply.body ? event.messageReply.body.trim().toLowerCase() : "";
                
                // বটের নিজের কথার রিপ্লাই দিলে বা ছোট অনর্থক কথা হলে শিখবে না
                if (replyToSender !== botID && replyToMsg.length > 2 && cleanBody.length > 2 && !badWords.includes(cleanBody)) {
                    // মূল মেসেজটি ট্যাগমুক্ত করে সেভ করা
                    const cleanReplyTo = replyToMsg.replace(new RegExp(config.prefix, 'gi'), '').trim();
                    
                    if (cleanReplyTo && !db[cleanReplyTo]) {
                        db[cleanReplyTo] = rawBody;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        console.log(`🧠 নতুন সঠিক উত্তর শেখা হয়েছে: "${cleanReplyTo}" = "${rawBody}"`);
                    }
                }
            }
        }
    });
});
