
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminShell from "./components/AdminShell";
import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: {
    default: "Адмін-панель | UkrTradeHub",
    template: "%s | UkrTradeHub Admin",
  },

  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get("session_token")?.value;

  // Немає cookie → користувач не авторизований
  if (!sessionToken) {
    redirect("/login");
  }

  const session = await db.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      user: true,
    },
  });

  // Сесія не існує
  if (!session) {
    redirect("/login");
  }

  // Сесія прострочена
  if (session.expiresAt <= new Date()) {
    redirect("/login");
  }

  const user = session.user;

  // Доступ тільки для ADMIN
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  // Заблокований користувач
  if (user.isBlocked) {
    redirect("/login");
  }

  // Неактивний користувач
  if (user.status !== "ACTIVE") {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}