# Authentication and Security

## Identity and roles

Firebase Auth email/password provides identity. `AuthContext` observes ID-token changes and resolves role from Firestore: `owners/{uid}` means owner; `employees/{uid}` means employee. Owner profiles and employee profiles must be active. Firestore requires verified email; Functions perform operation-specific checks. Web uses session persistence so tabs may maintain separate sessions.

## Tenant authorization

Owner access is scoped by `auth.uid == ownerId`. Employees are scoped by top-level profile `ownerId`, `active`, and `assignedStoreIds`. Owner and employee route layouts redirect invalid roles, but rules and Functions are the security boundaries.

## Firestore

- Owners can read their profile/tenant data, but direct writes are restricted by collection and field.
- Employees can read their profile, assigned active stores/machines, their permitted visits, and their own shifts.
- Direct visit creation/deletion and financial shift/reconciliation writes are denied; Functions use Admin SDK after validation.
- Client visit updates are limited to print metadata.
- Cross-tenant access is denied.

## Storage

Visit image paths are tenant/store/visit scoped. Owners and assigned active employees may read/write; deletes are denied. New images must be JPEG/PNG/WebP and under 5 MB. Unlike Firestore, Storage `signedIn()` does not require verified email.

## Input and transaction safety

Forms, helpers, rules, and Functions validate input. Passwords must be 10–128 characters with a letter, digit, and supported special character for managed lifecycle operations. Settlement/shift-sensitive writes use transactions and captured baseline checks. Secrets are supplied through `EXPO_PUBLIC_FIREBASE_*` environment variables or provider-managed application credentials; `.env` and platform credential files are ignored.

## Hosting controls

Hosting sets no-store HTML caching, immutable fingerprinted asset caching, MIME sniffing prevention, frame denial, and strict-origin referrer policy.

## Known gaps

- `approveOwner` and `getPendingOwners` call `requireActiveOwner`; any active owner can currently invoke them. No platform-admin role/claim was found.
- No Firebase App Check integration was found.
- No application-level callable rate limiter was found.
- No custom CSRF module exists; callable SDK/token protections are relied upon.
- Password hashing is Firebase Auth’s responsibility; no application hashing module exists.
- No centralized client security/error monitoring was found.
