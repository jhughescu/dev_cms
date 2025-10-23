const {
    DigestClient
} = require("digest-fetch");
const fs = require("fs");
const path = require("path");
const config = require("../utils/config");

// Retry helper
async function retry(fn, retries = 3, delay = 500) {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        console.warn(`⚠️ Retry failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        return retry(fn, retries - 1, delay * 2);
    }
}

// Logger helper
function log(message, logFile = "atlas-ip.log") {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(path.resolve(process.cwd(), logFile), line);
//    console.log('IP', config.LOG_IP_MANAGER);
    if (config.LOG_IP_MANAGER) {
        console.log(line.trim());
    }
}

// Main function
async function updateAtlasIP({
    projectId,
    apiPublicKey,
    apiPrivateKey,
    removeOld = true,
    cacheFile = ".cached-ip.json",
    logFile = "atlas-ip.log",
}) {
    const cachePath = path.resolve(process.cwd(), cacheFile);
    const apiUrl = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/accessList`;
    const client = new DigestClient(apiPublicKey, apiPrivateKey);

    try {
        // Step 1: Get current public IP
        const currentIP = await retry(async () => {
            const res = await fetch("https://api.ipify.org");
            if (!res.ok) throw new Error(`Failed to get IP: ${res.status}`);
            return res.text();
        });
        const trimmedIP = currentIP.trim();
        log(`🌐 Current public IP: ${trimmedIP}`, logFile);

        // Step 2: Load cached IP
        let cachedIP = null;
        if (fs.existsSync(cachePath)) {
            cachedIP = JSON.parse(fs.readFileSync(cachePath, "utf8")).ip;
        }

        // Step 3: If IP hasn't changed, skip update
        if (cachedIP === trimmedIP) {
            log("✅ IP unchanged since last run — skipping Atlas update", logFile);
            return trimmedIP;
        }

        log("📡 IP has changed — updating MongoDB Atlas access list...", logFile);

        // Step 4: Get current whitelist
        const listRes = await retry(() => client.fetch(apiUrl));
        if (!listRes.ok) throw new Error(`Failed to fetch access list (${listRes.status})`);
        const listData = await listRes.json();
        const existingIPs = listData.results?.map((r) => r.ipAddress) || [];

        // Step 5: Add new IP if missing
        if (!existingIPs.includes(trimmedIP)) {
            const addBody = JSON.stringify([
                {
                    ipAddress: trimmedIP,
                    comment: "Auto-added by dev script"
                },
      ]);
            const addRes = await retry(() =>
                client.fetch(apiUrl, {
                    method: "POST",
                    body: addBody,
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
            );
            if (!addRes.ok) throw new Error(`Failed to add IP (${addRes.status})`);
            log(`✅ Added ${trimmedIP} to Atlas whitelist`, logFile);
        } else {
            log("✅ Current IP already whitelisted", logFile);
        }

        // Step 6: Optionally remove old IPs
        if (removeOld) {
            for (const ip of existingIPs) {
                if (ip !== trimmedIP) {
                    await retry(() => client.fetch(`${apiUrl}/${ip}`, {
                        method: "DELETE"
                    }));
                    log(`🧹 Removed old IP: ${ip}`, logFile);
                }
            }
        }

        // Step 7: Cache current IP
        fs.writeFileSync(cachePath, JSON.stringify({
            ip: trimmedIP
        }, null, 2));
        log(`💾 Cached current IP (${trimmedIP}) in ${cacheFile}`, logFile);

        return trimmedIP;
    } catch (err) {
        const errorMsg = err.message || JSON.stringify(err, null, 2);
        log(`❌ Failed to update Atlas whitelist after retries: ${errorMsg}`, logFile);
        throw err;
    }
}

module.exports = {
    updateAtlasIP
};
