const express = require("express");
const router = express.Router();

const { verifyAccessToken } = require("../services/jwt.services");

const missedMilestoneController = require("../controllers/missedMilestone.controller");

// Get missed milestone notifications
router.get(
    "/notifications",
    verifyAccessToken,
    missedMilestoneController.getNotifications
);

// Get unread notification count
router.get(
    "/notifications/unread-count",
    verifyAccessToken,
    missedMilestoneController.getUnreadCount
);

// Mark single notification as read
router.patch(
    "/notifications/:id/read",
    verifyAccessToken,
    missedMilestoneController.markAsRead
);

// Mark all notifications as read
router.patch(
    "/notifications/read-all",
    verifyAccessToken,
    missedMilestoneController.markAllAsRead
);

module.exports = router;