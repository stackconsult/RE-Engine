export const DefaultPolicy = {
    approvalRequired: true,
    dailySendCap: 150,
    allowedSendWindowLocal: {
        tz: "America/Edmonton",
        startHHMM: "08:00",
        endHHMM: "18:00",
    },
    enabledChannels: {
        email: true,
        whatsapp: true,
        telegram: true,
        linkedin: true,
        facebook: true,
    },
};
//# sourceMappingURL=policy.js.map