
const express = require("express");
const router = express.Router();

const {
    submitNonPoBill,
    getNonPoBillList,
    getCommercialOfficerList,
    nonPoBillAction,
    getNonPoBillDetailsByReference,
    getFinanceOfficerList,
    assignNonPoBill
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

router.get(
    "/finance-officer-list",
    [verifyAccessToken],
    getFinanceOfficerList
);

router.post(
    "/bill/assign",
    [verifyAccessToken],
    assignNonPoBill
);




module.exports = router;
