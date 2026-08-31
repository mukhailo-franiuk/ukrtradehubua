
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
   CREATE SESSION
============================================================ */

export async function createSession(
  userId: string
) {
  const token = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION
  );

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

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

  cookieStore.delete(SESSION_COOKIE_NAME);
}