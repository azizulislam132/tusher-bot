const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// ১. স্বয়ংক্রিয়ভাবে config.json তৈরি
if (!fs.existsSync('./config.json')) {
    const defaultConfig = {
        botName: "Tusher Custom Bot",
        prefix: "/",
        adminID: ["61591564637714"],
        groupOnly: false
    };
    fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
    console.log("⚙️ config.json ছিল না, নতুন তৈরি করা হয়েছে!");
}
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ২. স্বয়ংক্রিয়ভাবে খালি appstate.json তৈরি
if (!fs.existsSync('./appstate.json')) {
    fs.writeFileSync('./appstate.json', JSON.stringify([], null, 2));
    console.log("⚠️ appstate.json ছিল না! নতুন খালি তৈরি হয়েছে।");
    process.exit(1);
}

// ৩. AppState চেক
const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));
if (!Array.isArray(appState) || appState.length === 0) {
    console.error("❌ appstate.json খালি!");
    process.exit(1);
}

// ৪. V3 স্টাইল কমান্ড ফোল্ডার চেক ও তৈরি
const cmdPath = path.join(__dirname, 'scripts', 'cmds');
if (!fs.existsSync(cmdPath)) {
    fs.mkdirSync(cmdPath, { recursive: true });
    console.log("📁 scripts/cmds ফোল্ডার তৈরি করা হয়েছে!");
}

// ৫. কাস্টম কমান্ড লোড করা
global.commands = new Map();
const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
for (const file of files) {
    try {
        const cmd = require(path.join(cmdPath, file));
        if (cmd.config && cmd.config.name && cmd.onStart) {
            global.commands.set(cmd.config.name, cmd);
            console.log(`✅ কমান্ড লোড হয়েছে: ${cmd.config.name}`);
        }
    } catch (e) {
        console.error(`❌ কমান্ড লোড এরর (${file}):`, e.message);
    }
}

// Anti-Crash হ্যান্ডলার
process.on('unhandledRejection', (reason) => console.log('⚠️ Rejection Ignored:', reason?.message || reason));
process.on('uncaughtException', (err) => console.log('⚠️ Exception Ignored:', err?.message || err));

// ৬. ফেসবুক লগইন
console.log("🔄 ব্রাউজার সেশন দিয়ে ফেসবুকে লগইন করা হচ্ছে...");
login({ appState }, (err, api) => {
    if (err) return console.error("❌ লগইন ব্যর্থ হয়েছে! AppState পরিবর্তন করো:", err);

    console.log("✅ Bot is connected!");
    console.log(`🚀 ${config.botName} সফলভাবে চালুর জন্য প্রস্তুত!`);

    // বটের প্রয়োজনীয় সেটিং সেট করা
    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkDelivery: false,
        autoMarkRead: true,
        listenTyping: false,
        updatePresence: true,
        forceLogin: true
    });

    // 🟢 মেসেজ লিসেনার (নতুন সংশোধিত নিয়ম)
    const listenEmitter = api.listenMqtt((listenErr, event) => {
        if (listenErr) {
            console.error("❌ Mqtt Listen Error:", listenErr);
            return;
        }

        // মেসেজ আসলে তা কনসোলে দেখাবে (টার্মিনালে এসএমএস দেখার জন্য)
        if (event.type === "message" || event.type === "message_reply") {
            const body = event.body ? event.body.trim() : "";
            const senderID = event.senderID;
            
            console.log(`📩 নতুন মেসেজ এসেছে [ID: ${senderID}]: ${body}`);

            // groupOnly ফিল্টার চেক
            if (config.groupOnly && !event.isGroup) return;

            // প্রিফিক্স (! বা অন্য কিছু) না থাকলে রেসপন্স করবে না
            if (!body.startsWith(config.prefix)) return;

            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            if (global.commands.has(cmdName)) {
                const command = global.commands.get(cmdName);
                try {
                    command.onStart({ api, event, args });
                } catch (cmdErr) {
                    api.sendMessage({ body: `❌ কমান্ড রান এরর: ${cmdErr.message}` }, event.threadID, event.messageID);
                }
            } else {
                api.sendMessage({ body: `❌ "${cmdName}" নামে কোনো কমান্ড নেই। সকল কমান্ড দেখতে ${config.prefix}help টাইপ করো।` }, event.threadID, event.messageID);
            }
        }
    });
});
