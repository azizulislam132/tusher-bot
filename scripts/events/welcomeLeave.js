module.exports = {
    config: {
        name: "welcomeLeave",
        version: "1.0.0",
        author: "Tusher Khan",
        description: "গ্রুপে নতুন মেম্বার যুক্ত হলে ওয়েলকাম এবং লিভ নিলে বিদায় জানাবে।"
    },

    onEvent: async function ({ api, event }) {
        const { threadID, logMessageType, logMessageData } = event;

        // ১. নতুন মেম্বার যুক্ত হলে (Welcome Event)
        if (logMessageType === "log:subscribe") {
            const addedParticipants = logMessageData.addedParticipants;

            for (let member of addedParticipants) {
                const memberName = member.fullName;
                const welcomeMsg = `🎉 স্বাগতম **${memberName}**!\n\nআমাদের গ্রুপে আপনাকে পেয়ে আমরা আনন্দিত। আশা করি গ্রুপের নিয়ম মেনে চলবেন এবং সবার সাথে বন্ধুত্বপূর্ণ আচরণ করবেন! ❤️`;

                try {
                    api.sendMessage(welcomeMsg, threadID);
                } catch (e) {
                    console.log("❌ Welcome Error:", e.message || e);
                }
            }
        }

        // ২. কোনো মেম্বার লিভ নিলে বা রিমুভ হলে (Leave Event)
        if (logMessageType === "log:unsubscribe") {
            const leftParticipantID = logMessageData.leftParticipantFbId;

            try {
                // ইউজারের নাম ফেচ করা
                api.getUserInfo(leftParticipantID, (err, userInfo) => {
                    let name = "একজন সদস্য";
                    if (!err && userInfo[leftParticipantID]) {
                        name = userInfo[leftParticipantID].name;
                    }

                    const leaveMsg = `👋 **${name}** গ্রুপ ছেড়ে চলে গেছেন (অথবা রিমুভ করা হয়েছে)।\n\nআপনার সুন্দর ভবিষ্যতের জন্য শুভকামনা রইল! ✨`;
                    api.sendMessage(leaveMsg, threadID);
                });
            } catch (e) {
                console.log("❌ Leave Error:", e.message || e);
            }
        }
    }
};
