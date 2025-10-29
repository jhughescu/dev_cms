// check-ip.js
import fetch from "node-fetch";

(async () => {
    try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        console.log("Your public IP is:", data.ip);
    } catch (err) {
        console.error("Failed to fetch public IP:", err);
    }
})();
