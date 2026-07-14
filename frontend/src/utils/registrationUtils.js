import CryptoJS from "crypto-js";
import { getEncryptedPasswordForAPI } from "./encryptionUtils";

export const commonPasswords = [
  "password",
  "password123",
  "admin",
  "admin123",
  "123456",
  "12345678",
  "123456789",
  "qwerty",
  "abc123",
  "letmein",
  "welcome",
  "monkey",
  "sunshine",
  "password1",
  "superman",
  "iloveyou",
  "football",
];

// Dictionary words list
export const dictionaryWords = [
  "hello",
  "world",
  "secret",
  "private",
  "company",
  "business",
  "enterprise",
  "system",
  "network",
  "computer",
  "software",
  "hardware",
  "database",
  "security",
  "access",
  "control",
  "manager",
  "director",
  "employee",
  "vendor",
  "supplier",
  "customer",
  "client",
  "partner",
  "grse",
  "obps",
];

// Password strength checker
export const checkPasswordStrength = (password, userIdentifier = "") => {
  let score = 0;
  let messages = [];

  // Check minimum length
  if (password.length >= 8) {
    score += 1;
  } else {
    messages.push("Minimum 8 characters required");
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    messages.push("At least one uppercase letter (A-Z)");
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    messages.push("At least one lowercase letter (a-z)");
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    messages.push("At least one number (0-9)");
  }

  // Check for special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    messages.push("At least one special character (!@#$%^&* etc.)");
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some((cp) => lowerPassword.includes(cp))) {
    score = Math.max(0, score - 2);
    messages.push("Avoid common passwords");
  }

  // Check against dictionary words
  if (dictionaryWords.some((dw) => lowerPassword.includes(dw))) {
    score = Math.max(0, score - 1);
    messages.push("Avoid dictionary words");
  }

  // Check if password contains username/vendor code
  if (userIdentifier && lowerPassword.includes(userIdentifier.toLowerCase())) {
    score = Math.max(0, score - 2);
    messages.push("Password should not contain your user code");
  }

  // Determine strength level
  let strengthMessage = "";
  let color = "";

  if (score <= 2) {
    strengthMessage = "Weak";
    color = "text-danger";
  } else if (score <= 3) {
    strengthMessage = "Fair";
    color = "text-warning";
  } else if (score <= 4) {
    strengthMessage = "Good";
    color = "text-info";
  } else {
    strengthMessage = "Strong";
    color = "text-success";
  }

  return {
    score,
    message: messages.length > 0 ? messages.join(", ") : strengthMessage,
    color,
  };
};

// Encrypt password using AES encryption
export const encryptPassword = (password) => {
  return {
    encryptedPassword: getEncryptedPasswordForAPI(password, "AES_CBC"),
    salt: "",
  };
};

// Validate password against policy
export const validatePassword = (password, vendorCode = "", toast) => {
  // Minimum length check
  if (password.length < 8) {
    toast.error("Password must be at least 8 characters long");
    return false;
  }

  // Character mix check
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    toast.error("Password must contain uppercase, lowercase, numbers and special characters");
    return false;
  }

  // Check against common passwords
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some((cp) => lowerPassword.includes(cp))) {
    toast.error("Password is too common. Please choose a stronger password");
    return false;
  }

  // Check against dictionary words
  if (dictionaryWords.some((dw) => lowerPassword.includes(dw))) {
    toast.warn("Avoid using dictionary words in your password");
  }

  // Check if password contains username/vendor code
  const userIdentifier = vendorCode.toLowerCase();
  if (userIdentifier && lowerPassword.includes(userIdentifier)) {
    toast.error("Password should not contain your user code");
    return false;
  }

  // Check for sequential characters
  if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    toast.warn("Avoid sequential characters in password");
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    toast.warn("Avoid repeating same character multiple times");
  }

  return true;
};

// SHA256 encryption for password transmission
export const encryptPasswordSha256 = (password) => {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

// AES encryption with salt for secure storage
export const encryptPasswordAES = (password) => {
  // Generate a random salt for each password
  const salt = CryptoJS.lib.WordArray.random(128 / 8);

  // Create encryption key (in production, this should come from environment variables)
  const encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || "your-secret-key-here-32-bytes-long!";

  // Hash the password with salt using SHA256
  const hashedPassword = CryptoJS.SHA256(password + salt);

  // Encrypt the hashed password with AES
  const encrypted = CryptoJS.AES.encrypt(hashedPassword.toString(), encryptionKey).toString();

  return {
    encryptedPassword: encrypted,
    salt: salt.toString(),
  };
};

// Verify if your backend expects encrypted passwords
export const getEncryptedPassword = (password, encryptionType = "SHA256") => {
  switch (encryptionType) {
    case "SHA256":
      return encryptPasswordSha256(password);
    case "AES":
      return encryptPasswordAES(password);
    default:
      return encryptPasswordSha256(password);
  }
};
