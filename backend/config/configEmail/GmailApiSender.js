/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

class GmailApiSender {
    constructor(credentialsPath = null, tokenPath = null) {
        // Using absolute paths ensures this works no matter where it's imported from
        this.credentialsPath = credentialsPath || path.resolve(__dirname, "credentials.json");
        this.tokenPath = tokenPath || path.resolve(__dirname, "token.json");
    }
    /**
         * Initialize OAuth2 client and Gmail service
         */
    async initializeClient() {
        if (this.service && !this.isAccessTokenExpired()) {
            return; // Already initialized and valid, skip heavy file reads
        }

        if (!fs.existsSync(this.credentialsPath) || !fs.existsSync(this.tokenPath)) {
            throw new Error("Missing credentials.json or token.json files");
        }

        const credentials = JSON.parse(fs.readFileSync(this.credentialsPath));
        let token = JSON.parse(fs.readFileSync(this.tokenPath));

        const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

        this.client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        this.client.setCredentials(token);

        this.client.on("tokens", (newTokens) => {
            token = { ...token, ...newTokens };
            fs.writeFileSync(this.tokenPath, JSON.stringify(token));
            console.log(`[${new Date().toISOString()}] Gmail token auto-refreshed`);
        });

        // Manual refresh if expired
        if (this.isAccessTokenExpired()) {
            await this.refreshAccessToken();
        }

        this.service = google.gmail({ version: "v1", auth: this.client });
    }

    /**
    * Check if access token has expired
    */
    isAccessTokenExpired() {
        const token = this.client?.credentials;
        if (!token || !token.expiry_date) return true;
        return Date.now() >= token.expiry_date;
    }

    /**
     * Get refresh token
     */
    getRefreshToken() {
        return this.client?.credentials?.refresh_token || null;
    }

    /**
      * Force refresh the access token
      */
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error("Token expired and no refresh token available. Re-generate token.json.");
        }

        const newTokens = await this.client.refreshAccessToken();
        const updatedCredentials = { ...this.client.credentials, ...newTokens.credentials };

        this.client.setCredentials(updatedCredentials);
        fs.writeFileSync(this.tokenPath, JSON.stringify(updatedCredentials));

        return updatedCredentials;
    }

    base64urlEncode(str) {
        return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    /**
     * Send email
     */
    async sendEmail(from, to, subject, body, isHtml = false, replyTo = null) {
        try {
            // Guarantee initialization before sending
            await this.initializeClient();

            let raw = `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n`;
            if (replyTo) raw += `Reply-To: ${replyTo}\r\n`;
            raw += isHtml ? `Content-Type: text/html; charset=UTF-8\r\n\r\n` : `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
            raw += body;

            const encoded = this.base64urlEncode(raw);

            const sent = await this.service.users.messages.send({
                userId: "me",
                requestBody: { raw: encoded }
            });

            console.log(`[${new Date().toISOString()}] Email sent. ID: ${sent.data.id}`);
            return { success: true, message_id: sent.data.id };
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Gmail API Error: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
}

// ✅ THE FIX: Create ONE instance and export it. 

const gmailApiInstance = new GmailApiSender();

module.exports = { gmailApiInstance };