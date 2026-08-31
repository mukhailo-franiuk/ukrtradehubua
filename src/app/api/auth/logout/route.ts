import { NextResponse } from 'next/server';

import { deleteCurrentSession } from '@/lib/auth';

export async function POST() {
  try {
    await deleteCurrentSession();

    return NextResponse.json({
      success: true,
      message: 'Вихід виконано успішно',
    });
  } catch (error) {
    console.error('LOGOUT ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Помилка під час виходу',
      },
      { status: 500 }
    );
  }
}