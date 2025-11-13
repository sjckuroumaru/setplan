import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "reset@setplan.app",
      to: email,
      subject: "【Set Plan】パスワードリセットのご案内",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f9fafb;
                border-radius: 8px;
                padding: 30px;
                margin: 20px 0;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #1f2937;
                font-size: 24px;
                margin: 0;
              }
              .content {
                background-color: white;
                border-radius: 6px;
                padding: 25px;
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background-color: #2563eb;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
              .button:hover {
                background-color: #1d4ed8;
              }
              .link {
                color: #6b7280;
                font-size: 14px;
                word-break: break-all;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
              .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin: 15px 0;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Set Plan</h1>
              </div>

              <div class="content">
                <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">パスワードリセットのご案内</h2>

                <p>パスワードのリセットリクエストを受け付けました。</p>

                <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>

                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">パスワードをリセット</a>
                </div>

                <p class="link">ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：<br>
                ${resetUrl}</p>

                <div class="warning">
                  <strong>⚠️ 重要</strong><br>
                  このリンクは24時間有効です。期限が切れた場合は、再度パスワードリセットをリクエストしてください。
                </div>

                <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                  ※このメールに心当たりがない場合は、このメールを無視してください。<br>
                  第三者がアクセスすることはできません。
                </p>
              </div>

              <div class="footer">
                <p>このメールは Set Plan から自動送信されています。</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error("Email sending error:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}
