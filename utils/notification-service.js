// NotificationService — sends email alerts to the product owner when process
// improvement suggestions exceed the notification threshold.
// Requires SMTP env vars and PRODUCTFLOW_OWNER_EMAIL to be set; silently
// skips notification if they are absent (local installs without email config).

import nodemailer from "nodemailer";

const NOTIFICATION_THRESHOLD = parseInt(process.env.NOTIFICATION_THRESHOLD ?? "3", 10);

export class NotificationService {
    /**
     * @param {import('../brain/brain-database.js').default} database
     */
    constructor(database) {
        this.database    = database;
        this.transporter = nodemailer.createTransport({
            host:   process.env.SMTP_HOST   || "localhost",
            port:   parseInt(process.env.SMTP_PORT ?? "587", 10),
            secure: process.env.SMTP_SECURE === "true",
            auth:   process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || "",
            } : undefined,
        });
    }

    /**
     * Check pending suggestions and email those that have crossed the threshold.
     * Non-fatal — any error is logged, never rethrown.
     */
    async checkAndNotify() {
        const ownerEmail = process.env.PRODUCTFLOW_OWNER_EMAIL;
        if (!ownerEmail) return; // email not configured — skip silently

        const pending = this.database.getPendingProcessImprovements();
        const ready   = pending.filter(s => s.frequency >= NOTIFICATION_THRESHOLD);

        for (const suggestion of ready) {
            try {
                await this._send(ownerEmail, suggestion);
                await this.database.markSuggestionSent(suggestion.id);
                console.log(`📧 Notified owner of ${suggestion.type} suggestion: ${suggestion.robotName || "new-robot"}`);
            } catch (err) {
                console.error(`NotificationService send failed: ${err.message}`);
            }
        }
    }

    // ── Private ──────────────────────────────────────────────────────

    async _send(to, suggestion) {
        const typeLabel  = suggestion.type === "improve-robot"
            ? `Improve robot: ${suggestion.robotName}`
            : "New robot suggested";
        const evidence   = (suggestion.evidence || []).join("\n  - ");
        const subject    = `[AutoPM] Process improvement: ${typeLabel}`;
        const text       = [
            `AutoPM Process Improvement Suggestion`,
            ``,
            `Type:      ${suggestion.type}`,
            `Robot:     ${suggestion.robotName || "(new — not yet named)"}`,
            `Frequency: ${suggestion.frequency} feedback events`,
            `Raised:    ${suggestion.suggestedAt}`,
            ``,
            `Evidence from PM feedback notes:`,
            `  - ${evidence}`,
            ``,
            `This suggestion was generated automatically by the AutoPM ProcessAdvisor.`,
            `No personal data or product-specific content is included.`,
        ].join("\n");

        await this.transporter.sendMail({
            from:    process.env.SMTP_FROM || `autopm-noreply@${process.env.SMTP_HOST || "localhost"}`,
            to,
            subject,
            text,
        });
    }
}
