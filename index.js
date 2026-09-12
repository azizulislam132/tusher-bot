const login = require('mahmud-fca');
const fs = require('fs');
const path = require('path');

// ১. স্বয়ংক্রিয়ভাবে config.json তৈরি
if (!fs.existsSync('./config.json')) {
    const defaultConfig = {
        botName: "Tusher Custom Bot",
        prefix: "!",
        adminID: ["10008823902910"],
        groupOnly: false
    };
    fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
    console.log("⚙️ config.json ছিল না, নতুন তৈরি করা হয়েছে!");
}
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ২. স্বয়ংক্রিয়ভাবে খালি appstate.json তৈরি (যদি না থাকে)
if (!fs.existsSync('./appstate.json')) {
    fs.writeFileSync('./appstate.json', JSON.stringify([], null, 2));
    console.log("⚠️ appstate.json ছিল না! নতুন খালি তৈরি হয়েছে। অনুগ্রহ করে এতে তোমার ফেসবুক AppState/Cookies পেস্ট করো।");
    process.exit(1);
}

// ৩. AppState চেক
const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));
if (!Array.isArray(appState) || appState.length === 0) {
    console.error("❌ appstate.json খালি! Kiwi Browser থেকে AppState এক্সপোর্ট করে 'nano appstate.json' দিয়ে পেস্ট করো।");
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

    // 🟢 কানেক্ট হওয়ার মেসেজ কনসোলে দেখাবে
    console.log("✅ Bot is connected!");
    console.log(`🚀 ${config.botName} সফলভাবে চালুর জন্য প্রস্তুত!`);

    // (ঐচ্ছিক) বট কানেক্ট হলে অ্যাডমিনের ইনবক্সে মেসেজ পাঠাবে
    if (config.adminID && config.adminID.length > 0) {
        const firstAdmin = config.adminID[0];
        api.sendMessage("🟢 Bot is connected and running successfully!", firstAdmin, (msgErr) => {
            if (!msgErr) console.log("📩 অ্যাডমিনকে কানেকশন নোটিফিকেশন পাঠানো হয়েছে।");
        });
    }

    api.setOptions({
        listenEvents: true,
        selfListen: false,
        autoMarkDelivery: true,
        online: true
    });

    api.listenMqtt((listenErr, event) => {
        if (listenErr) return;

        if (event.type === "message" || event.type === "message_reply") {
            const body = event.body ? event.body.trim() : "";
            
            // groupOnly ফিল্টার চেক
            if (config.groupOnly && !event.isGroup) return;

            if (!body.startsWith(config.prefix)) return;

            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();

            if (global.commands.has(cmdName)) {
                const command = global.commands.get(cmdName);
                try {
                    command.onStart({ api, event, args });
                } catch (cmdErr) {
                    api.sendMessage(`❌ কমান্ড রান এরর: ${cmdErr.message}`, event.threadID);
                }
            } else {
                api.sendMessage(`❌ "${cmdName}" নামে কোনো কমান্ড নেই। সকল কমান্ড দেখতে ${config.prefix}help টাইপ করো।`, event.threadID);
            }
        }
    });
});
