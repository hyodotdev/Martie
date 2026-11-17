const RESEND_API_ENDPOINT = 'https://api.resend.com/emails';

const isProduction = process.env.ENVIRONMENT === 'production';

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
}

export async function sendResendEmail(
  apiKey: string | undefined,
  payload: ResendEmailPayload,
) {
  if (!isProduction) {
    console.info('[resend] Skipping email delivery in non-production env', {
      to: payload.to,
      subject: payload.subject,
      textPreview: payload.text,
    });
    return {skipped: true};
  }

  if (!apiKey) {
    throw new Error('Resend API key is not configured');
  }

  const response = await fetch(RESEND_API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // no-op; some responses may not include JSON body
  }

  if (!response.ok || data?.error) {
    const errorMessage =
      data?.error?.message ??
      data?.message ??
      `Resend request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}
