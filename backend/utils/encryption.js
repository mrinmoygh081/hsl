/* eslint-disable no-undef */
const CryptoJS = require("crypto-js");

const SECRET_KEY = process.env.PWD_ENCRYPTION_KEY || 'your-secret-key-here-32-chars-long';

exports.decryptData = (encryptedData) => {
    try {
      if (!SECRET_KEY) {
        console.warn('Encryption key missing, returning encrypted data as is');
        return encryptedData;
      }
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      // Try to parse as JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

exports.decryptData = (encryptedData) => {
    try {
      if (!SECRET_KEY) {
        console.warn('Encryption key missing, returning encrypted data as is');
        return encryptedData;
      }
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      // Try to parse as JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };