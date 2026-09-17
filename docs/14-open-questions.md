# Open Questions

## Product
- Who is permitted to approve owner-account requests?
- Is employee-created store/machine onboarding a permanent supported capability?
- Is visit voiding required, or is adjustment the final correction model?
- Must every offline replay belong to the active collection shift?

## Architecture
- Should the large `functions/src/index.ts` module be decomposed?
- Should report and XLSX generation remain client-side?

## Security
- Should owner approval use a custom admin claim, allowlist, or administrator collection?
- Should Storage require verified email as Firestore does?
- Is Firebase App Check planned?
- What rate limits are required for callable Functions and OCR?

## Data
- How should legacy visits without `shiftId` be handled?
- Is Firestore TTL configured externally for `ocrCache`?
- Is the `voided` shape legacy or planned?
- What retention/deletion policy applies to visits, activity, employee identities, and images?

## Infrastructure
- Is `skillrout-staging` provisioned and isolated?
- Is staging allowed to use production services?
- Confirm Firestore’s deployed region; `nam5` is documented but not encoded in repo configuration.
- Are production backup and restore procedures configured and tested?

## Integration
- Are Cloud Vision quota, billing, and failures monitored externally?
- Is Storage enabled in every target environment?

## Testing
- What automated coverage threshold is required?
- Which browser/native E2E framework should be adopted?
- Should emulator tests cover every Collection Shift transition and collection-group query?
