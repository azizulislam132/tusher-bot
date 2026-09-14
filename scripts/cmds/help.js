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

        const helpText = 
`📖 **Tusher AI - Help Menu** 📖
-----------------------------------
🔹 **/help** - বটের সাহায্যের মেনু দেখার জন্য।
🔹 **teach প্রশ্ন = উত্তর** - বটকে নতুন নতুন কথা বা প্রশ্নের উত্তর শেখানোর জন্য।
🔹 **গালিগালাজ নিষেধ** - বট খারাপ শব্দ ফ্লিটার করে অটো-রিপ্লাই দেবে।

💡 **কথা বলার নিয়ম:**
বটকে ট্যাগ দিন (যেমন: @M Tusher Khan) অথবা বটের সাথে সাধারণ প্রশ্ন আকারে কথা বলুন। ডাটাবেজে উত্তর থাকলে বট সাথে সাথেই উত্তর দেবে!`;

        try {
            return api.sendMessage(helpText, threadID, messageID);
        } catch (e) {
            console.log("❌ Help Cmd Error:", e.message || e);
        }
    }
};
