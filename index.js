const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔑 আপনার Gemini API Key এখানে দিন
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6Legf-naM51bsKHrGiqVMjZRKwYecUzEdtyKdjGpwxrbw");
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
}

const config = { 
    botName: "Tusher AI", 
    prefix: "@M Tusher Khan",
    adminID: ["61591564637714"] // আপনার ফেসবুক আইডির সঠিক UID দিন
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
    let typingTime = Math.min(Math.max(textLength * 50, 1000), 2500);

    api.sendTypingIndicator(threadID, () => {});

    setTimeout(() => {
        api.sendMessage({ body: messageText, mentions: mentions }, threadID, replyToMessageID);
    }, typingTime);
}

// 🤖 AI প্রম্পট (অ্যাডমিনের কথা শোনা ও অন্যকে জ্বালাতন করার লজিক)
async function askAI(userMessage, targetName = "", mode = "normal") {
    try {
        let prompt = "";
        
        if (mode === "roast") {
            prompt = `তুমি তুষার (অ্যাডমিন)-এর বিশ্বস্ত রোবট বন্ধু। তুষার তোমাকে আদেশ দিয়েছে "${targetName}" নামের ফ্রেন্ডকে একটু জ্বালাতন বা পঁচাতে। 
তুমি "${targetName}"-কে উদ্দেশ্য করে ১-২ লাইনে খুব মজার এবং হালকা ফানি পঁচানি দাও (কোনো গালিগালাজ বা খারাপ ভাষা ব্যবহার করবে না, কিন্তু যেন পঁচানো হয়)।`;
        } else {
            prompt = `তুমি তুষারের তৈরি করা একজন সাধারণ বন্ধু। বন্ধুদের সাথে স্বাভাবিক ১ লাইনের চ্যাট করো। 
মেসেজ: "${userMessage}"`;
        }

        const result = await aiModel.generateContent(prompt);
        return result.response.text().trim();
    } catch (err) {
        return "ধুর ভাই, এখন মেজাজ খারাপ! পরে কথা বলি।";
    }
}

console.log("🔄 অ্যাডমিন বশীকরণ ও ট্রোলিং বট চালু হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ:", err);

    const botID = api.getCurrentUserID();
    console.log(`✅ Admin Control Bot Active! ID: ${botID}`);

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkRead: true,
        updatePresence: true,
        forceLogin: true
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        // 🟢 ১. নতুন মেম্বার যুক্ত হলে ওয়েলকাম
        if (event.logMessageType === "log:subscribe") {
            const addedParticipants = event.logMessageData.addedParticipants;
            for (let member of addedParticipants) {
                if (member.userFbId !== botID) {
                    const welcomeMsg = `ওয়েলকাম টু গ্রুপ ${member.fullName}! আমাদের অ্যাডমিন সাহেবের নির্দেশ মেনে চলবেন, নয়তো পঁচানি খেতে হবে! 😉`;
                    const mentions = [{ tag: member.fullName, id: member.userFbId }];
                    sendHumanLikeMessage(api, welcomeMsg, event.threadID, null, mentions);
                }
            }
        }

        // 🟢 ২. মেসেজ প্রসেসিং
        if (event.type === "message" || event.type === "message_reply") {
            const rawBody = event.body ? event.body.trim() : "";
            if (!rawBody) return;

            const threadID = event.threadID;
            const senderID = event.senderID;
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

            if (senderID === botID) return;

            const isAdmin = config.adminID.includes(senderID);
            let cleanBody = removeMentions(rawBody).toLowerCase();

            // 👑 ৩. অ্যাডমিন কমান্ড: "একে জ্বালাও" বা "একে পঁচাও"
            if (isAdmin && (cleanBody.includes("একে জ্বালাও") || cleanBody.includes("একে পঁচাও") || cleanBody.includes("roast"))) {
                let targetID = null;
                let targetName = "বন্ধুটি";

                // (ক) যদি কারো মেসেজে রিপ্লাই দিয়ে বলেন "একে জ্বালাও"
                if (event.type === "message_reply" && event.messageReply) {
                    targetID = event.messageReply.senderID;
                } 
                // (খ) যদি কাউকে মেনশন করে বলেন
                else if (Object.keys(event.mentions).length > 0) {
                    targetID = Object.keys(event.mentions)[0];
                    targetName = event.mentions[targetID];
                }

                if (targetID) {
                    askAI(rawBody, targetName, "roast").then(roastMsg => {
                        const mentions = [{ tag: targetName, id: targetID }];
                        sendHumanLikeMessage(api, roastMsg, threadID, event.messageID, mentions);
                    });
                    return;
                } else {
                    return sendHumanLikeMessage(api, "বস, কাকে জ্বালাতে হবে তার মেসেজে রিপ্লাই দিন অথবা তাকে মেনশন করুন!", threadID, event.messageID);
                }
            }

            // 🟢 ৪. ম্যানুয়াল টিচিং (teach প্রশ্ন = উত্তর)
            if (cleanBody.startsWith("teach ")) {
                const inputContent = rawBody.slice(6).trim();
                const splitData = inputContent.split("=");

                if (splitData.length >= 2) {
                    const question = removeMentions(splitData[0]).toLowerCase().trim();
                    const answer = splitData.slice(1).join("=").trim();

                    if (question && answer) {
                        db[question] = answer;
                        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); // ডাটাবেজে সেভ
                        return sendHumanLikeMessage(api, `✅ বস, সেভ করে নিয়েছি!\n\nপ্রশ্ন: ${question}\nউত্তর: ${answer}`, threadID, event.messageID);
                    }
                }
            }

            // 🟢 ৫. ডাটাবেজে আগে থেকে থাকলে ডাটাবেজ থেকে উত্তর দেবে
            if (db[cleanBody]) {
                return sendHumanLikeMessage(api, db[cleanBody], threadID, event.messageID);
            }

            // 🟢 ৬. মেনশন করলে বা স্বাভাবিক কথা বললে AI মানুষের মতো উত্তর দেবে
            if (rawBody.toLowerCase().includes(config.prefix.toLowerCase()) || cleanBody !== "") {
                askAI(rawBody).then(aiReply => {
                    if (aiReply) sendHumanLikeMessage(api, aiReply, threadID, event.messageID);
                });
            }
        }
    });
});
