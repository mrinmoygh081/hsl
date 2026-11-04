export const ACTION_SDBG = "SDBG SUBMISSION";
export const ACTION_IB = "INDEMNITY BOND SUBMISSION";
export const ACTION_DD = "DEMAND DRAFT SUBMISSION";
export const ACTION_PBG = "PBG SUBMISSION";
export const ACTION_ABG = "ADVANCED BG SUBMISSION";
export const ACTION_MBG = "MATERIAL BG SUBMISSION";
export const ACTION_RM = "REMARKS";
export const ACTION_O = "OTHERS";
export const FORWARD_TO_FINANCE = "FORWARD_TO_FINANCE";
export const HOLD = "HOLD";
export const SUBMITTED = "SUBMITTED";
export const REQUESTED = "REQUESTED";
export const APPROVED = "APPROVED";
export const REJECTED = "REJECTED";
export const ACCEPTED = "ACCEPTED";
export const BG_TYPES = ["SDBG", "PBG", "ADVANCED BG", "MATERIAL BG", "DEMAND DRAFT"];
// Mode of BG (To-Be 6.2.1); values must match backend BG_MODES
export const BG_MODES = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "E-BG", label: "E-BG" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "DD", label: "Demand Draft (DD)" },
];
export const BG_CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "SGD", "AED"];
