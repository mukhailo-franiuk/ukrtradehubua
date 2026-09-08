"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Mail,
  Send,
  Users,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function EmailMarketingPage() {
  const [recipientCount, setRecipientCount] = useState(0);

  const [subject, setSubject] = useState(
    "Ласкаво просимо до UkrTradeHub 🇺🇦"
  );

  const [title, setTitle] = useState(
    "Ласкаво просимо до UkrTradeHub!"
  );

  const [message, setMessage] = useState(
    "Дякуємо за реєстрацію на UkrTradeHub.\n\nТут ви можете знаходити цікаві товари від українських продавців, відкривати нові магазини та робити покупки в одному місці."
  );

  const [buttonText, setButtonText] = useState(
    "Перейти до UkrTradeHub"
  );

  const [buttonUrl, setButtonUrl] = useState(
    "https://ukrtradehub.com"
  );

  const [testEmail, setTestEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadRecipients() {
      try {
        const response = await fetch(
          "/api/admin/email-marketing/recipients",
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (data.success) {
          setRecipientCount(data.count);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadRecipients();
  }, []);

  async function sendTest(event: FormEvent) {
    event.preventDefault();

    setResult(null);

    if (!testEmail.trim()) {
      setResult({
        type: "error",
        message: "Вкажи email для тестової відправки.",
      });

      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/admin/email-marketing/send",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject,
            title,
            message,
            buttonText,
            buttonUrl,
            testEmail,
            sendToAll: false,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Не вдалося відправити лист"
        );
      }

      setResult({
        type: "success",
        message: data.message,
      });
    } catch (error) {
      setResult({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Помилка відправки",
      });
    } finally {
      setSending(false);
    }
  }

  async function sendCampaign() {
    const confirmed = window.confirm(
      `Відправити розсилку ${recipientCount} користувачам?`
    );

    if (!confirmed) return;

    setResult(null);
    setSending(true);

    try {
      const response = await fetch(
        "/api/admin/email-marketing/send",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject,
            title,
            message,
            buttonText,
            buttonUrl,
            sendToAll: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Не вдалося виконати розсилку"
        );
      }

      setResult({
        type: "success",
        message: `Відправлено: ${data.sent}. Помилок: ${data.failed}.`,
      });
    } catch (error) {
      setResult({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Помилка розсилки",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/10 p-3">
              <Mail className="h-6 w-6 text-amber-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Email Marketing
              </h1>

              <p className="text-sm text-gray-400">
                Створення та відправка email-розсилок
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-gray-400">
                Отримувачі
              </span>
            </div>

            <div className="text-3xl font-bold">
              {loading ? "..." : recipientCount}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              активні покупці
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-400">
                Відправник
              </span>
            </div>

            <div className="truncate text-lg font-semibold">
              support@ukrtradehub.com
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-3">
              <Eye className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-400">
                Канал
              </span>
            </div>

            <div className="text-lg font-semibold">
              Hostinger SMTP
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <form
            onSubmit={sendTest}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h2 className="mb-6 text-lg font-semibold">
              Створити розсилку
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Тема листа
                </label>

                <input
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400"
                  placeholder="Тема листа"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Заголовок
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400"
                  placeholder="Заголовок"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Текст
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  rows={8}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-amber-400"
                  placeholder="Текст листа..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Текст кнопки
                  </label>

                  <input
                    value={buttonText}
                    onChange={(e) =>
                      setButtonText(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Посилання
                  </label>

                  <input
                    value={buttonUrl}
                    onChange={(e) =>
                      setButtonUrl(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <label className="mb-2 block text-sm font-medium">
                  Тестовий email
                </label>

                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) =>
                    setTestEmail(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-400"
                  placeholder="your@email.com"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Спочатку рекомендується відправити тестовий
                  лист собі.
                </p>
              </div>

              {result && (
                <div
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    result.type === "success"
                      ? "border-green-500/20 bg-green-500/10 text-green-300"
                      : "border-red-500/20 bg-red-500/10 text-red-300"
                  }`}
                >
                  {result.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  )}

                  <span className="text-sm">
                    {result.message}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}

                  Надіслати тест
                </button>

                <button
                  type="button"
                  onClick={sendCampaign}
                  disabled={sending || recipientCount === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}

                  Відправити всім ({recipientCount})
                </button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-400" />

              <h2 className="font-semibold">
                Попередній перегляд
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl bg-[#0f172a]">
              <div className="p-6">
                <div className="mb-8 text-xl font-black">
                  <span className="text-white">Ukr</span>
                  <span className="text-amber-400">
                    Trade
                  </span>
                  <span className="text-white">Hub</span>
                </div>

                <h3 className="mb-4 text-2xl font-bold">
                  {title || "Заголовок листа"}
                </h3>

                <div className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {message || "Текст листа..."}
                </div>

                {buttonText && (
                  <div className="mt-7">
                    <div className="inline-block rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">
                      {buttonText}
                    </div>
                  </div>
                )}

                <div className="mt-8 border-t border-white/10 pt-5 text-xs text-gray-500">
                  UkrTradeHub — український маркетплейс
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}