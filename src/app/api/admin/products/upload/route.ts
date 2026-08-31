import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // AUTH
    // =====================================================

    const token =
      request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Не авторизовано",
        },
        { status: 401 }
      );
    }

    const session =
      await db.session.findUnique({
        where: {
          token,
        },
        include: {
          user: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Сесію не знайдено",
        },
        { status: 401 }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Сесія завершена",
        },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "ADMIN" ||
      session.user.isBlocked
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // FORM DATA
    // =====================================================

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Файл не передано",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Дозволені формати: JPG, PNG, WEBP та AVIF",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Максимальний розмір зображення — 5 MB",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Файл порожній",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FILE EXTENSION
    // =====================================================

    const extensionMap: Record<
      string,
      string
    > = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };

    const extension =
      extensionMap[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Невідомий формат зображення",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // UNIQUE FILE NAME
    // =====================================================

    const timestamp = Date.now();

    const random =
      crypto.randomUUID();

    const pathname =
      `products/${timestamp}-${random}.${extension}`;

    // =====================================================
    // UPLOAD TO VERCEL BLOB
    // =====================================================

    const blob = await put(
      pathname,
      file,
      {
        access: "public",
        addRandomSuffix: false,
      }
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Зображення товару успішно завантажено",
        imageUrl: blob.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/products/upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося завантажити зображення товару",
      },
      { status: 500 }
    );
  }
}