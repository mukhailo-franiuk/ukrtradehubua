import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Не авторизовано" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const buttonText =
      typeof body.buttonText === "string"
        ? body.buttonText.trim()
        : "";

    const buttonUrl =
      typeof body.buttonUrl === "string"
        ? body.buttonUrl.trim()
        : "";

    const testEmail =
      typeof body.testEmail === "string"
        ? body.testEmail.trim()
        : "";

    const sendToAll = body.sendToAll === true;

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Вкажіть тему листа" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Вкажіть заголовок" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Вкажіть текст листа" },
        { status: 400 }
      );
    }

    if (!sendToAll && !testEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть email для тестової відправки",
        },
        { status: 400 }
      );
    }

    const safeTitle = escapeHtml(title);

    const safeMessage = escapeHtml(message).replace(
      /\n/g,
      "<br />"
    );

    const buttonHtml =
      buttonText && buttonUrl
        ? `
          <div style="margin-top:32px;">
            <a
              href="${escapeHtml(buttonUrl)}"
              style="
                display:inline-block;
                background:#fbbf24;
                color:#111827;
                padding:14px 24px;
                border-radius:10px;
                text-decoration:none;
                font-weight:700;
              "
            >
              ${escapeHtml(buttonText)}
            </a>
          </div>
        `
        : "";

    const html = `
      <!DOCTYPE html>
      <html lang="uk">
        <body style="
          margin:0;
          padding:0;
          background:#0f172a;
          font-family:Arial,Helvetica,sans-serif;
          color:#f8fafc;
        ">
          <div style="
            max-width:640px;
            margin:40px auto;
            padding:32px;
          ">
            <div style="
              background:#111827;
              border:1px solid #1f2937;
              border-radius:20px;
              padding:36px;
            ">
              <div style="
                font-size:24px;
                font-weight:800;
                margin-bottom:30px;
              ">
                <span style="color:#ffffff;">Ukr</span><span style="color:#fbbf24;">Trade</span><span style="color:#ffffff;">Hub</span>
              </div>

              <h1 style="
                font-size:28px;
                line-height:1.25;
                margin:0 0 20px;
              ">
                ${safeTitle}
              </h1>

              <div style="
                font-size:16px;
                line-height:1.7;
                color:#cbd5e1;
              ">
                ${safeMessage}
              </div>

              ${buttonHtml}

              <div style="
                margin-top:40px;
                padding-top:20px;
                border-top:1px solid #1f2937;
                font-size:13px;
                color:#64748b;
              ">
                UkrTradeHub — український маркетплейс
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Тестовий лист
    if (!sendToAll) {
      await sendEmail({
        to: testEmail,
        subject,
        html,
        text: `${title}\n\n${message}`,
      });

      return NextResponse.json({
        success: true,
        mode: "test",
        sent: 1,
        message: `Тестовий лист відправлено на ${testEmail}`,
      });
    }

    // Отримуємо покупців
    const users = await db.user.findMany({
      where: {
        isBlocked: false,
        role: "CUSTOMER",
      },
      select: {
        email: true,
      },
    });

    const recipients = [
      ...new Set(
        users
          .map((user) => user.email?.trim())
          .filter(
            (email): email is string =>
              Boolean(email)
          )
      ),
    ];

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає отримувачів для розсилки",
        },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const email of recipients) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
          text: `${title}\n\n${message}`,
        });

        sent++;
      } catch (error) {
        failed++;

        console.error(
          `Email sending failed: ${email}`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      mode: "campaign",
      total: recipients.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/email-marketing/send:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося відправити розсилку",
      },
      { status: 500 }
    );
  }
}