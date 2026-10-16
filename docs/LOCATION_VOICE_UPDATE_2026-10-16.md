# Location and voice update — 16 October 2026

- Driver web location errors distinguish blocked permission, unavailable location, timeout, insecure origin and unsupported browser. Availability explains actual accuracy when it exceeds the existing 150m matching limit; that dispatch rule is unchanged. Browser/site permission and OS Location must still be enabled by the user. Desktop Wi-Fi positioning can be insufficient.
- Android accepts an already granted coarse location permission without repeatedly asking for fine permission. Driver errors provide a native app-settings shortcut. This is separate from the reported web issue.
- Site pickers use a fixed centre pin. Moving/zooming the map selects its centre after movement ends. Search/saved sites remain available. Admin boundary drawing retains point-by-point map clicks.
- Authenticated reverse-geocode requests run server-side through Mappls. The place summary uses road/locality/village/district and formatted address where returned. Failed lookup preserves the exact coordinates and explicitly reports unavailable address; it never fabricates one.
- Material choices retain single-selection radio semantics and now use circular radio visuals.
- Voice intake retains completed answers as collapsible sections with Change actions above the current question. Confirmed details stay visible while site details, truck choices and fare review are expanded below. Editing a completed answer invalidates the old quote. Edited site/timing details require a refreshed price before booking.
- Spoken quantity prompts expand abbreviations: numbers, bags, boxes, bundles, units, loads and kilograms. The parser accepts “numbers” as well as the legacy “nos”.

Validation: lint, TypeScript and the existing 71 tests passed during implementation. Production web and APK builds are checked separately in the delivery run. Browser/OS permission cannot be silently enabled by the app. Real device GPS recovery and provider reverse-address entitlement still need confirmation on the user's device/environment; this report does not claim those were reproduced.
