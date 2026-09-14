const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "cmd",
        version: "1.0.0",
        author: "Tusher Khan",
        shortDescription: "মেসেঞ্জার থেকে সরাসরি কমান্ড ফাইল সেভ করে"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, senderID } = event;

        // শুধু অ্যাডমিন এই কমান্ড ব্যবহার করতে পারবে (নিরাপত্তার জন্য)
        const adminID = "61591564637714"; 
        if (senderID !== adminID) {
            return api.sendMessage("❌ এই কমান্ডটি শুধু অ্যাডমিন ব্যবহার করতে পারবে!", threadID, messageID);
        }

        if (args.length < 2) {
            return api.sendMessage("⚠️ ব্যবহারের নিয়ম:\n/cmd <fileName.js> <কোড>", threadID, messageID);
        }

        const fileName = args[0].endsWith('.js') ? args[0] : `${args[0]}.js`;
        const codeContent = args.slice(1).join(" ");
        const filePath = path.join(__dirname, fileName);

        try {
            fs.writeFileSync(filePath, codeContent, 'utf8');
            return api.sendMessage(`✅ **${fileName}** ফাইলটি সফলভাবে \`scripts/cmds/\` ফোল্ডারে সেভ হয়েছে!`, threadID, messageID);
        } catch (e) {
            return api.sendMessage(`❌ ফাইল সেভ করতে ভুল হয়েছে: ${e.message}`, threadID, messageID);
        }
    }
};
