// import { toast } from "react-toastify";

import { toast } from "react-toastify";
import { convertToEpoch } from "./getDateTimeNow";

export const checkTypeArr = (data) => {
  return data && Array.isArray(data) && data.length > 0;
};

export const inputTypeChange = (e, form, setForm) => {
  const { name, value } = e.target;
  setForm({ ...form, [name]: value });
};

export const inputFileChange = (e, form, setForm) => {
  const { name } = e.target;
  setForm({ ...form, [name]: e.target.files[0] });
};

export const calculatePenalty = (contractualDate, actualDate, originalValue, percentage, maxPercentage) => {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const contractualTime = new Date(contractualDate).getTime();
  const actualTime = new Date(actualDate).getTime();

  // Calculate the difference in time in milliseconds
  const difference = actualTime - contractualTime;
  console.log("difference", difference, percentage);
  if (difference < 0 || maxPercentage === 0) return 0;

  // Calculate the number of weeks delayed
  const weeksDelayed = Math.ceil(difference / oneWeek);
  // console.log("fun", difference, actualTime, contractualTime, weeksDelayed);

  // Calculate the penalty percentage
  let penaltyPercentage = weeksDelayed * percentage;

  // Ensure penalty does not exceed 1%
  if (maxPercentage) {
    penaltyPercentage = Math.min(penaltyPercentage, maxPercentage);
  }

  // Calculate the penalty amount
  const penaltyAmount = (Number(originalValue) * penaltyPercentage) / 100;
  // console.log(
  //   "penaltyAmount",
  //   penaltyAmount,
  //   contractualDate,
  //   actualDate,
  //   originalValue
  // );

  return Math.round(penaltyAmount);
};

export const calculateLDByDate = (difference, originalValue, percentage) => {
  const oneWeek = 7;

  if (difference < 0) return 0;

  const weeksDelayed = Math.ceil(difference / oneWeek);
  console.log("fun", difference, weeksDelayed);

  let penaltyPercentage = weeksDelayed * percentage;

  const penaltyAmount = (Number(originalValue) * penaltyPercentage) / 100;

  return Math.round(penaltyAmount);
};

export const calculateNetPay = (net, netWithGST, ld, sdbg, drg, qap, ilms, other, estimate) => {
  if (!net || net === "") {
    toast.warn("Net claim amount is missing");
    return;
  }

  // Default values if not provided
  ld = ld || 0;
  sdbg = sdbg || 0;
  drg = drg || 0;
  qap = qap || 0;
  ilms = ilms || 0;
  estimate = estimate || 0;

  // Convert other deduction percentage to actual value
  other = (other / 100) * net;

  let deduct = parseFloat(ld) + parseFloat(other) + parseFloat(estimate);
  let net_pay = parseFloat(netWithGST) - deduct;

  return {
    other: parseFloat(other).toFixed(2),
    deduct: parseFloat(deduct).toFixed(2),
    net_pay: parseFloat(net_pay).toFixed(2),
  };
};

export const calculateNetPayService = (net, netWIthGST, ld, retension, other) => {
  if (!net || net === "") {
    toast.warn("Net claim amount is missing");
    return;
  }

  // Default values if not provided
  ld = ld || 0;
  retension = retension || 0;
  other = other || 0;

  // Convert retension deduction percentage to actual value
  retension = (retension / 100) * net;

  let deduct = parseFloat(ld) + parseFloat(retension) + parseFloat(other);
  let net_pay = parseFloat(netWIthGST) - deduct;

  return {
    retension: parseFloat(retension).toFixed(2),
    deduct: parseFloat(deduct).toFixed(2),
    net_pay: parseFloat(net_pay).toFixed(2),
  };
};

export const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // always 2 digit format → 00:00
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${mm}:${ss}`;
};
export const formatTimeOTP = (seconds) => {
  if (seconds <= 0) return "00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
