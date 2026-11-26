type Locale = 'en' | 'ko' | 'ja';

interface EmailTemplate {
  subject: string;
  text: (token: string) => string;
  html: (token: string) => string;
}

export const emailTemplatesMartie: Record<Locale, EmailTemplate> = {
  en: {
    subject: 'Please verify your email for Martie',
    text: (token: string) =>
      `Hello, this is Martie,\n\nVerification code: ${token}\n\nPlease enter the above code in the app to complete the login process.`,
    html: (token: string) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Martie - Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <tr>
                  <td style="padding: 48px 48px 24px 48px; text-align: center;">
                    <h2 style="margin: 0 0 24px 0; font-size: 36px; font-weight: 700; color: #252565;">Martie</h2>
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">Welcome to Martie!</h1>
                    <p style="margin: 0; font-size: 16px; color: #666666;">Please verify your email to continue</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px 48px 48px;">
                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
                      <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">Your verification code</p>
                      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</span>
                      </div>
                      <p style="margin: 16px 0 0 0; font-size: 14px; color: #666666;">Enter this code in the app to complete sign in</p>
                    </div>
                    <div style="margin-top: 32px; padding: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>Security tip:</strong> This code expires in 15 minutes. Never share this code with anyone.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                      If you didn't request this email, please ignore it.<br>
                      © 2024 Martie. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  },
  ko: {
    subject: 'Martie 이메일 인증 안내',
    text: (token: string) =>
      `안녕하세요 마티에요,\n\n인증 코드: ${token}\n\n위 코드를 앱에 입력하여 로그인 절차를 완료해 주세요.`,
    html: (token: string) => `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Martie - 이메일 인증</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans KR', sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <tr>
                  <td style="padding: 48px 48px 24px 48px; text-align: center;">
                    <h2 style="margin: 0 0 24px 0; font-size: 36px; font-weight: 700; color: #252565;">Martie</h2>
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">마티에 오신 것을 환영합니다!</h1>
                    <p style="margin: 0; font-size: 16px; color: #666666;">계속하려면 이메일을 인증해 주세요</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px 48px 48px;">
                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
                      <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">인증 코드</p>
                      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</span>
                      </div>
                      <p style="margin: 16px 0 0 0; font-size: 14px; color: #666666;">앱에서 위 코드를 입력하여 로그인을 완료하세요</p>
                    </div>
                    <div style="margin-top: 32px; padding: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>보안 안내:</strong> 이 코드는 15분 후에 만료됩니다. 절대 다른 사람과 공유하지 마세요.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                      이 이메일을 요청하지 않으셨다면 무시해 주세요.<br>
                      © 2024 Martie. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  },
  ja: {
    subject: 'マティのメール認証のご案内',
    text: (token: string) =>
      `こんにちは、マティです、\n\n認証コード: ${token}\n\n上記のコードをアプリに入力して、ログイン手続きを完了してください。`,
    html: (token: string) => `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Martie - メール認証</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans JP', sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <tr>
                  <td style="padding: 48px 48px 24px 48px; text-align: center;">
                    <h2 style="margin: 0 0 24px 0; font-size: 36px; font-weight: 700; color: #252565;">Martie</h2>
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">マティへようこそ！</h1>
                    <p style="margin: 0; font-size: 16px; color: #666666;">続行するにはメールを認証してください</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px 48px 48px;">
                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
                      <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 0.5px;">認証コード</p>
                      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: 700; color: #1a1a1a; letter-spacing: 4px; font-family: 'Courier New', monospace;">${token}</span>
                      </div>
                      <p style="margin: 16px 0 0 0; font-size: 14px; color: #666666;">アプリで上記のコードを入力してサインインを完了してください</p>
                    </div>
                    <div style="margin-top: 32px; padding: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>セキュリティのヒント：</strong>このコードは15分後に期限切れになります。このコードを他の人と共有しないでください。
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                      このメールに心当たりがない場合は、無視してください。<br>
                      © 2024 Martie. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  },
};
interface SignInLinkTemplate {
  subject: string;
  text: (link: string) => string;
  html: (link: string) => string;
}

interface SignInLinkCopy {
  lang: Locale;
  subject: string;
  heading: string;
  lead: string;
  button: string;
  fallback: string;
  tip: string;
  ignore: string;
}

const signInLinkCopy: Record<Locale, SignInLinkCopy> = {
  en: {
    lang: 'en',
    subject: 'Your Martie sign-in link',
    heading: 'Sign in to Martie',
    lead: 'Tap the button on the phone where you asked for this email.',
    button: 'Sign in to Martie',
    fallback: 'If the button does not work, open this link on that phone:',
    tip: 'This link expires in 10 minutes and works only in the Martie app on the phone that requested it. Never share it with anyone.',
    ignore: "If you didn't request this email, please ignore it.",
  },
  ko: {
    lang: 'ko',
    subject: 'Martie 로그인 링크',
    heading: '마티에 로그인하기',
    lead: '이 메일을 요청한 휴대폰에서 아래 버튼을 눌러주세요.',
    button: '마티 로그인',
    fallback: '버튼이 동작하지 않으면 그 휴대폰에서 이 링크를 열어주세요:',
    tip: '이 링크는 10분 후 만료되며, 요청한 휴대폰의 마티 앱에서만 동작해요. 다른 사람과 절대 공유하지 마세요.',
    ignore: '이 메일을 요청하지 않았다면 무시하셔도 됩니다.',
  },
  ja: {
    lang: 'ja',
    subject: 'マティのログインリンク',
    heading: 'マティにログイン',
    lead: 'このメールをリクエストしたスマートフォンで下のボタンをタップしてください。',
    button: 'マティにログイン',
    fallback:
      'ボタンが動作しない場合は、そのスマートフォンでこのリンクを開いてください：',
    tip: 'このリンクは10分で期限切れとなり、リクエストしたスマートフォンのマティアプリでのみ使えます。他の人と共有しないでください。',
    ignore: 'このメールに心当たりがない場合は、無視してください。',
  },
};

const signInLinkTemplate = (copy: SignInLinkCopy): SignInLinkTemplate => ({
  subject: copy.subject,
  text: (link: string) =>
    `${copy.heading}\n\n${copy.lead}\n\n${link}\n\n${copy.tip}\n\n${copy.ignore}`,
  html: (link: string) => `
      <!DOCTYPE html>
      <html lang="${copy.lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${copy.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <tr>
                  <td style="padding: 48px 48px 24px 48px; text-align: center;">
                    <h2 style="margin: 0 0 24px 0; font-size: 36px; font-weight: 700; color: #252565;">Martie</h2>
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">${copy.heading}</h1>
                    <p style="margin: 0; font-size: 16px; color: #666666;">${copy.lead}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px 48px 48px;">
                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
                      <a href="${link}" style="display: inline-block; background-color: #252565; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px;">${copy.button}</a>
                      <p style="margin: 24px 0 8px 0; font-size: 13px; color: #666666;">${copy.fallback}</p>
                      <p style="margin: 0; font-size: 13px; color: #252565; word-break: break-all;">${link}</p>
                    </div>
                    <div style="margin-top: 32px; padding: 24px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">${copy.tip}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                      ${copy.ignore}<br>
                      © 2024 Martie. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
});

export const signInLinkTemplatesMartie: Record<Locale, SignInLinkTemplate> = {
  en: signInLinkTemplate(signInLinkCopy.en),
  ko: signInLinkTemplate(signInLinkCopy.ko),
  ja: signInLinkTemplate(signInLinkCopy.ja),
};
