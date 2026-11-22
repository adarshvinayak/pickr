# Gemini voice booking agent (customer app)

Customer taps the mic on Home → a live voice conversation (English or Malayalam, switching as the customer switches) fills the booking and opens the **summary** screen.

## Setup
Server env (`.env.local` / Render): `GEMINI_API_KEY` (required), optional `GEMINI_LIVE_MODEL` (default `gemini-3.8-live`) and `GEMINI_LIVE_VOICE` (default `Kore`). The key never leaves the server.

## How it works
1. App asks the microphone, then `POST /api/voice/session` (customer login required) with the material catalogue and the customer's saved sites.
2. `src/lib/voice-agent.ts` builds the prompt + tool list and locks them inside a **single-use ephemeral token** (2 min to start, 20 min max, 20 sessions/customer/hour). The app connects to Gemini Live directly with that token.
3. Gemini calls tools; `apps/customer/src/lib/voice-agent/controller.ts` validates them and mirrors results into the booking draft.
   - `update_booking` (material, quantity, when, helpers, notes) → returns what is still `missing`.
   - `use_saved_site` only for a saved site the customer named. `request_map_pick` for everything else. **No tool accepts an address**, so a location can never be guessed.
   - `finish_booking` is refused until material, quantity, pickup, drop and time are all known.
4. Map: the app opens the picker, mutes the mic, and resumes when the customer returns (or tells the agent the map was closed). Then it asks for what is missing or opens the summary.
5. Materials that need a mineral transit pass (river sand, jelly, soil) go summary-bound via the pass step, because the pass photo cannot be taken by voice.

## Fallbacks
No microphone permission, no service/key, or a platform without audio streaming → the previous guided typed conversation opens with a short notice. "Type instead" does the same on demand.

## Platforms
- **Web (`/customer-app`)**: `audio.web.ts` (getUserMedia + AudioWorklet, browser echo cancellation).
- **Android / iOS**: `audio.ts` uses `react-native-audio-api` (native module, config plugin in `apps/customer/app.json`). 16 kHz mono capture with the platform echo canceller (Android `voiceCommunication` preset + communication mode on API 31+, routed to the loudspeaker; iOS voice-processing I/O), 24 kHz playback through one ordered buffer queue. It adds only `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` (no foreground service, no iOS background audio).
- **Needs a development build, not Expo Go.** Expo Go lacks the module, so the app reports "unsupported" and uses the typed fallback. Build with JDK 17 + Android SDK/NDK:
  `cd apps/customer && npx expo prebuild --platform android && npx expo run:android` (or an EAS development build).
- Shared helpers `pcm.ts` (resampling, PCM16/base64) are unit-tested in `tests/voice-agent-pcm.test.ts`.

## Tests
`LIVE_GEMINI=1 GEMINI_API_KEY=… npx vitest run tests/voice-agent.live.test.ts` runs the opt-in real-API checks (skipped by default): English one-sentence booking, saved site vs map, asking for missing details, Malayalam speech in/out, and language switching.

`tests/voice-agent.test.ts` (token config, no free-text address tool, rate limit) and `tests/voice-agent-controller.test.ts` (slot filling, never-guess locations, validation, language detection).
