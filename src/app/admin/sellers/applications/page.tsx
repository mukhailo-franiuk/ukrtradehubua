
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Store,
  Clock3,
  CheckCircle2,
  XCircle,
  Ban,
  Eye,
  RefreshCw,
} from "lucide-react";

type ApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

type Application = {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  phone: string | null;
  taxNumber: string | null;
  website: string | null;
  status: ApplicationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    isBlocked: boolean;
  };
};

const statusLabels: Record<ApplicationStatus, string> = {
  PENDING: "Очікує перевірки",
  APPROVED: "Схвалена",
  REJECTED: "Відхилена",
  CANCELLED: "Скасована",
};

function StatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const config = {
    PENDING: {
      icon: Clock3,
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-400",
    },
    APPROVED: {
      icon: CheckCircle2,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    REJECTED: {
      icon: XCircle,
      className:
        "border-red-500/20 bg-red-500/10 text-red-400",
    },
    CANCELLED: {
      icon: Ban,
      className:
        "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SellerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>(
    "PENDING"
  );
  const [error, setError] = useState("");

  async function loadApplications() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/admin/sellers/applications?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Не вдалося завантажити заявки"
        );
      }

      setApplications(data.applications ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Сталася помилка"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, [status]);

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (application) => application.status === "PENDING"
      ).length,
    [applications]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/10 p-3">
              <Store className="h-6 w-6 text-amber-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                Заявки продавців
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Перевірка та модерація заявок на підключення продавців
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadApplications}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Оновити
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">Показано</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {applications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm text-zinc-500">Очікують</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">
            {pendingCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    loadApplications();
                  }
                }}
                placeholder="Пошук заявок..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "Усі"],
                  ["PENDING", "Очікують"],
                  ["APPROVED", "Схвалені"],
                  ["REJECTED", "Відхилені"],
                  ["CANCELLED", "Скасовані"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    status === value
                      ? "bg-amber-400 font-semibold text-black"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            Завантаження...
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="h-10 w-10 text-zinc-700" />
            <p className="mt-4 font-medium text-zinc-400">
              Заявок не знайдено
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {applications.map((application) => (
              <div
                key={application.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-zinc-900/50 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-white">
                      {application.businessName ||
                        "Без назви бізнесу"}
                    </h2>

                    <StatusBadge
                      status={application.status}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
                    <span>
                      {application.user.name ||
                        "Без імені"}
                    </span>

                    <span>
                      {application.user.email}
                    </span>

                    {application.phone && (
                      <span>{application.phone}</span>
                    )}

                    <span>
                      {formatDate(application.createdAt)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/admin/sellers/applications/${application.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-amber-400/50 hover:text-amber-400"
                >
                  <Eye className="h-4 w-4" />
                  Переглянути
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}