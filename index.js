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
    prefix: "@M Tusher Khan",
    adminID: ["10008823902910"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

// Anti-Crash System
process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

// 🟢 ২. বানান ভুল হলেও মিল খুঁজে বের করার ফাংশন (Fuzzy Matching Algorithm)
function getSimilarity(s1, s2) {
    let longer = s1.length < s2.length ? s2 : s1;
    let shorter = s1.length < s2.length ? s1 : s2;
    let longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    
    // Levenshtein distance calculation
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return (longerLength - costs[s2.length]) / parseFloat(longerLength);
}

// উপযুক্ত উত্তর খুঁজে বের করার ফাংশন
function findBestReply(userText, db) {
    let bestMatchKey = null;
    let highestScore = 0;

    for (let key in db) {
        // ১. সরাসরি মিললে বা লেখার ভেতর পাওয়া গেলে
        if (userText === key || userText.includes(key) || key.includes(userText)) {
            return db[key];
        }

        // ২. বানান ভুল থাকলে মিলের শতাংশ হিসেব করা
        let similarity = getSimilarity(userText, key);
        if (similarity > highestScore) {
            highestScore = similarity;
            bestMatchKey = key;
        }
    }

    // যদি লেখার সাথে ডাটাবেজের কথা অন্তত ৬৫% মিলে যায়, তবে উত্তর দিয়ে দেবে
    if (highestScore >= 0.65 && bestMatchKey) {
        return db[bestMatchKey];
    }

    return null;
}

const lastMessages = new Map();

// ৩. ফেসবুক লগইন
console.log("🔄 বানান ভুল সহ বুঝতে পারা স্মার্ট বট চালু হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    console.log("✅ Smart Matching Bot is Active!");

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

            // 🟢 ১. কাস্টম প্রিফিক্স `@M Tusher Khan` টাইপ করলে
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

            // 🟢 ২. ভুল বানান বা কাছাকাছি শব্দ থেকে সেরা উত্তর খুঁজে বের করা
            const matchedReply = findBestReply(lowerBody, db);
            if (matchedReply) {
                return api.sendTypingIndicator(threadID, () => {
                    setTimeout(() => {
                        api.sendMessage({ body: matchedReply }, threadID, event.messageID);
                    }, 1500);
                });
            }

            // 🟢 ৩. নতুন কথা শেখা (Auto Learning System)
            if (lastMessages.has(threadID)) {
                const previousMsg = lastMessages.get(threadID);

                if (previousMsg && previousMsg.length > 2 && lowerBody.length > 1 && !previousMsg.startsWith("http")) {
                    if (!db[previousMsg]) {
                        db[previousMsg] = body;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        console.log(`🧠 অটো নতুন কথা শিখেছে: "${previousMsg}" = "${body}"`);
                    }
                }
            }

            lastMessages.set(threadID, lowerBody);
        }
    });
});
