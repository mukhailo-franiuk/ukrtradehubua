// src/app/api/admin/banners/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 401 }
      );
    }

    // =====================================================
    // FORM DATA
    // =====================================================

    const formData = await request.formData();

    const file = formData.get("file");

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

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Файл порожній",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Максимальний розмір зображення — 10 MB",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // EXTENSION
    // =====================================================

    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };

    const extension = extensionMap[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          message: "Невідомий формат зображення",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FILE NAME
    // =====================================================

    const pathname =
      `banners/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    // =====================================================
    // VERCEL BLOB
    // =====================================================

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Банер успішно завантажено",
        imageUrl: blob.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/banners/upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося завантажити банер",
      },
      { status: 500 }
    );
  }
}