
import { NextResponse } from 'next/server';

import { createSession } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { verifyEmailToken } from '@/lib/auth/email-verification';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const token = searchParams.get('token')?.trim() || '';

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: 'TOKEN_REQUIRED',
          message: 'Токен підтвердження відсутній.',
        },
        { status: 400 }
      );
    }

    // =========================================================
    // VERIFY TOKEN
    // =========================================================

    const result = await verifyEmailToken(token);

    if (!result.success) {
      switch (result.reason) {
        case 'EXPIRED':
          return NextResponse.json(
            {
              success: false,
              code: 'EMAIL_VERIFICATION_EXPIRED',
              message:
                'Термін дії посилання минув. Запросіть новий лист підтвердження.',
            },
            { status: 410 }
          );

        case 'USED':
          return NextResponse.json(
            {
              success: false,
              code: 'EMAIL_VERIFICATION_USED',
              message:
                'Це посилання підтвердження вже було використано.',
            },
            { status: 409 }
          );

        case 'INVALID':
        default:
          return NextResponse.json(
            {
              success: false,
              code: 'EMAIL_VERIFICATION_INVALID',
              message:
                'Посилання підтвердження недійсне або пошкоджене.',
            },
            { status: 400 }
          );
      }
    }

    const user = result.user;

    // =========================================================
    // CREATE SESSION
    // =========================================================
    //
    // Важливо:
    // session створюється ТІЛЬКИ після підтвердження email.
    //

    await createSession(user.id);

    // =========================================================
    // WELCOME EMAIL
    // =========================================================
    //
    // Якщо Welcome email не відправиться,
    // підтвердження email і авторизація НЕ скасовуються.
    //

    if (!result.alreadyVerified) {
      try {
        await EmailService.sendWelcome({
          email: user.email,
          name: user.name,
        });

        console.log(
          `WELCOME EMAIL SENT: ${user.email}`
        );
      } catch (emailError) {
        console.error(
          `WELCOME EMAIL ERROR: ${user.email}`,
          emailError
        );
      }
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    return NextResponse.json(
      {
        success: true,
        code: result.alreadyVerified
          ? 'EMAIL_ALREADY_VERIFIED'
          : 'EMAIL_VERIFIED',
        message: result.alreadyVerified
          ? 'Email вже був підтверджений.'
          : 'Email успішно підтверджено.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          status: user.status,
          isBlocked: user.isBlocked,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'VERIFY EMAIL ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: 'EMAIL_VERIFICATION_ERROR',
        message:
          'Не вдалося підтвердити email. Спробуйте ще раз.',
      },
      { status: 500 }
    );
  }
}

