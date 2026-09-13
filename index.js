const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// 📁 ডাটাবেজ ফাইল
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan",
    adminID: ["61591564637714"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

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

// 🧠 শেষ চ্যাট হিস্ট্রি রাখার মেমোরি (Memory Cache)
const lastMessages = {};

// 🧠 প্রশ্ন চেনার লজিক (কী, কার, কেন, আছিস, টাকা ইত্যাদি)
function isQuestion(text) {
    const qKeywords = ["কী", "কি", "কার", "কেন", "কেনো", "কী জন্য", "কি জন্য", "কখন", "কোথায়", "কীভাবে", "আছিস", "আছো", "টাকা", "আছস", "আসেন"];
    return qKeywords.some(word => text.includes(word));
}

console.log("🔄 Self-Learning Conversational Bot চালুর প্রস্তুতি...");

login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Auto-Learning Smart Bot Active! ID: ${botID}`);

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
            if (senderID === botID) return;

            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            let cleanBody = removeMentions(rawBody).toLowerCase();

            // 🟢 ১. অটো-লার্নিং সিস্টেম (স্বয়ংক্রিয়ভাবে শেখা)
            // আগের মেসেজটি যদি প্রশ্ন হয়ে থাকে এবং বর্তমানেরটা উত্তর হয়
            if (lastMessages[threadID] && lastMessages[threadID].isQ && lastMessages[threadID].senderID !== senderID) {
                const prevQuestion = lastMessages[threadID].text;
                const currentAnswer = rawBody;

                // যদি এই প্রশ্নের কোনো উত্তর ডাটাবেজে না থাকে, তবে অটো সেভ করবে
                if (!db[prevQuestion] && currentAnswer.length > 1 && currentAnswer.length < 100) {
                    db[prevQuestion] = currentAnswer;
                    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
                    console.log(`🤖 [Auto-Learned] নতুন শেখা জোড়া: "${prevQuestion}" ➔ "${currentAnswer}"`);
                }
            }

            // বর্তমান মেসেজের স্টেট সেভ রাখা (পরের মেসেজ শেখার জন্য)
            lastMessages[threadID] = {
                text: cleanBody,
                isQ: isQuestion(cleanBody),
                senderID: senderID
            };

            // 🟢 ২. ডাটাবেজে আগে থেকে শেখানো উত্তর থাকলে সরাসরি সেটি দেবে
            if (db[cleanBody]) {
                return sendHumanLikeMessage(api, db[cleanBody], threadID, event.messageID);
            }

            // 🟢 ৩. ম্যানুয়াল টিচিং সাপোর্ট
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
        }
    });
});
