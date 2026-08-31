"use client";

import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

type DeleteCategoryButtonProps = {
    id: string;
    name: string;
};

export default function DeleteCategoryButton({
    id,
    name,
}: DeleteCategoryButtonProps) {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleDelete() {
        setLoading(true);
        setError("");


        try {
            const response = await fetch(
                `/api/admin/categories/${id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Не вдалося видалити категорію"
                );
            }

            setOpen(false);

            router.refresh();
        } catch (err) {
            console.error(
                "DELETE CATEGORY ERROR:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Не вдалося видалити категорію"
            );
        } finally {
            setLoading(false);
        }


    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setError("");
                    setOpen(true);
                }}
                aria-label={`Видалити ${name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-600 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-400"
            > <Trash2 className="h-4 w-4" /> </button>

            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e131d] p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-white">
                                    Видалити категорію?
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-zinc-500">
                                    Ви дійсно хочете видалити категорію{" "}
                                    <span className="font-bold text-zinc-300">
                                        «{name}»
                                    </span>
                                    ?
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-5 rounded-xl border border-red-400/10 bg-red-400/5 p-4 text-xs leading-5 text-red-300/80">
                            Цю дію неможливо скасувати. Якщо категорія
                            використовується товарами або має дочірні
                            категорії, API може заборонити її видалення.
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                            >
                                Скасувати
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Видалення...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Видалити
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>


    );
}
