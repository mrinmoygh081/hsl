
const { SUBMITTED, APPROVED, STATUS_RECOMMEND, REJECTED,  NOT_RECOMMEND } = require("../lib/status");

const policies = {

    // Generic policy for state transitions
    'wdc:perform_action': (user, newStatus) => {
      
        switch (newStatus) {
            case SUBMITTED:
                return user.roles.includes('vendor');
            case APPROVED:
                return (user.roles.includes('nodal') || user.roles.includes('general'));
            case REJECTED:
                return (user.roles.includes('nodal') || user.roles.includes('general'));
            case STATUS_RECOMMEND:
                return (user.roles.includes('general'));
            case NOT_RECOMMEND:
                return (user.roles.includes('general'));
            default:
                return user.roles.some(role => ['admin', 'godrole'].includes(role));
        }
    },
    'bgextension:perform_action': (user, newStatus) => {
        switch (newStatus) {
            case SUBMITTED:
                return user.roles.includes('vendor');
            case APPROVED:
                return (user.roles.includes('nodal') || user.roles.includes('general'));
            case REJECTED:
                return (user.roles.includes('nodal') || user.roles.includes('general'));
            case STATUS_RECOMMEND:
                return (user.roles.includes('general'));
            case NOT_RECOMMEND:
                return (user.roles.includes('general'));
            default:
                return user.roles.some(role => ['admin', 'godrole'].includes(role));
        }
    },
};

const checkPermission = (policyName, tokenData, newStatus) => {
    const policy = policies[policyName];

    if (!policy) {
        console.warn(`Policy "${policyName}" not found.`);
        return false;
    }
    try {

        return policy(tokenData, newStatus);
    } catch (error) {
        console.error(`Error executing policy "${policyName}":`, error);
        return false;
    }
};

module.exports = checkPermission;

