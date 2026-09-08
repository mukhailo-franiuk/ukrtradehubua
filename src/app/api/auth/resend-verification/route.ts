
import { NextResponse } from 'next/server';

import { db } from '@/lib/prisma';
import { createEmailVerification } from '@/lib/auth/email-verification';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Content-Type must be application/json',
        },
        { status: 415 }
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email обовʼязковий',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // FIND USER
    // =========================================================

    const user = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        isBlocked: true,
        status: true,
      },
    });

    // =========================================================
    // GENERIC RESPONSE
    // =========================================================
    //
    // Не повідомляємо, чи існує такий email.
    // Це захищає endpoint від email enumeration.
    //

    const genericResponse = () =>
      NextResponse.json(
        {
          success: true,
          code: 'VERIFICATION_EMAIL_REQUESTED',
          message:
            'Якщо акаунт з цією адресою існує та email ще не підтверджено, ми надіслали новий лист підтвердження.',
        },
        { status: 200 }
      );

    // =========================================================
    // USER DOES NOT EXIST
    // =========================================================

    if (!user) {
      return genericResponse();
    }

    // =========================================================
    // EMAIL ALREADY VERIFIED
    // =========================================================

    if (user.emailVerifiedAt) {
      return genericResponse();
    }

    // =========================================================
    // BLOCKED / SUSPENDED
    // =========================================================

    if (
      user.isBlocked ||
      user.status === 'BLOCKED' ||
      user.status === 'SUSPENDED'
    ) {
      return genericResponse();
    }

    // =========================================================
    // CREATE NEW VERIFICATION TOKEN + SEND EMAIL
    // =========================================================

    try {
      await createEmailVerification({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      console.log(
        `VERIFICATION EMAIL RESENT: ${user.email}`
      );
    } catch (emailError) {
      console.error(
        `RESEND VERIFICATION EMAIL ERROR: ${user.email}`,
        emailError
      );

      return NextResponse.json(
        {
          success: false,
          code: 'EMAIL_VERIFICATION_SEND_FAILED',
          message:
            'Не вдалося відправити лист підтвердження. Спробуйте ще раз пізніше.',
        },
        { status: 500 }
      );
    }

    return genericResponse();
  } catch (error) {
    console.error(
      'RESEND VERIFICATION ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Помилка під час повторної відправки листа',
      },
      { status: 500 }
    );
  }
}