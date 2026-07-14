import { toast } from "react-toastify";
import { convertToEpoch } from "../utils/getDateTimeNow";
import { postAPI } from "../utils/fetchAPIs";

export const bgInputs = {
  purchasing_doc_no: "",
  bank_name: "",
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
  } = formDatainput;

  if (
    purchasing_doc_no === "" ||
    reference_no === "" ||
    bank_name === "" ||
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
    bg_type === ""
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
    // bg_date: convertToEpoch(bg_date),
    bg_date: convertToEpochh(new Date(formDatainput.bg_date * 1000)),
    // entension_letter_date: convertToEpoch(entension_letter_date),
    // demand_notice_date: convertToEpoch(demand_notice_date),
    // release_date: convertToEpoch(release_date),
    // check_list_date: convertToEpoch(check_list_date),
    // validity_date: convertToEpoch(validity_date),
    validity_date: convertToEpochh(new Date(formDatainput.validity_date * 1000)),
    // po_date: convertToEpoch(po_date),
    // extension_date1: convertToEpoch(extension_date1),
    // extension_date2: convertToEpoch(extension_date2),
    // extension_date3: convertToEpoch(extension_date3),
    // extension_date4: convertToEpoch(extension_date4),
    // extension_date5: convertToEpoch(extension_date5),
    // extension_date6: convertToEpoch(extension_date6),
    claim_priod: convertToEpochh(new Date(formDatainput.claim_priod * 1000)),
    reference_no: reference_no,
    bg_ammount: parseFloat(formDatainput.bg_ammount),
    status: flag,
    remarks: flag === "FORWARD_TO_FINANCE" ? "Forwarded to Fi Dept" : flag === "EXTENDED" ? "BG Extended" : "",
  };
  const d = await postAPI("po/sdbg/sdbgSubmitByDealingOfficer", form, token);
  if (d?.status) {
    toast.success(d?.message);
    return true;
  } else {
    toast.error(d?.message);
    return false;
  }
};

// export const BGEntrySave = async (formDatainput, token) => {
//   const convertToEpochh = (date) => {
//     return Math.floor(new Date(date).getTime() / 1000);
//   };
//   const {
//     purchasing_doc_no,
//     reference_no,
//     bank_name,
//     branch_name,
//     bank_addr1,
//     bank_city,
//     bank_pin_code,
//     bg_no,
//     bg_date,
//     bg_ammount,
//     validity_date,
//     claim_priod,
//     bg_type,
//     depertment,
//   } = formDatainput;
//   console.log(formDatainput);

//   if (
//     purchasing_doc_no === "" ||
//     reference_no === "" ||
//     bank_name === "" ||
//     branch_name === "" ||
//     bank_addr1 === "" ||
//     bank_city === "" ||
//     bank_pin_code === "" ||
//     bg_no === "" ||
//     bg_date === "" ||
//     bg_ammount === "" ||
//     validity_date === "" ||
//     claim_priod === "" ||
//     bg_type === "" ||
//     depertment === ""
//   ) {
//     toast.warn("Please enter the required fields!");
//     return false;
//   }

//   let form = {
//     ...formDatainput,
//     // bg_date: convertToEpoch(bg_date),
//     bg_date: convertToEpochh(new Date(formDatainput.bg_date * 1000)),
//     // entension_letter_date: convertToEpoch(entension_letter_date),
//     // demand_notice_date: convertToEpoch(demand_notice_date),
//     // release_date: convertToEpoch(release_date),
//     // check_list_date: convertToEpoch(check_list_date),
//     // validity_date: convertToEpoch(validity_date),
//     validity_date: convertToEpochh(
//       new Date(formDatainput.validity_date * 1000)
//     ),
//     // po_date: convertToEpoch(po_date),
//     // extension_date1: convertToEpoch(extension_date1),
//     // extension_date2: convertToEpoch(extension_date2),
//     // extension_date3: convertToEpoch(extension_date3),
//     // extension_date4: convertToEpoch(extension_date4),
//     // extension_date5: convertToEpoch(extension_date5),
//     // extension_date6: convertToEpoch(extension_date6),
//     // claim_priod: convertToEpoch(claim_priod),
//     claim_priod: convertToEpochh(new Date(formDatainput.claim_priod * 1000)),
//     reference_no: reference_no,
//     status: "SAVED",
//     remarks: "Forwarded to SAVE",
//   };
//   const d = await postAPI("/po/sdbg/insertSdbgSave", form, token);
//   if (d?.status) {
//     toast.success(d?.message);
//     return true;
//   } else {
//     toast.error(d?.message);
//     return false;
//   }
// };

// export const BGEntrySave = async (formDatainput, token) => {
//   const convertToEpochh = (date) => {
//     return Math.floor(new Date(date).getTime() / 1000);
//   };

//   const {
//     purchasing_doc_no,
//     reference_no,
//     bank_name,
//     branch_name,
//     bank_addr1,
//     bank_city,
//     bank_pin_code,
//     bg_no,
//     bg_date,
//     bg_ammount,
//     validity_date,
//     claim_priod,
//     bg_type,
//     depertment,
//   } = formDatainput;

//   let form = {
//     ...formDatainput,
//     bg_date: convertToEpochh(new Date(formDatainput.bg_date * 1000)),
//     validity_date: convertToEpochh(
//       new Date(formDatainput.validity_date * 1000)
//     ),
//     claim_priod: convertToEpochh(new Date(formDatainput.claim_priod * 1000)),
//     reference_no: reference_no,
//     status: "SAVED",
//     remarks: "Forwarded to SAVE",
//   };

//   const d = await postAPI("/po/sdbg/insertSdbgSave", form, token);

//   if (d?.status) {
//     toast.success(d?.message);
//     return true;
//   } else {
//     toast.error(d?.message);
//     return false;
//   }
// };

export const BGEntrySave = async (formDatainput, token) => {
  const convertToEpochh = (date) => {
    return Math.floor(new Date(date).getTime() / 1000);
  };

  // Destructure the formDatainput
  const {
    purchasing_doc_no,
    reference_no,
    bank_name,
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
    department,
  } = formDatainput;

  // Construct the form object
  let form = {
    purchasing_doc_no,
    reference_no,
    bank_name,
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
    department,
    status: "SAVED",
    remarks: "BG has been saved.",
  };
  // console.log("form", form);

  const d = await postAPI("/po/sdbg/insertSdbgSave", form, token);

  if (d?.status) {
    toast.success(d?.message);
    return true;
  } else {
    toast.error(d?.message);
    return false;
  }
};
