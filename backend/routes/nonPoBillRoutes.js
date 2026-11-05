
const express = require("express");
const router = express.Router();

const {
    submitNonPoBill,
    getNonPoBillList,
    getNonPoBillTaskList,
    assignNonPoBill,
    getCommercialOfficerList,
    nonPoBillAction,
    getNonPoBillDetailsByReference,
} = require("../controllers/nonPoBillController");

const { verifyAccessToken } = require("../services/jwt.services");
const { uploadNonPoBill } = require("../lib/fileUpload");


// Vendor Submit Bill
router.post(
    "/bill/submit",
    verifyAccessToken,
    uploadNonPoBill.single("file"),
    submitNonPoBill
);

// Commercial Officer Dropdown
router.get(
    "/commercial-officer-list",
    verifyAccessToken,
    getCommercialOfficerList
);

// Vendor Bill List
router.get(
    "/bill/list",
    verifyAccessToken,
    getNonPoBillList
);



// Officer Task List
router.get(
    "/bill/task-list",
    verifyAccessToken,
    getNonPoBillTaskList
);

router.post(
    "/bill/action",
    verifyAccessToken,
    nonPoBillAction
);

// Non-PO Bill Details
router.get(
    "/bill/details/:reference_no",
    verifyAccessToken,
    getNonPoBillDetailsByReference
);


// Finance Main Assign to Lower Officer
router.post(
    "/bill/:id/assign",
    verifyAccessToken,
    assignNonPoBill
);



module.exports = router;
