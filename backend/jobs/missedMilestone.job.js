const cron = require("node-cron");

const {
    runMissedMilestoneJob
} = require("../services/missedMilestone.service");

const initMissedMilestoneJob = () => {
    cron.schedule(
        "0 9 * * *",
        async () => {
            console.log("Missed Milestone Job Started");

            try {
                await runMissedMilestoneJob();
                console.log("Missed Milestone Job Completed");
            } catch (error) {
                console.error("Missed Milestone Job Failed:", error);
            }
        },
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log("✓ Missed Milestone Scheduler Initialized");
};

module.exports = { initMissedMilestoneJob };