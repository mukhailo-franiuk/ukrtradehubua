import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

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

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email та пароль обовʼязкові',
        },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Невірний email або пароль',
        },
        { status: 401 }
      );
    }

    if (user.isBlocked || user.status === 'BLOCKED') {
      return NextResponse.json(
        {
          success: false,
          message: 'Ваш акаунт заблокований',
        },
        { status: 403 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          success: false,
          message: 'Ваш акаунт тимчасово призупинений',
        },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Невірний email або пароль',
        },
        { status: 401 }
      );
    }

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      message: 'Вхід успішний',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Помилка під час входу',
      },
      { status: 500 }
    );
  }
}