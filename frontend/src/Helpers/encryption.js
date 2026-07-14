// utils/encryption.js
import CryptoJS from "crypto-js";

// Encryption key .env से लेंगे
const SECRET_KEY = process.env.REACT_APP_ENCRYPTION_KEY;

// Check if key exists
if (!SECRET_KEY) {
  console.warn("⚠️ ENCRYPTION_KEY not found in .env file!");
  console.warn("Please add: REACT_APP_ENCRYPTION_KEY=your_32_char_secret_key");
}

/**
 * Password encrypt करने का function
 * @param {string} password - Plain text password
 * @returns {string} - Encrypted password (Base64 format)
 */
export const encryptPassword = (password) => {
  try {
    if (!SECRET_KEY) {
      console.error("Encryption key missing!");
      return password; // Fallback: plain password return करें
    }

    // AES encryption with CBC mode
    const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();

    console.log("🔐 Encryption successful:", {
      originalLength: password.length,
      encryptedLength: encrypted.length,
      preview: encrypted.substring(0, 30) + "...",
    });

    return encrypted;
  } catch (error) {
    console.error("❌ Encryption error:", error);
    return password; // Error होने पर plain password return
  }
};

/**
 * Encrypted password decrypt करने का function (testing के लिए)
 * @param {string} encryptedPassword - Encrypted password
 * @returns {string} - Decrypted password
 */
export const decryptPassword = (encryptedPassword) => {
  try {
    if (!SECRET_KEY) {
      return encryptedPassword;
    }

    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

/**
 * Encryption test function
 */
export const testEncryption = () => {
  const testPassword = "test@123";
  const encrypted = encryptPassword(testPassword);
  const decrypted = decryptPassword(encrypted);

  console.log("🧪 Encryption Test Results:", {
    original: testPassword,
    encrypted: encrypted.substring(0, 30) + "...",
    decrypted,
    success: testPassword === decrypted,
    keyExists: !!SECRET_KEY,
    keyLength: SECRET_KEY ? SECRET_KEY.length : 0,
  });

  return {
    success: testPassword === decrypted,
    encrypted,
    decrypted,
  };
};
