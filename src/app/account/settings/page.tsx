"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, User } from "lucide-react";

type MeUser = {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
};

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // ===================================================
  // LOAD CURRENT USER
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = await res.json();

        if (!cancelled && json.authenticated) {
          const user: MeUser = json.user;
          setName(user.name ?? "");
          setPhone(user.phone ?? "");
          setEmail(user.email ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================================
  // SAVE PROFILE (name / phone / email)
  // ===================================================

  async function handleSaveProfile() {
    setSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, email }),
      });

      const json = await res.json();

      if (!json.success) {
        setProfileError(json.message ?? "Не вдалося зберегти зміни");
        return;
      }

      setProfileSuccess(true);
    } catch {
      setProfileError("Не вдалося зберегти зміни");
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // CHANGE PASSWORD
  // ===================================================

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== newPasswordRepeat) {
      setPasswordError("Паролі не збігаються");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();

      if (!json.success) {
        setPasswordError(json.message ?? "Не вдалося змінити пароль");
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
    } catch {
      setPasswordError("Не вдалося змінити пароль");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-amber-400/60";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
          <User className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">Налаштування</h1>
      </div>

      {/* PROFILE */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Особисті дані</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Імʼя
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ваше імʼя"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Телефон
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+380..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </div>

        {profileError && (
          <p className="mt-4 text-sm text-red-300">{profileError}</p>
        )}

        {profileSuccess && (
          <p className="mt-4 text-sm text-emerald-400">Профіль оновлено</p>
        )}

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Зберегти
        </button>
      </div>

      {/* PASSWORD */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Зміна пароля</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Поточний пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Новий пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="Мінімум 8 символів"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Повторіть новий пароль
            </label>
            <input
              type="password"
              value={newPasswordRepeat}
              onChange={(e) => setNewPasswordRepeat(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {passwordError && (
          <p className="mt-4 text-sm text-red-300">{passwordError}</p>
        )}

        {passwordSuccess && (
          <p className="mt-4 text-sm text-emerald-400">Пароль змінено</p>
        )}

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={savingPassword || !currentPassword || !newPassword}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
          Змінити пароль
        </button>
      </div>
    </div>
  );
}