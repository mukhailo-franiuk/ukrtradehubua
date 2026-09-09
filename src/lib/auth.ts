import crypto from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/prisma";

/* ============================================================
   SESSION
============================================================ */

export const SESSION_COOKIE_NAME = "session_token";

const SESSION_DURATION =
  1000 * 60 * 60 * 24 * 30; // 30 днів

/* ============================================================
   GET SESSION TOKEN
============================================================ */

export async function getSessionToken() {
  const cookieStore = await cookies();

  return (
    cookieStore.get(SESSION_COOKIE_NAME)?.value ??
    null
  );
}

/* ============================================================
   GET CURRENT USER
============================================================ */

export async function getCurrentUser() {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  /* ==========================================================
     EXPIRED SESSION
  ========================================================== */

  if (session.expiresAt < new Date()) {
    await db.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  /* ==========================================================
     USER ACCESS
  ========================================================== */

  if (
    session.user.status !== "ACTIVE" ||
    session.user.isBlocked
  ) {
    return null;
  }

  return session.user;
}

/* ============================================================
   GET ADMIN
============================================================ */

export async function getAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return user;
}

/* ============================================================
   GET CLIENT IP
============================================================ */

function getClientIp(request?: Request) {
  if (!request) {
    return null;
  }

  /*
   * Vercel / reverse proxy:
   * x-forwarded-for:
   * client, proxy1, proxy2
   */

  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    if (firstIp) {
      return firstIp.slice(0, 100);
    }
  }

  /*
   * Alternative proxy header
   */

  const realIp =
    request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim().slice(0, 100);
  }

  /*
   * Cloudflare
   */

  const connectingIp =
    request.headers.get("cf-connecting-ip");

  if (connectingIp) {
    return connectingIp.trim().slice(0, 100);
  }

  return null;
}

/* ============================================================
   GET USER AGENT
============================================================ */

function getUserAgent(request?: Request) {
  if (!request) {
    return null;
  }

  const userAgent =
    request.headers.get("user-agent");

  if (!userAgent) {
    return null;
  }

  return userAgent.slice(0, 1000);
}

/* ============================================================
   CREATE SESSION
============================================================ */

export async function createSession(
  userId: string,
  request?: Request
) {
  const token = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION
  );

  const ipAddress = getClientIp(request);

  const userAgent = getUserAgent(request);

  /* ==========================================================
     DATABASE
  ========================================================== */

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  /* ==========================================================
     COOKIE
  ========================================================== */

  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/* ============================================================
   DELETE CURRENT SESSION
============================================================ */

export async function deleteCurrentSession() {
  const token = await getSessionToken();

  if (!token) {
    return;
  }

  await db.session.deleteMany({
    where: {
      token,
    },
  });

  const cookieStore = await cookies();

  cookieStore.delete(
    SESSION_COOKIE_NAME
  );
}