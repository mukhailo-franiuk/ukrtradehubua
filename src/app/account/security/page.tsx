"use client";

import {
useEffect,
useState,
} from "react";

import Link from "next/link";

import {
ArrowLeft,
CheckCircle2,
Eye,
EyeOff,
KeyRound,
Loader2,
LogOut,
Monitor,
ShieldCheck,
Smartphone,
Tablet,
Globe2,
AlertCircle,
} from "lucide-react";

type SessionData = {
id: string;
isCurrent: boolean;
expiresAt: string;
ipAddress: string | null;
userAgent: string | null;
createdAt: string;
updatedAt: string;
};

type SessionsResponse = {
success?: boolean;
sessions?: SessionData[];
message?: string;
};

type PasswordResponse = {
success?: boolean;
message?: string;
};

type DeviceInfo = {
device: string;
os: string;
browser: string;
icon: typeof Monitor;
};

export default function SecurityPage() {
const [currentPassword, setCurrentPassword] =
useState("");

const [newPassword, setNewPassword] =
useState("");

const [confirmPassword, setConfirmPassword] =
useState("");

const [showCurrentPassword, setShowCurrentPassword] =
useState(false);

const [showNewPassword, setShowNewPassword] =
useState(false);

const [showConfirmPassword, setShowConfirmPassword] =
useState(false);

const [savingPassword, setSavingPassword] =
useState(false);

const [sessions, setSessions] =
useState<SessionData[]>([]);

const [loadingSessions, setLoadingSessions] =
useState(true);

const [endingSession, setEndingSession] =
useState<string | null>(null);

const [endingAllSessions, setEndingAllSessions] =
useState(false);

const [message, setMessage] =
useState("");

const [error, setError] =
useState("");

useEffect(() => {
void loadSessions();
}, []);

/* ==========================================================
LOAD SESSIONS
========================================================== */

async function loadSessions() {
try {
setLoadingSessions(true);
setError("");


  const response = await fetch(
    "/api/auth/sessions",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  const data: SessionsResponse =
    await response.json();

  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Не вдалося завантажити сесії."
    );
  }

  setSessions(
    Array.isArray(data.sessions)
      ? data.sessions
      : []
  );
} catch (err) {
  console.error(
    "SESSIONS LOAD ERROR:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "Не вдалося завантажити сесії."
  );
} finally {
  setLoadingSessions(false);
}


}

/* ==========================================================
CHANGE PASSWORD
========================================================== */

async function changePassword() {
setMessage("");
setError("");


if (!currentPassword) {
  setError(
    "Вкажіть поточний пароль."
  );
  return;
}

if (!newPassword) {
  setError(
    "Вкажіть новий пароль."
  );
  return;
}

if (newPassword.length < 8) {
  setError(
    "Новий пароль повинен містити мінімум 8 символів."
  );
  return;
}

if (newPassword === currentPassword) {
  setError(
    "Новий пароль повинен відрізнятися від поточного."
  );
  return;
}

if (
  newPassword !==
  confirmPassword
) {
  setError(
    "Нові паролі не збігаються."
  );
  return;
}

try {
  setSavingPassword(true);

  const response =
    await fetch(
      "/api/auth/me",
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      }
    );

  const data: PasswordResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Не вдалося змінити пароль."
    );
  }

  setCurrentPassword("");
  setNewPassword("");
  setConfirmPassword("");

  setShowCurrentPassword(false);
  setShowNewPassword(false);
  setShowConfirmPassword(false);

  setMessage(
    "Пароль успішно змінено."
  );

  await loadSessions();
} catch (err) {
  console.error(
    "PASSWORD CHANGE ERROR:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "Не вдалося змінити пароль."
  );
} finally {
  setSavingPassword(false);
}


}

/* ==========================================================
END ONE SESSION
========================================================== */

async function endSession(
sessionId: string
) {
try {
setEndingSession(sessionId);
setMessage("");
setError("");


  const response =
    await fetch(
      "/api/auth/sessions",
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      }
    );

  const data: SessionsResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Не вдалося завершити сесію."
    );
  }

  setSessions(
    (current) =>
      current.filter(
        (session) =>
          session.id !== sessionId
      )
  );

  setMessage(
    "Сесію завершено."
  );
} catch (err) {
  console.error(
    "END SESSION ERROR:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "Не вдалося завершити сесію."
  );
} finally {
  setEndingSession(null);
}


}

/* ==========================================================
END ALL OTHER SESSIONS
========================================================== */

async function endAllOtherSessions() {
const otherSessions =
sessions.filter(
(session) =>
!session.isCurrent
);


if (
  otherSessions.length === 0
) {
  setMessage("");
  setError(
    "Немає інших активних сесій."
  );
  return;
}

const confirmed =
  window.confirm(
    "Завершити всі інші активні сесії?"
  );

if (!confirmed) {
  return;
}

try {
  setEndingAllSessions(true);
  setMessage("");
  setError("");

  const response =
    await fetch(
      "/api/auth/sessions",
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          allOther: true,
        }),
      }
    );

  const data: SessionsResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Не вдалося завершити сесії."
    );
  }

  setSessions(
    (current) =>
      current.filter(
        (session) =>
          session.isCurrent
      )
  );

  setMessage(
    "Усі інші сесії завершено."
  );
} catch (err) {
  console.error(
    "END ALL SESSIONS ERROR:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "Не вдалося завершити сесії."
  );
} finally {
  setEndingAllSessions(false);
}


}

/* ==========================================================
DEVICE / BROWSER DETECTION
========================================================== */

function getDeviceInfo(
userAgent: string | null
): DeviceInfo {
if (!userAgent) {
return {
device: "Невідомий пристрій",
os: "Операційна система невідома",
browser: "Браузер невідомий",
icon: Monitor,
};
}


const ua =
  userAgent.toLowerCase();

let device = "Комп'ютер";
let os = "Невідома ОС";
let browser = "Невідомий браузер";
let icon: typeof Monitor = Monitor;

/* ========================================================
   DEVICE
======================================================== */

if (
  ua.includes("iphone")
) {
  device = "iPhone";
  icon = Smartphone;
} else if (
  ua.includes("ipad")
) {
  device = "iPad";
  icon = Tablet;
} else if (
  ua.includes("android")
) {
  if (
    ua.includes("mobile")
  ) {
    device = "Android";
    icon = Smartphone;
  } else {
    device = "Android планшет";
    icon = Tablet;
  }
} else if (
  ua.includes("windows phone")
) {
  device = "Windows Phone";
  icon = Smartphone;
} else if (
  ua.includes("macintosh")
) {
  device = "Mac";
  icon = Monitor;
} else if (
  ua.includes("windows")
) {
  device = "Windows PC";
  icon = Monitor;
} else if (
  ua.includes("linux")
) {
  device = "Linux PC";
  icon = Monitor;
}

/* ========================================================
   OPERATING SYSTEM
======================================================== */

if (
  ua.includes("iphone") ||
  ua.includes("ipad") ||
  ua.includes("ios")
) {
  os = "iOS";
} else if (
  ua.includes("android")
) {
  const androidMatch =
    ua.match(
      /android\s([\d.]+)/
    );

  os = androidMatch?.[1]
    ? `Android ${androidMatch[1]}`
    : "Android";
} else if (
  ua.includes("windows nt")
) {
  const windowsMatch =
    ua.match(
      /windows nt\s([\d.]+)/
    );

  const windowsVersion =
    windowsMatch?.[1];

  const windowsMap: Record<
    string,
    string
  > = {
    "10.0": "Windows 10/11",
    "6.4": "Windows 10",
    "6.3": "Windows 8.1",
    "6.2": "Windows 8",
    "6.1": "Windows 7",
  };

  os =
    windowsVersion &&
    windowsMap[windowsVersion]
      ? windowsMap[windowsVersion]
      : "Windows";
} else if (
  ua.includes("mac os x")
) {
  const macMatch =
    ua.match(
      /mac os x\s?([\d_]+)/
    );

  os = macMatch?.[1]
    ? `macOS ${macMatch[1].replace(
        /_/g,
        "."
      )}`
    : "macOS";
} else if (
  ua.includes("linux")
) {
  os = "Linux";
}

/* ========================================================
   BROWSER
======================================================== */

if (
  ua.includes("edg/")
) {
  browser = "Microsoft Edge";
} else if (
  ua.includes("opr/") ||
  ua.includes("opera")
) {
  browser = "Opera";
} else if (
  ua.includes("chrome/") &&
  !ua.includes("edg/")
) {
  browser = "Google Chrome";
} else if (
  ua.includes("firefox/")
) {
  browser = "Mozilla Firefox";
} else if (
  ua.includes("safari/") &&
  !ua.includes("chrome/")
) {
  browser = "Safari";
} else if (
  ua.includes("samsungbrowser/")
) {
  browser = "Samsung Internet";
}

return {
  device,
  os,
  browser,
  icon,
};


}

/* ==========================================================
DATE
========================================================== */

function formatDate(
value: string
) {
const date =
new Date(value);


if (
  Number.isNaN(
    date.getTime()
  )
) {
  return "Дата невідома";
}

return new Intl.DateTimeFormat(
  "uk-UA",
  {
    dateStyle: "medium",
    timeStyle: "short",
  }
).format(date);


}

/* ==========================================================
PASSWORD STRENGTH
========================================================== */

const passwordStrength =
newPassword.length === 0
? 0
: newPassword.length < 8
? 1
: newPassword.length < 12
? 2
: 3;

const otherSessions =
sessions.filter(
(session) =>
!session.isCurrent
);

return ( <main className="min-h-screen bg-[#050505] text-white">
{/* =====================================================
HEADER
===================================================== */}


  <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до акаунта
      </Link>

      <Link
        href="/"
        className="flex items-center gap-2"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
          U
        </div>

        <span className="hidden text-lg font-black sm:block">
          Ukr
          <span className="text-amber-400">
            Trade
          </span>
          Hub
        </span>
      </Link>
    </div>
  </header>

  <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
    {/* ===================================================
        TITLE
    =================================================== */}

    <div className="mb-8">
      <p className="text-sm font-semibold text-amber-400">
        Особистий кабінет
      </p>

      <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
        Безпека
      </h1>

      <p className="mt-2 text-sm leading-6 text-white/40">
        Керуйте паролем та активними
        сесіями свого акаунта.
      </p>
    </div>

    {/* ===================================================
        MESSAGES
    =================================================== */}

    {message && (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        {message}
      </div>
    )}

    {error && (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error}
      </div>
    )}

    {/* ===================================================
        PASSWORD
    =================================================== */}

    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
          <KeyRound className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black">
            Змінити пароль
          </h2>

          <p className="mt-1 text-sm text-white/35">
            Використовуйте надійний пароль
            мінімум із 8 символів.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-5">
        <PasswordInput
          label="Поточний пароль"
          value={currentPassword}
          onChange={setCurrentPassword}
          visible={showCurrentPassword}
          onToggle={() =>
            setShowCurrentPassword(
              (value) => !value
            )
          }
        />

        <div>
          <PasswordInput
            label="Новий пароль"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNewPassword}
            onToggle={() =>
              setShowNewPassword(
                (value) => !value
              )
            }
          />

          {newPassword && (
            <div className="mt-3">
              <div className="flex gap-1">
                {[1, 2, 3].map(
                  (level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        level <=
                        passwordStrength
                          ? "bg-amber-400"
                          : "bg-white/10"
                      }`}
                    />
                  )
                )}
              </div>

              <p className="mt-2 text-xs text-white/30">
                {passwordStrength ===
                1
                  ? "Пароль занадто короткий"
                  : passwordStrength ===
                      2
                    ? "Нормальний пароль"
                    : "Надійний пароль"}
              </p>
            </div>
          )}
        </div>

        <PasswordInput
          label="Повторіть новий пароль"
          value={confirmPassword}
          onChange={setConfirmPassword}
          visible={showConfirmPassword}
          onToggle={() =>
            setShowConfirmPassword(
              (value) => !value
            )
          }
        />
      </div>

      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={changePassword}
          disabled={savingPassword}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingPassword ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Збереження...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Змінити пароль
            </>
          )}
        </button>
      </div>
    </section>

    {/* ===================================================
        SESSIONS
    =================================================== */}

    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50">
            <Globe2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-black">
              Активні сесії
            </h2>

            <p className="mt-1 text-sm text-white/35">
              Переглядайте пристрої, браузери
              та IP-адреси, з яких виконано
              вхід у ваш акаунт.
            </p>
          </div>
        </div>

        {otherSessions.length > 0 && (
          <button
            type="button"
            onClick={
              endAllOtherSessions
            }
            disabled={
              endingAllSessions
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {endingAllSessions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}

            Завершити інші
          </button>
        )}
      </div>

      <div className="mt-7 space-y-3">
        {loadingSessions ? (
          <div className="flex items-center justify-center py-10 text-sm text-white/35">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-amber-400" />
            Завантаження сесій...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/40">
            Активних сесій не знайдено.
          </div>
        ) : (
          sessions.map(
            (session) => {
              const device =
                getDeviceInfo(
                  session.userAgent
                );

              const DeviceIcon =
                device.icon;

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border p-4 ${
                    session.isCurrent
                      ? "border-amber-400/20 bg-amber-400/[0.04]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        session.isCurrent
                          ? "bg-amber-400/10 text-amber-400"
                          : "bg-white/5 text-white/50"
                      }`}
                    >
                      <DeviceIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">
                          {device.device}
                        </h3>

                        {session.isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Поточна
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-white/40">
                        {device.os}
                        {" · "}
                        {device.browser}
                      </p>

                      <div className="mt-3 grid gap-1 text-xs text-white/25 sm:grid-cols-2">
                        <p>
                          IP:{" "}
                          <span className="text-white/45">
                            {session.ipAddress ||
                              "Не визначено"}
                          </span>
                        </p>

                        <p>
                          Створено:{" "}
                          <span className="text-white/45">
                            {formatDate(
                              session.createdAt
                            )}
                          </span>
                        </p>
                      </div>

                      <p className="mt-1 text-[11px] text-white/20">
                        Дійсна до:{" "}
                        {formatDate(
                          session.expiresAt
                        )}
                      </p>
                    </div>

                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() =>
                          endSession(
                            session.id
                          )
                        }
                        disabled={
                          endingSession ===
                          session.id
                        }
                        className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/5 p-2.5 text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Завершити сесію"
                        aria-label="Завершити сесію"
                      >
                        {endingSession ===
                        session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )
        )}
      </div>
    </section>

    {/* ===================================================
        SECURITY NOTE
    =================================================== */}

    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

      <div>
        <p className="text-sm font-bold">
          Порада з безпеки
        </p>

        <p className="mt-1 text-xs leading-5 text-white/35">
          Якщо ви помітили невідомий пристрій
          або підозрілу IP-адресу, негайно
          завершіть його сесію та змініть пароль.
        </p>
      </div>
    </div>
  </div>
</main>


);
}

/* ============================================================
PASSWORD INPUT
============================================================ */

function PasswordInput({
label,
value,
onChange,
visible,
onToggle,
}: {
label: string;
value: string;
onChange: (value: string) => void;
visible: boolean;
onToggle: () => void;
}) {
return ( <div> <label className="mb-2 block text-sm font-bold text-white/70">
{label} </label>

```
  <div className="relative">
    <input
      type={
        visible
          ? "text"
          : "password"
      }
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      autoComplete="new-password"
      className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-4 pr-12 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
    />

    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
      aria-label={
        visible
          ? "Сховати пароль"
          : "Показати пароль"
      }
    >
      {visible ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  </div>
</div>

);
}
