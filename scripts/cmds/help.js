const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "help",
        version: "1.0.0",
        author: "Tusher Khan",
        countDown: 5,
        role: 0,
        shortDescription: "বটের কমান্ড লিস্ট দেখায়",
        longDescription: "বটে থাকা সমস্ত কমান্ড এবং কিভাবে কথা শেখাতে হয় তার সাহায্য নির্দেশিকা দেখায়।",
        category: "system",
        guide: "{pn} অথবা /help"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;

        try {
            // scripts/cmds ফোল্ডারের সঠিক পাথ
            const cmdsPath = path.join(process.cwd(), 'scripts', 'cmds');
            let commandFiles = [];

            if (fs.existsSync(cmdsPath)) {
                commandFiles = fs.readdirSync(cmdsPath).filter(file => file.endsWith('.js'));
            }

            // কমান্ড তালিকা তৈরি
            const cmdList = commandFiles.map(file => `🔹 /${file.replace('.js', '')}`);

            const helpText = 
`📖 **Tusher AI - Help Menu** 📖
-----------------------------------
🤖 **উপলব্ধ কমান্ড তালিকা (${cmdList.length}টি):**

${cmdList.length > 0 ? cmdList.join('\n') : "❌ কোনো কমান্ড ফাইল পাওয়া যায়নি!"}

-----------------------------------
💡 **কথা শেখানোর নিয়ম:**
• **teach প্রশ্ন = উত্তর** - বটকে নতুন প্রশ্নের উত্তর শেখানোর জন্য।

💡 **কথা বলার নিয়ম:**
• বটকে ট্যাগ করে অথবা নাম ধরে যেকোনো প্রশ্ন করুন, বট অটো-রিপ্লাই দেবে!`;

            return api.sendMessage(helpText, threadID, messageID);
        } catch (e) {
            console.log("❌ Help Cmd Error:", e.message || e);
            return api.sendMessage("❌ হেল্প মেনু লোড করতে সমস্যা হয়েছে!", threadID, messageID);
        }
    }
};
