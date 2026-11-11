# Compliance gap report (initial) – LEGAL REVIEW REQUIRED for all items
Date: 2026-11-10. Law research from official sources NOT yet performed (spec section 18); statuses below reflect code only.

| Area | Code status | Open items |
|---|---|---|
| Privacy law / Amendment 13 | Schema: privacy_requests, data_processors, data_processing_records, data_transfers; public request form + API | Staff handling UI, retention jobs, registry applicability check, DPO assessment UI, processor agreements |
| Security regulations | Audit log append-only (DB trigger), session hashing, rate limit, CSRF origin check, CSP headers | Encryption of sensitive fields, backups, access reviews, incident UI, pen test |
| Consumer protection | Cancellation API + receipt record | Prominent transaction-cancel link on home page, confirmation emails, payment-provider cancel, refund flow, pre-purchase disclosures |
| Spam law (s.30A) | Separate unchecked marketing consent, append-only consent log, suppression list, `canSendMarketing()` gate | No marketing sender exists yet; unsubscribe link/flow |
| Cookies | Consent banner, nothing non-essential loaded | Server-side consent record, policy text |
| Accessibility | Labels, focus styles, skip link, RTL, reduced motion | No audit performed; statement is a draft with no conformance claim; coordinator details missing |
| Minors | Birth-year gate with MIN_AGE (must be set) | Age threshold per country, parental consent, policy text |
| Copyright | Table only | Complaint form, admin workflow |
| AI transparency | Notice in chat UI + system prompt | Policy text, AI-content labelling check |
| International | Locale only | GDPR/UK/CCPA/EU AI Act applicability analysis, country layer |

## Missing from owner (MISSING CONFIGURATION)
Legal name, business number, address, contact/privacy/accessibility emails and phone, DPO details (if required), VAT status, governing law/venue, plan prices and currencies, refund policy, MIN_AGE, payment and invoice providers, retention periods.
