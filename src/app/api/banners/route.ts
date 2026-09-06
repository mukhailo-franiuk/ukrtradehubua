import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const banners = await db.banner.findMany({
      where: {
        position: "HOME_HERO",
        isActive: true,

        AND: [
          {
            OR: [
              {
                startsAt: null,
              },
              {
                startsAt: {
                  lte: now,
                },
              },
            ],
          },
          {
            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gte: now,
                },
              },
            ],
          },
        ],
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      select: {
        id: true,
        imageUrl: true,
        mobileImageUrl: true,
        title: true,
        subtitle: true,
        linkUrl: true,
        position: true,
        sortOrder: true,
        startsAt: true,
        endsAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        banners,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/banners error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати банери",
        banners: [],
      },
      {
        status: 500,
      }
    );
  }
}