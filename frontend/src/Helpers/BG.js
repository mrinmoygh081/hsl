import { toast } from "react-toastify";
import { convertToEpoch } from "../utils/getDateTimeNow";
import { postAPI } from "../utils/fetchAPIs";

export const bgInputs = {
  purchasing_doc_no: "",
  bank_name: "",
  bank_email: "",
  branch_name: "",
  bank_addr1: "",
  bank_addr2: "",
  bank_addr3: "",
  bank_city: "",
  bank_pin_code: "",
  bg_no: "",
  bg_date: "",
  bg_recived_date: "",
  bg_ammount: "",
  currency: "INR",
  bg_mode: "",
  department: "",
  yard_no: "",
  validity_date: "",
  claim_priod: "",
  reference_no: "",
  bg_type: "",
  status: "",
  created_at: "",
  created_by: "",
  remarks: "",
  assigned_to: "",
  depertment: "",
  isConfirmedBG: false,
  extension: false,
};

export const bgFi = {
  bg_file_no: "",
};

export const BGEntry = async (formDatainput, token, flag) => {
  const convertToEpochh = (date) => {
    return Math.floor(new Date(date).getTime() / 1000);
  };
  const {
    purchasing_doc_no,
    reference_no,
    bank_name,
    bank_email,
    branch_name,
    department,
    bank_addr1,
    bank_city,
    bank_pin_code,
    bg_no,
    bg_date,
    bg_recived_date,
    bg_ammount,
    validity_date,
    claim_priod,
    bg_type,
    bg_mode,
    currency,
  } = formDatainput;

  if (
    purchasing_doc_no === "" ||
    reference_no === "" ||
    bank_name === "" ||
    !bank_email ||
    branch_name === "" ||
    bank_addr1 === "" ||
    bank_city === "" ||
    bank_pin_code === "" ||
    bg_no === "" ||
    bg_date === "" ||
    department === "" ||
    bg_recived_date === "" ||
    validity_date === "" ||
    claim_priod === "" ||
    bg_type === "" ||
    !bg_mode ||
    !currency
  ) {
    toast.warn("Please enter the required fields!");
    return false;
  }
  if (!bg_ammount || isNaN(Number(bg_ammount))) {
    toast.warn("Please enter a valid BG Amount!");
    return false;
  }
  let form = {
    ...formDatainput,
    bg_date: convertToEpochh(new Date(formDatainput.bg_date * 1000)),
    validity_date: convertToEpochh(new Date(formDatainput.validity_date * 1000)),
    claim_priod: convertToEpochh(new Date(formDatainput.claim_priod * 1000)),
    reference_no: reference_no,
    bg_ammount: parseFloat(formDatainput.bg_ammount),
    status: flag,
    remarks: flag === "FORWARD_TO_FINANCE" ? "Forwarded to Fi Dept" : flag === "EXTENDED" ? "BG Extended" : "",
  };
  const d = await postAPI("po/sdbg/sdbgSubmitByDealingOfficer", form, token);
  if (d?.status) {
    toast.success(d?.message);
    if (d?.data?.warning) toast.warn(d.data.warning, { autoClose: 8000 });
    return true;
  } else {
    toast.error(d?.message);
    return false;
  }
};

export const BGEntrySave = async (formDatainput, token) => {
  const convertToEpochh = (date) => {
    return Math.floor(new Date(date).getTime() / 1000);
  };

  // Destructure the formDatainput
  const {
    purchasing_doc_no,
    reference_no,
    bank_name,
    bank_email,
    branch_name,
    bank_addr1,
    bank_addr2,
    bank_addr3,
    bank_city,
    bank_pin_code,
    yard_no,
    bg_no,
    bg_date,
    bg_recived_date,
    bg_ammount,
    validity_date,
    claim_priod,
    bg_type,
    bg_mode,
    currency,
    department,
  } = formDatainput;

  // Construct the form object
  let form = {
    purchasing_doc_no,
    reference_no,
    bank_name,
    bank_email,
    branch_name,
    bank_addr1,
    bank_addr2,
    bank_addr3,
    bank_city,
    bank_pin_code,
    yard_no,
    bg_no,
    bg_date: convertToEpochh(new Date(bg_date * 1000)),
    bg_recived_date: convertToEpochh(new Date(bg_recived_date * 1000)),
    bg_ammount,
    validity_date: convertToEpochh(new Date(validity_date * 1000)),
    claim_priod: convertToEpochh(new Date(claim_priod * 1000)),
    bg_type,
    bg_mode,
    currency,
    department,
    status: "SAVED",
    remarks: "BG has been saved.",
  };

  const d = await postAPI("/po/sdbg/insertSdbgSave", form, token);

  if (d?.status) {
    toast.success(d?.message);
    return true;
  } else {
    toast.error(d?.message);
    return false;
  }
};
