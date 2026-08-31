
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  id: string;
  name: string;
};

export default function CategoryActions({
  id,
  name,
}: Props) {
  const [deleting, setDeleting] =
    useState(false);

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Видалити категорію «${name}»?\n\nЦю дію неможливо скасувати.`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/categories/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося видалити категорію"
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "DELETE CATEGORY ERROR:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Не вдалося видалити категорію"
      );

      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/categories/${id}`}
        aria-label={`Редагувати ${name}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Видалити ${name}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-600 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}