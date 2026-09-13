const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// 📁 ডাটাবেজ ফাইল
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan", // আপনার কাঙ্ক্ষিত প্রিফিক্স
    adminID: ["61591564637714"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

// 🚫 গালিগালাজ ফিল্টার লিস্ট
const badWords = ["গালি১", "গালি২", "খানকি", "মাদারচোদ", "চুদ", "বোকাচোদা", "বাল"];

function containsBadWords(text) {
    const cleanText = text.toLowerCase();
    return badWords.some(word => cleanText.includes(word));
}

function removeMentions(text) {
    if (!text) return "";
    return text.replace(/@[^\s]+/g, '').trim();
}

// 🎭 টাইপিং ইফেক্ট
function sendHumanLikeMessage(api, messageText, threadID, replyToMessageID = null, mentions = []) {
    const textLength = messageText.length;
    let typingTime = Math.min(Math.max(textLength * 40, 800), 2000);

    try { api.sendTypingIndicator(threadID, () => {}); } catch (e) {}

    setTimeout(() => {
        api.sendMessage({ body: messageText, mentions: mentions }, threadID, replyToMessageID);
    }, typingTime);
}

// 🧠 মেমোরি ক্যাশ
const lastMessages = {};

// 🧠 প্রশ্ন ডিটেকশন
function isQuestion(text) {
    const qKeywords = ["কী", "কি", "কার", "কেন", "কেনো", "কী জন্য", "কি জন্য", "কখন", "কোথায়", "কীভাবে", "আছিস", "আছো", "টাকা", "আছস", "আসেন"];
    return qKeywords.some(word => text.includes(word));
}

console.log("🔄 Auto-Learning Bot (Fixed Prefix) চালুর প্রস্তুতি...");

login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Smart Bot Active! ID: ${botID}`);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkRead: true,
        updatePresence: true,
        forceLogin: true,
        listenTyping: false
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        if (event.type === "message" || event.type === "message_reply") {
            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            if (senderID === botID) return;

            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const lowerBody = rawBody.toLowerCase();
            const lowerPrefix = config.prefix.toLowerCase();

            // 📌 Check if the bot is mentioned or prefixed
            const isPrefixed = lowerBody.startsWith(lowerPrefix) || (event.mentions && Object.keys(event.mentions).includes(botID));

            // Prefix বা Mention থাকলে সেটা কেটে পরিষ্কার মেসেজ বের করা
            let cleanBody = rawBody;
            if (lowerBody.startsWith(lowerPrefix)) {
                cleanBody = rawBody.slice(config.prefix.length).trim();
            } else {
                cleanBody = removeMentions(rawBody).trim();
            }
            const cleanBodyLower = cleanBody.toLowerCase();

            // 🛡️ গালি দিলে ফিল্টার
            if (containsBadWords(rawBody)) {
                const roastReplies = [
                    "মুখটা একটু ভালো কর ভাই, সভ্য সমাজে আছিস!",
                    "গালি দিয়ে নিজের পার্সোনালিটি নষ্ট করিস না!",
                    "গালি দিলে কিন্তু সোজা ব্লক!"
                ];
                return sendHumanLikeMessage(api, roastReplies[Math.floor(Math.random() * roastReplies.length)], threadID, event.messageID);
            }

            // 🟢 ১. অটো-লার্নিং (গালি ছাড়া সেভ হবে)
            if (lastMessages[threadID] && lastMessages[threadID].isQ && lastMessages[threadID].senderID !== senderID) {
                const prevQuestion = lastMessages[threadID].text;
                const currentAnswer = rawBody;

                if (!db[prevQuestion] && !containsBadWords(prevQuestion) && currentAnswer.length > 1 && currentAnswer.length < 100) {
                    db[prevQuestion] = currentAnswer;
                    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                    console.log(`🤖 [Auto-Learned] সেভ হয়েছে: "${prevQuestion}" ➔ "${currentAnswer}"`);
                }
            }

            lastMessages[threadID] = {
                text: cleanBodyLower,
                isQ: isQuestion(cleanBodyLower),
                senderID: senderID
            };

            // 🟢 ২. ম্যানুয়াল টিচিং (teach প্রশ্ন = উত্তর)
            if (cleanBodyLower.startsWith("teach ")) {
                const inputContent = cleanBody.slice(6).trim();
                const splitData = inputContent.split("=");

                if (splitData.length >= 2) {
                    const question = splitData[0].toLowerCase().trim();
                    const answer = splitData.slice(1).join("=").trim();

                    if (question && answer) {
                        db[question] = answer;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                        return sendHumanLikeMessage(api, `✅ সেভ করে নিলাম ভাই!\n\nপ্রশ্ন: ${question}\nউত্তর: ${answer}`, threadID, event.messageID);
                    }
                }
            }

            // 🟢 ৩. ডাটাবেজ থেকে ম্যাচড উত্তর থাকলে রিপ্লাই দেবে
            if (db[cleanBodyLower]) {
                return sendHumanLikeMessage(api, db[cleanBodyLower], threadID, event.messageID);
            }

            // 🟢 ৪. যদি শুধু Prefix দিয়ে কল করা হয় (যেমন: @M Tusher Khan)
            if (isPrefixed && !cleanBodyLower) {
                return sendHumanLikeMessage(api, "হ্যাঁ ভাই, ডাকছিলেন? কিছু বলবেন?", threadID, event.messageID);
            }
        }
    });
});
