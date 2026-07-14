import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || "grse_obps_2024_secure_key_32_chars!!";

const IV = CryptoJS.enc.Utf8.parse("1234567890123456");

export const encryptPasswordAES_CBC = (password) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: IV,
    }).toString();

    console.log("🔐 AES-CBC Encryption:", {
      originalLength: password.length,
      encryptedLength: encrypted.length,
      preview: encrypted.substring(0, 30) + "...",
    });

    return encrypted;
  } catch (error) {
    console.error("❌ AES-CBC Encryption Error:", error);
    // Fallback to Base64
    return btoa(unescape(encodeURIComponent(password)));
  }
};

export const hashPasswordSHA256 = (password) => {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

export const getEncryptedPasswordForAPI = (password, encryptionType = "AES_CBC") => {
  switch (encryptionType.toUpperCase()) {
    case "AES_CBC":
      return encryptPasswordAES_CBC(password);
    case "SHA256":
      return hashPasswordSHA256(password);
    case "BASE64":
      return btoa(unescape(encodeURIComponent(password)));
    default:
      return encryptPasswordAES_CBC(password);
  }
};

export const testEncryption = () => {
  const testPassword = "test123";
  const encrypted = encryptPasswordAES_CBC(testPassword);

  console.log("🔐 Encryption Test Results:", {
    original: testPassword,
    encrypted: encrypted.substring(0, 40) + "...",
    keyLength: ENCRYPTION_KEY.length,
    algorithm: "AES-CBC-PKCS7",
  });

  return encrypted;
};
