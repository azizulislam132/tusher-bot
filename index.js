const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// 📁 ডাটাবেজ ফাইল সেটআপ
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
}

// ⚙️ বট কনফিগারেশন
const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan",
    adminID: ["10008823902910"] // আপনার FB ID
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

// 🛡️ এরর হ্যান্ডলিং (বট ক্র্যাশ হওয়া ঠেকাতে)
process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

// 🧹 মেনশন রিমুভ করার হেলপার
function removeMentions(text) {
    if (!text) return "";
    return text.replace(/@[^\s]+/g, '').trim();
}

// 🎭 টাইপিং ইফেক্ট (মানুষের মতো একটু সময় নিয়ে উত্তর দেওয়ার জন্য)
function sendHumanLikeMessage(api, messageText, threadID, replyToMessageID = null, mentions = []) {
    const textLength = messageText.length;
    let typingTime = Math.min(Math.max(textLength * 40, 800), 2000);

    try { api.sendTypingIndicator(threadID, () => {}); } catch (e) {}

    setTimeout(() => {
        api.sendMessage({ body: messageText, mentions: mentions }, threadID, replyToMessageID);
    }, typingTime);
}

// 🧠 মানুষের মতো প্রশ্ন ও শব্দ ডিটেক্ট করে উত্তর বের করার স্মার্ট ফাংশন
function getHumanResponse(text) {
    const cleanText = text.toLowerCase();

    // ১. "কেন" বা "কী জন্য" সংক্রান্ত প্রশ্ন
    if (cleanText.includes("কেন") || cleanText.includes("কেনো") || cleanText.includes("কী জন্য") || cleanText.includes("কি জন্য")) {
        const replies = [
            "কেন আবার? এমনি!",
            "কারণটা পরে বলবানি ভাই, এখন চুপ থাক।",
            "সব কিছুতে এত 'কেন' খুঁজিস কেন বল তো?",
            "দরকার আছে ভাই, এমনি এমনি কি আর বলছি!"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // ২. "কার" সংক্রান্ত প্রশ্ন
    if (cleanText.includes("কার") || cleanText.includes("কাকে")) {
        const replies = [
            "কার আবার? যার হওয়ার কথা তারই!",
            "আমার তো না ভাই, তোদের কারও হবে হয়তো।",
            "যারই হোক, আমাদের কী ভাই?"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // ৩. "কী" বা "কি" সংক্রান্ত প্রশ্ন
    if (cleanText.includes("কী") || cleanText.includes("কি")) {
        // বিশেষ কেস: টাকা চাওয়া
        if (cleanText.includes("টাকা") && (cleanText.includes("দে") || cleanText.includes("দিবি"))) {
            return "কিসের টাকা দেব ভাই? আমার কাছে তো কোনো টাকা নাই!";
        }
        const replies = [
            "কী আবার? কিছুই না!",
            "আরে কিছু না ভাই, তুই কাজের কথা বল।",
            "কী হইছে এত জেনে কী করবি?",
            "হুম বলো, শুনছি।"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // ৪. লেনদেন বা নেওয়া/দেওয়া সংক্রান্ত শব্দ (নিলাম, নিছি, দিলাম, দিছি)
    if (cleanText.includes("নিলাম") || cleanText.includes("নিছি")) {
        const replies = [
            "কখন নিলি? আমারে তো জানালি না!",
            "আচ্ছা ঠিক আছে, হিসাব রাখিস কিন্তু!",
            "নিছিস তো ভালো করেছিস।"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    if (cleanText.includes("দিলাম") || cleanText.includes("দিছি")) {
        const replies = [
            "কাকে দিলি ভাই?",
            "ঠিক আছিস, দিলে তো ভালোই হলো।",
            "আমারেও কিছু দিস মাঝে মধ্যে!"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // ৫. খাওয়া-দাওয়া বা খোঁজখবর (খাইছিস, খাইছো, খবর)
    if (cleanText.includes("খাইছিস") || cleanText.includes("খাইছো") || cleanText.includes("খাইছস")) {
        return "হ্যাঁ ভাই খাইছি, তুই খাইছিস?";
    }

    if (cleanText.includes("কেমন আছিস") || cleanText.includes("কেমন আছেন") || cleanText.includes("কী খবর") || cleanText.includes("কি খবর")) {
        return "আলহামদুলিল্লাহ ভাই একদম বিন্দাস! তোর কী খবর?";
    }

    // ৬. সাধারণ "দে" বা "দিবি" সংক্রান্ত শব্দ
    if (cleanText.includes("দে") || cleanText.includes("দিবি")) {
        return "কী দেব ভাই? বুঝিয়ে বল!";
    }

    return null; // কোনো প্যাটার্ন না মিললে null রিটার্ন করবে
}

console.log("🔄 স্মার্ট হিউম্যান বটের কোড চালুর প্রস্তুত...");

login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Smart Human-Like Bot Active! ID: ${botID}`);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkRead: true,
        updatePresence: true,
        forceLogin: true
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        // 🟢 ১. নতুন মেম্বার জয়েন করলে ওয়েলকাম জানানো
        if (event.logMessageType === "log:subscribe") {
            const addedParticipants = event.logMessageData.addedParticipants;
            for (let member of addedParticipants) {
                if (member.userFbId !== botID) {
                    const welcomeMsg = `ওয়েলকাম টু গ্রুপ ${member.fullName}! সবাই মিলে ভালো থাকো 😉`;
                    const mentions = [{ tag: member.fullName, id: member.userFbId }];
                    sendHumanLikeMessage(api, welcomeMsg, event.threadID, null, mentions);
                }
            }
        }

        // 🟢 ২. ইনকামিং মেসেজ প্রসেসিং
        if (event.type === "message" || event.type === "message_reply") {
            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            if (senderID === botID) return;

            const isAdmin = config.adminID.includes(senderID);
            let cleanBody = removeMentions(rawBody).toLowerCase();

            // 🟢 ৩. ম্যানুয়াল টিচিং কমান্ড (teach প্রশ্ন = উত্তর)
            if (cleanBody.startsWith("teach ")) {
                const inputContent = rawBody.slice(6).trim();
                const splitData = inputContent.split("=");

                if (splitData.length >= 2) {
                    const question = removeMentions(splitData[0]).toLowerCase().trim();
                    const answer = splitData.slice(1).join("=").trim();

                    if (question && answer) {
                        db[question] = answer;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        return sendHumanLikeMessage(api, `✅ সেভ করে নিলাম ভাই!\n\nপ্রশ্ন: ${question}\nউত্তর: ${answer}`, threadID, event.messageID);
                    }
                }
            }

            // 🟢 ৪. ডাটাবেজে (`database.json`) শেখানো উত্তর থাকলে আগে দেবে
            if (db[cleanBody]) {
                return sendHumanLikeMessage(api, db[cleanBody], threadID, event.messageID);
            }

            // 🟢 ৫. স্মার্ট হিউম্যান কি-ওয়ার্ড লজিক চেক করা (কী, কার, কেন, নিলাম, দিলাম ইত্যাদি)
            const humanResponse = getHumanResponse(rawBody);
            if (humanResponse) {
                return sendHumanLikeMessage(api, humanResponse, threadID, event.messageID);
            }

            // 🟢 ৬. বটকে মেনশন করলে বা প্রফিফিক্স ব্যবহার করলে ডিফল্ট ফ্রেন্ডলি উত্তর
            if (rawBody.toLowerCase().includes(config.prefix.toLowerCase())) {
                const defaultReplies = [
                    "হ্যাঁ ভাই, ডাকছিলেন?",
                    "বলেন ভাই, শুনছি!",
                    "কী খবর তুষার ভাইয়ের বন্ধু?"
                ];
                const reply = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
                return sendHumanLikeMessage(api, reply, threadID, event.messageID);
            }
        }
    });
});
