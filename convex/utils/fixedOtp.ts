/**
 * The fixed OTP a deployment accepts for its allow-listed emails. Production
 * only honors the App Review code; development prefers its own dev code so a
 * review code set on dev does not shadow it.
 */
export function fixedOtpCodeFor({
  isProduction,
  reviewCode,
  devCode,
}: {
  isProduction: boolean;
  reviewCode: string | null;
  devCode: string | null;
}): string | null {
  const code = isProduction ? reviewCode : (devCode ?? reviewCode);
  return code?.trim() || null;
}
