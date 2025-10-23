require("dotenv").config({ quiet: true });
const { DigestClient } = require("digest-fetch"); // ← fix: use destructuring

(async () => {
  try {
    const projectId = process.env.ATLAS_PROJECT_ID;
    const apiPublicKey = process.env.ATLAS_API_PUBLIC_KEY;
    const apiPrivateKey = process.env.ATLAS_API_PRIVATE_KEY;

    const client = new DigestClient(apiPublicKey, apiPrivateKey); // ← correct constructor
    const url = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`;

    console.log("🔍 Fetching Atlas Access List...");

    const res = await client.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("✅ Success! Access List:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error calling Atlas API:");
    console.error(err);
  }
})();
