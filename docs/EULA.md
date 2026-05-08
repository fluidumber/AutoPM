# AutoPM — Terms of Service
**Version 1.0** | Effective from first `accept-terms` call

---

## 1. Acceptance

By calling the `accept-terms` MCP tool with `agreedToTerms: true`, you ("the PM") agree to the terms below. You must accept once per persona before running robot analyses.

---

## 2. What data AutoPM stores

AutoPM stores data **locally only**, inside two locations on your machine:

- `data/brain-database.json` — robot ratings, feedback notes, learned patterns (knowledge layer), and process improvement suggestions.
- `~/.productflow/products/<slug>/` — product context, interview answers, robot output files, and PM notes.

No data is transmitted to Anthropic, the AutoPM maintainers, or any third party **unless you explicitly configure email notifications** (see Section 4).

---

## 3. What the knowledge layer stores

The knowledge layer (`brain-database.json → knowledgeLayer`) stores anonymised pattern strings derived from your feedback notes — for example:

> `"scout: add specific TAM numbers"`

These strings are used to improve future robot runs on your machine. They are never associated with a product name, company name, or PM identity in the stored record.

---

## 4. Process improvement notifications (optional)

If you set the `PRODUCTFLOW_OWNER_EMAIL` and SMTP environment variables, AutoPM will email the configured address when a process improvement suggestion crosses the notification threshold (`NOTIFICATION_THRESHOLD`, default 3).

Notification emails contain:
- The suggestion type (`improve-robot` or `new-robot`)
- The robot name (if applicable)
- The frequency count (how many feedback events triggered it)
- Up to 5 anonymised feedback note excerpts

Notification emails **do not** contain:
- Product names, ideas, or business details
- PM names, email addresses, or account identifiers
- Any analysis output or PDD content

You can disable notifications at any time by unsetting `PRODUCTFLOW_OWNER_EMAIL`.

---

## 5. Open-source software

AutoPM is open-source software. The source code is publicly available and you are free to inspect, fork, or modify it. The terms above describe the default behaviour of the unmodified software.

---

## 6. No warranty

AutoPM is provided "as is", without warranty of any kind. The maintainers are not liable for any loss of data or business outcomes resulting from use of this software.

---

*To accept these terms, call `accept-terms({ agreedToTerms: true })` in your MCP session.*
