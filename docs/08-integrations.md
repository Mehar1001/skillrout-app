# Integrations

| Service | Purpose | Data flow | Authentication/source of truth | Failure behavior |
|---|---|---|---|---|
| Firebase Auth | Email/password identity and verification | Client/Functions ↔ Firebase | Firebase ID token | Sign-in/route guards reject invalid role or inactive profile |
| Cloud Firestore | Operational database | Client/Functions ↔ Firestore | ID token rules or Admin SDK | Rules deny unauthorized access; callable Functions return `HttpsError` |
| Firebase Storage | Visit machine/receipt images | Client ↔ Storage | ID token + Storage rules | Upload errors surface to visit/draft flow |
| Cloud Functions | Privileged business operations | Client → callable endpoints | Firebase callable auth context | Structured status codes/messages |
| Google Cloud Vision | Receipt document OCR | Function → Vision | Application default credentials | Function logs and returns OCR failure |
| Expo Print/Sharing | PDF/print/share output | Client → OS/browser | Local platform APIs | UI displays operation errors where implemented |
| XLSX | Shift workbook generation | Client-side | None | Report screen logs and displays export errors |
| AsyncStorage | Offline visit drafts | Client ↔ device storage | Per-device app storage | Invalid JSON is treated as no drafts; retries/conflicts are recorded |
| EAS | Native build profiles | Build tooling → Expo | External CLI/account configuration | Not defined in application runtime |

No payment, SMS, transactional-email, analytics, or external monitoring integration is present in dependencies or source.
