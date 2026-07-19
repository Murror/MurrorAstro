# Private Shared-Photo Storage Design

**Status:** Approved for staging implementation

## Purpose

Shared-memory photos are private to the two people in a connection. The current
implementation uploads sanitized images to the Supabase `public` bucket and
persists an indefinite `publicUrl` in `shared_photos`. Anyone who obtains that
URL can fetch the photo without a membership check. This design removes that
exposure without changing the mobile or web response contract.

## Decision

Use **verified copy, then immediate revoke** for staging:

1. New photos are written to a private `memories-private` bucket.
2. The API returns a five-minute signed URL in the existing `publicUrl` response
   property only after the existing connection-membership check succeeds.
3. Existing staging photos are copied to the private bucket, their object size
   and content metadata are verified, their database row is marked private,
   then the original public object is deleted in the same per-row migration
   unit.

The API never persists a signed URL. The field name stays temporarily for
backward compatibility with current clients; it represents an authorized,
short-lived delivery URL rather than a public address.

## Options considered

| Option | Privacy | Operational cost | Decision |
| --- | --- | --- | --- |
| Verified copy then immediate revoke | Removes disclosed public objects as soon as each copy verifies | Moderate migration work | Chosen |
| Copy all files, then delay revocation | Allows rollback through the public bucket | Leaves the exposure open during the grace period | Rejected |
| Authenticated image proxy | Strongest control and supports richer auditing | Adds a streaming service, caching, and bandwidth load | Deferred |

## Data model and API contract

Add a nullable `storageBucket` field to `SharedPhoto`.

- `null` means legacy object in `public` while migration is in progress.
- `memories-private` means the row has been copied, verified, and no longer
  relies on a public object.
- Do not make the column non-null in this change. That follow-up happens only
  after staging contains no legacy rows.

`storagePath` remains the stable object key. `publicUrl` remains temporarily in
the table for compatibility, but new writes store no durable URL and response
mappers generate a fresh signed URL. A later cleanup migration can remove the
legacy column after all supported clients have adopted the behavior.

## Request lifecycle

### New photo

1. Validate connection membership before image processing.
2. Strip metadata, enforce the size and pixel limits, and downsize oversized
   images before storage.
3. Upload the sanitized bytes to `memories-private` with the connection-scoped
   key already used today.
4. Insert a row with `storageBucket = memories-private` and no durable URL.
5. Generate a five-minute signed URL for the response only.
6. If database insertion fails, remove the newly created private object.

The batch upload path follows the same lifecycle for every selected
connection.

### Read and delete

1. Resolve the connection using the existing membership helper.
2. Read the row and generate a five-minute signed URL from its bucket and
   `storagePath`.
3. Never return the database value of `publicUrl` to clients.
4. On deletion, remove the object from the row's bucket after the soft delete.

The unseen-memory thumbnail read also generates a signed URL, rather than
selecting a stored public one.

## Existing staging migration

The migration is an idempotent, resumable administrative command. It is
staging-only and uses the service-role client from a chmod-600 environment
file. It must never print secrets or signed URLs.

For each legacy row, in a transaction-safe sequence:

1. Read the object from `public` using `storagePath`.
2. Upload it under the same path to `memories-private` with its recorded MIME
   type.
3. Download or inspect the private copy and verify byte length and MIME type.
4. Update the row to `storageBucket = memories-private` and clear its durable
   `publicUrl`.
5. Delete the `public` object.
6. Record a redacted outcome by row id and path hash only.

If a copy or verification fails, do not update the row and do not delete the
public object. Re-running the command safely skips rows already marked private.
After completion, query for any `storageBucket IS NULL` rows and orphaned
objects in either bucket. The migration is only complete when both sets are
empty except for explicitly documented failures.

## Security and operational guardrails

- The private bucket is not public and has no broad client read policy. The API
  service role performs storage access after application authorization.
- Signed URLs expire in five minutes. No logs, database records, analytics
  events, or error responses include a signed URL.
- Storage operations use bounded retry with redacted errors. Failed deletion is
  observable and blocks the row from being reported migrated.
- Existing direct public URLs become unavailable immediately after their source
  object is deleted.
- This migration is first executed on `nsp-staging-murror` only. Production
  remains a release gate and requires a separate explicit approval.

## Acceptance checks

1. A connection member can create, list, view, and delete a memory normally.
2. A non-member receives no memory response and cannot obtain a signed URL.
3. A new database row has `storageBucket = memories-private` and no durable
   public URL.
4. A response URL expires after its configured TTL and is refreshed on a later
   authorized read.
5. Single and batch create remove private orphans when their row insert fails.
6. A migrated legacy row has a verified private object, a cleared durable URL,
   and no corresponding public object.
7. Failed migration rows retain their public object and are visible in the
   redacted migration report for a safe retry.
8. Focused API tests, lint, type checking, and the staging migration dry run
   pass before any actual object revocation.

## Rollout and rollback

Deploy the API code and database migration before the data mover. First run the
data mover in dry-run mode, then copy-and-verify mode on a small bounded batch,
then revoke the matching public objects. Stop immediately on verification or
authorization failures.

Code rollback remains possible before data migration starts. After a row's
public source is revoked, rollback requires the new API behavior because the
row is deliberately private. The private object remains the recovery source;
we do not recreate public URLs as a rollback mechanism.
