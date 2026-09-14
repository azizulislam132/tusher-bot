const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "cmd",
        version: "1.1.0",
        author: "Tusher Khan",
        shortDescription: "মেসেঞ্জার থেকে কাস্টম ফাইল তৈরি ও সাথে সাথে লাইভ রান করে"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, senderID } = event;

        // শুধু অ্যাডমিন এটি ব্যবহার করতে পারবে
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
            // ১. ফাইল সেভ করা
            fs.writeFileSync(filePath, codeContent, 'utf8');

            // ২. নোড মেমোরি ক্যাশ ক্লিয়ার ও হট-রিলোড করা (Hot Reloading)
            delete require.cache[require.resolve(filePath)];
            
            return api.sendMessage(`✅ **${fileName}** সেভ এবং লাইভ লোড হয়েছে!\n\nএখনই মেসেঞ্জারে টেস্ট করে দেখতে পারেন।`, threadID, messageID);
        } catch (e) {
            return api.sendMessage(`❌ ফাইল সেভ বা লোড করতে ভুল হয়েছে: ${e.message}`, threadID, messageID);
        }
    }
};
