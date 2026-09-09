
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { put, del } from "@vercel/blob";

import { db } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/* =========================================================
   SESSION
   ========================================================= */

function getSessionToken(
  request: Request
): string | null {
  const cookieHeader =
    request.headers.get("cookie");

  if (
    typeof cookieHeader !== "string" ||
    !cookieHeader
  ) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separatorIndex =
      cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie
      .slice(0, separatorIndex)
      .trim();

    if (name !== "session_token") {
      continue;
    }

    const value = cookie
      .slice(separatorIndex + 1)
      .trim();

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

async function getCurrentUser(
  request: Request
) {
  const sessionToken =
    getSessionToken(request);

  if (!sessionToken) {
    return null;
  }

  const session =
    await db.session.findUnique({
      where: {
        token: sessionToken,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    await db.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => {});

    return null;
  }

  return session.user;
}

/* =========================================================
   GET
   /api/auth/profile/avatar
   ========================================================= */

export async function GET(
  request: Request
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Необхідно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    const avatar =
      await db.userAvatar.findUnique({
        where: {
          userId: user.id,
        },
      });

    return NextResponse.json({
      success: true,
      avatar: avatar
        ? {
            id: avatar.id,
            url: avatar.url,
            alt: avatar.alt,
            width: avatar.width,
            height: avatar.height,
            createdAt: avatar.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "GET AVATAR ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося отримати аватар.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   /api/auth/profile/avatar
   ========================================================= */

export async function POST(
  request: Request
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Необхідно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    const formData =
      await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Файл не вибрано.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATION
       ===================================================== */

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Дозволені формати: JPG, PNG та WebP.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Файл порожній.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Максимальний розмір фото — 5 МБ.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       EXISTING AVATAR
       ===================================================== */

    const existingAvatar =
      await db.userAvatar.findUnique({
        where: {
          userId: user.id,
        },
      });

    /* =====================================================
       FILE EXTENSION
       ===================================================== */

    let extension: string;

    switch (file.type) {
      case "image/jpeg":
        extension = "jpg";
        break;

      case "image/png":
        extension = "png";
        break;

      case "image/webp":
        extension = "webp";
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message:
              "Непідтримуваний формат зображення.",
          },
          { status: 400 }
        );
    }

    /* =====================================================
       BLOB PATH
       ===================================================== */

    const filename =
      `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;

    /* =====================================================
       UPLOAD TO VERCEL BLOB
       ===================================================== */

    const blob = await put(
      filename,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type,
      }
    );

    /* =====================================================
       DATABASE
       ===================================================== */

    const avatar =
      await db.userAvatar.upsert({
        where: {
          userId: user.id,
        },

        create: {
          userId: user.id,
          url: blob.url,
          alt: user.name
            ? `Фото профілю ${user.name}`
            : "Фото профілю користувача",
          width: null,
          height: null,
        },

        update: {
          url: blob.url,
          alt: user.name
            ? `Фото профілю ${user.name}`
            : "Фото профілю користувача",
          width: null,
          height: null,
        },
      });

    /* =====================================================
       DELETE OLD BLOB
       ===================================================== */

    if (
      existingAvatar?.url &&
      existingAvatar.url !== blob.url
    ) {
      try {
        await del(
          existingAvatar.url
        );
      } catch (error) {
        /*
         * Новий файл і запис у БД вже успішні.
         * Помилка видалення старого файлу
         * не повинна ламати відповідь.
         */
        console.error(
          "OLD AVATAR DELETE ERROR:",
          error
        );
      }
    }

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json({
      success: true,
      message:
        "Фото профілю успішно завантажено.",

      avatar: {
        id: avatar.id,
        url: avatar.url,
        alt: avatar.alt,
        width: avatar.width,
        height: avatar.height,
        createdAt: avatar.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "UPLOAD AVATAR ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося завантажити фото профілю.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE
   /api/auth/profile/avatar
   ========================================================= */

export async function DELETE(
  request: Request
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Необхідно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    const avatar =
      await db.userAvatar.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (!avatar) {
      return NextResponse.json({
        success: true,
        message:
          "Фото профілю вже відсутнє.",
      });
    }

    /* =====================================================
       DELETE BLOB
       ===================================================== */

    try {
      await del(avatar.url);
    } catch (error) {
      console.error(
        "AVATAR BLOB DELETE ERROR:",
        error
      );
    }

    /* =====================================================
       DELETE DATABASE RECORD
       ===================================================== */

    await db.userAvatar.delete({
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Фото профілю видалено.",
    });
  } catch (error) {
    console.error(
      "DELETE AVATAR ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося видалити фото профілю.",
      },
      { status: 500 }
    );
  }
}