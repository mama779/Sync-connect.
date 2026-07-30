# Security Specification: Sync Connect Firebase rules

## 1. Data Invariants
- An Affiliate profile cannot be updated or created with unauthorized `role` overrides or privilege escalations (must prevent self-assigning Admin roles).
- `createdAt` and `uid` fields on Affiliate and Buyer profiles are immutable.
- A student cannot modify comments or chat messages authored by other users.
- Live chat messages must adhere to a strict length limit (max 150 characters) to prevent database resource exhaustion.
- Sales records can only be created by buyers or registered affiliates registering valid sales, and are immutable once finalized (or can only be modified by admins).

## 2. The Dirty Dozen Payloads (Target Rejections)
1. **Self-Escalation**: User `u123` attempts to write `role: "admin"` to their own `/affiliates/u123` document.
2. **Identity Spoofing**: User `u123` attempts to create `/academy_comments/comment999` with `userId: "attacker_id"`.
3. **Immutability Breach**: User `u123` attempts to change `/affiliates/u123`'s `createdAt` timestamp after it has been created.
4. **Junk ID Poisoning**: Accessing a document ID that is not valid alphanumeric, e.g. `/affiliates/INVALID*#&@`.
5. **Blanket Query Scraping**: Attempting to list all sales records without specifying a specific affiliate `where` clause.
6. **Chat Value Poisoning**: Sending a chat message with a 1MB payload string.
7. **Orphaned Sales**: Attempting to create a sale for a product ID that does not exist in the `/products` catalog.
8. **Malicious Progress Tampering**: Attacker attempts to mark another user's academy progress as completed.
9. **Release Spoofing**: Regular affiliate attempts to create or edit a record in `/app_releases`.
10. **Site Config Overwrite**: Non-admin user attempts to write to `/site_config/active_live` to start a fake webinar stream.
11. **Spoofed Email Access**: User tries to register an affiliate with `email_verified = false` but matching the admin email format.
12. **Out of bounds comments**: Submitting a course comment without a valid `lessonId`.

## 3. Test Invariant Mapping
- All standard user write operations are guarded by `request.auth.uid == userId` or equivalent checks.
- All structural schemas are verified on creation using custom validation helpers.
