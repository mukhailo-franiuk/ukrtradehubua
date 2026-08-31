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

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : null;

    const phone =
      typeof body.phone === 'string'
        ? body.phone.trim()
        : null;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email та пароль обовʼязкові',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Пароль повинен містити мінімум 8 символів',
        },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Користувач з таким email вже існує',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    await createSession(user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Реєстрація успішна',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Помилка під час реєстрації',
      },
      { status: 500 }
    );
  }
}