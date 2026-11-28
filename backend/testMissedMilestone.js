const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.join(__dirname, "dev.env")
});

// Environment load হওয়ার পরে service import করুন
const {
    runMissedMilestoneJob
} = require("./services/missedMilestone.service");

(async () => {
    try {
        console.log("Starting missed milestone job...");

        await runMissedMilestoneJob();

        console.log("Missed milestone job completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Missed milestone job failed:", error);
        process.exit(1);
    }
})();