/* eslint-disable no-undef */

const { google } = require("googleapis");

function initializeClient() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}


async function generateAuthUrl() {
  const oauth2Client = initializeClient();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",   // THIS replaces setAccessType()
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  });

  console.log("Authorize this app by visiting:\n", authUrl);
}

generateAuthUrl();
