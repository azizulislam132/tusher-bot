const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');
const handleCommand = require('./handle/handleCommand.js');
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan",
    adminID: ["61591564637714"]
};

const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));

// ইভেন্ট ফাইল লোড করা (Welcome & Leave)
const welcomeLeaveEvent = require('./scripts/events/welcomeLeave.js');

process.on('unhandledRejection', (reason) => console.log('⚠️ Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Ignored:', err?.message || err));

const badWords = ["গালি১", "গালি২", "খানকি", "মাদারচোদ", "চুদ", "বোকাচোদা", "বাল"];

function containsBadWords(text) {
    const cleanText = text.toLowerCase();
    return badWords.some(word => cleanText.includes(word));
}

function removeMentions(text) {
    if (!text) return "";
    return text.replace(/@[^\s]+/g, '').trim();
}

/**
 * মানুষের মতো টাইপিং ইফেক্ট দিয়ে মেসেজ পাঠানোর ফাংশন
 */
function sendHumanLikeMessage(api, messageText, threadID, replyToMessageID = null) {
    if (!messageText) return;

    try {
        // ১. টাইপিং স্ট্যাটাস চালু করা
        api.sendTypingIndicator(threadID, true, (err) => {
            if (err) console.log("⚠️ Typing Indicator Error:", err.message || err);

            // ২. লেখার সাইজ অনুযায়ী কিছুটা ডিলে (Delay) হিসেব করা (ন্যূনতম ১.৫ সেকেন্ড, সর্বোচ্চ ৪ সেকেন্ড)
            const typingDuration = Math.min(Math.max(messageText.length * 40, 1500), 4000);

            setTimeout(() => {
                // ৩. টাইপিং অফ করে মেসেজ পাঠানো
                api.sendTypingIndicator(threadID, false);
                api.sendMessage(messageText, threadID, replyToMessageID);
            }, typingDuration);
        });
    } catch (e) {
        console.log("❌ Catch Send Error:", e.message || e);
        // ব্যাকআপ হিসেবে সরাসরি পাঠানো যদি টাইপিং ডাইরেক্ট ফেইল করে
        api.sendMessage(messageText, threadID, replyToMessageID);
    }
}

const lastMessages = {};

function isQuestion(text) {
    const qKeywords = ["কী", "কি", "কার", "কেন", "কেনো", "কী জন্য", "কি জন্য", "কখন", "কোথায়", "কীভাবে", "আছিস", "আছো", "টাকা", "আছস", "আসেন"];
    return qKeywords.some(word => text.includes(word));
}

console.log("🔄 Tusher AI Bot (Human Typing Mode) চালু হচ্ছে...");

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

        // ১. ইভেন্ট হ্যান্ডলার (Welcome & Leave Event)
        if (event.type === "event") {
            try {
                welcomeLeaveEvent.onEvent({ api, event });
            } catch (e) {
                console.log("❌ Event Execution Error:", e.message || e);
            }
            return;
        }

        // ২. সাধারণ মেসেজ ও কমান্ড হ্যান্ডলার
        if (event.type === "message" || event.type === "message_reply") {
            
            // কমান্ড হ্যান্ডলার আগে চেক করবে
            const isCmdExecuted = handleCommand({ api, event });
            if (isCmdExecuted) return;

            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            if (senderID === botID) return;

            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const lowerBody = rawBody.toLowerCase();
            const lowerPrefix = config.prefix.toLowerCase();

            const isPrefixed = lowerBody.startsWith(lowerPrefix) || (event.mentions && Object.keys(event.mentions).includes(botID));

            let cleanBody = rawBody;
            if (lowerBody.startsWith(lowerPrefix)) {
                cleanBody = rawBody.slice(config.prefix.length).trim();
            } else {
                cleanBody = removeMentions(rawBody).trim();
            }
            const cleanBodyLower = cleanBody.toLowerCase();

            if (cleanBodyLower === "/") {
                const slashMsg = `🤖 Hello! I am ${config.botName}.\n\n` +
                                 `মেসেজ পাঠানোর জন্য /help লিখে সার্চ করুন অথবা সরাসরি আমার সাথে কথা বলতে প্রশ্ন করুন।`;
                return sendHumanLikeMessage(api, slashMsg, threadID, event.messageID);
            }

            if (cleanBodyLower === "/help" || cleanBodyLower === "help") {
                const helpMsg = `📖 **${config.botName} - Help Menu** 📖\n` +
                                `-----------------------------------\n` +
                                `🔹 **কথা শেখাতে:** teach প্রশ্ন = উত্তর\n` +
                                `🔹 **বটকে ডাকতে:** ${config.prefix} অথবা ট্যাগ দিন\n` +
                                `🔹 **কমান্ড মেনু:** /help\n` +
                                `-----------------------------------\n` +
                                `স্বাভাবিকভাবে মেসেজ লিখলে বট ডাটাবেজ থেকে ভেবে উত্তর দেবে!`;
                return sendHumanLikeMessage(api, helpMsg, threadID, event.messageID);
            }

            if (containsBadWords(rawBody)) {
                const roastReplies = [
                    "মুখটা একটু ভালো কর ভাই, সভ্য সমাজে আছিস!",
                    "গালি দিয়ে নিজের পার্সোনালিটি নষ্ট করিস না!",
                    "গালি দিলে কিন্তু সোজা ব্লক!"
                ];
                return sendHumanLikeMessage(api, roastReplies[Math.floor(Math.random() * roastReplies.length)], threadID, event.messageID);
            }

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

            if (db[cleanBodyLower]) {
                return sendHumanLikeMessage(api, db[cleanBodyLower], threadID, event.messageID);
            }

            if (isPrefixed && !cleanBodyLower) {
                return sendHumanLikeMessage(api, "হ্যাঁ ভাই, ডাকছিলেন? কিছু বলবেন?", threadID, event.messageID);
            }
        }
    });
});
