const MISSED_MILESTONE_MODULES = [
    {
        moduleName: "SDBG",
        milestoneId: 1,
        milestoneName: "SDBG / PBG",
        contractualColumn: "bg_date",
        activityTable: "sdbg",
        assignmentColumn: "assigned_to"
    },
    {
        moduleName: "DRAWING",
        milestoneId: 2,
        milestoneName: "Drawing",
        contractualColumn: "draw_date",
        activityTable: "drawing",
        assignmentColumn: "action_to"
    },
    {
        moduleName: "QAP",
        milestoneId: 3,
        milestoneName: "QAP",
        contractualColumn: "qap_date",
        activityTable: "qap_submission",
        assignmentColumn: "action_to"
    },
    {
        moduleName: "ILMS",
        milestoneId: 4,
        milestoneName: "ILMS",
        contractualColumn: "ilms_date",
        activityTable: "ilms",
        assignmentColumn: "action_to"
    }
];

module.exports = { MISSED_MILESTONE_MODULES };