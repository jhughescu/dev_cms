// test-atlas-ip.js
const {
    updateAtlasIP
} = require("./utils/atlas-ip-manager");
require("dotenv").config();

//require("dotenv").config();

console.log("Project ID:", process.env.ATLAS_PROJECT_ID);
console.log("Public Key:", process.env.ATLAS_API_PUBLIC_KEY);
console.log("Private Key:", process.env.ATLAS_API_PRIVATE_KEY ? "✅ Loaded" : "❌ Missing");


(async () => {
    try {
        const ip = await updateAtlasIP({
            projectId: process.env.ATLAS_PROJECT_ID,
            apiPublicKey: process.env.ATLAS_API_PUBLIC_KEY,
            apiPrivateKey: process.env.ATLAS_API_PRIVATE_KEY,
            removeOld: false, // safer for testing
        });
        console.log("✅ Test complete — current IP:", ip);
    } catch (err) {
        console.error("❌ Test failed:", err.message);
    }
})();






