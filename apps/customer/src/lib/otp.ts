/**
 * STUB until the SMS/OTP backend exists. Nothing is sent: requestOtp always
 * succeeds and verifyOtp accepts any 6 digits except 000000, which exercises
 * the wrong-code state. Replace both functions with real API calls.
 */
export const OTP_IS_STUBBED = true;

export const OTP_LENGTH = 6;
export const RESEND_AFTER_SECONDS = 30;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function requestOtp(_phone:string):Promise<void>{throw new Error('OTP is coming soon. Use pilot name and phone sign-in.');}
export async function verifyOtp(_phone:string,_code:string):Promise<{ok:false;reason:'wrong-code'}>{return {ok:false,reason:'wrong-code'};}

/** Indian mobile numbers are 10 digits starting with 6–9. */
export function isValidIndianMobile(digits: string) {
  return /^[6-9]\d{9}$/.test(digits);
}

export function formatIndianMobile(digits: string) {
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
