import crypto from "node:crypto";

const MONO_API_URL = "https://api.monobank.ua";

const MONO_CURRENCY_UAH = 980;
const MONO_INVOICE_VALIDITY_SECONDS = 3600;

export type MonoInvoiceStatusValue =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

export type MonoBasketItem = {
  name: string;
  qty: number;
  sum: number;
  total: number;
  code?: string;
  unit?: string;
};

export type CreateMonoInvoiceParams = {
  /**
   * Сума в мінімальних одиницях валюти.
   *
   * Для UAH:
   * 100 грн = 10000 копійок.
   */
  amount: number;

  /**
   * Наш внутрішній ідентифікатор платежу.
   */
  reference: string;

  /**
   * Призначення платежу.
   */
  destination: string;

  comment?: string;

  /**
   * URL, куди Monobank повертає покупця
   * після завершення оплати.
   */
  redirectUrl: string;

  /**
   * URL webhook.
   */
  webHookUrl: string;

  /**
   * Товари інвойсу.
   */
  basketOrder?: MonoBasketItem[];
};

export type CreateMonoInvoiceResponse = {
  invoiceId: string;
  pageUrl: string;
  appUrl?: string;
};

export type MonoInvoiceStatus = {
  invoiceId: string;

  status: MonoInvoiceStatusValue;

  failureReason?: string | null;

  /**
   * Сума інвойсу в копійках.
   */
  amount: number;

  /**
   * ISO 4217.
   * 980 = UAH.
   */
  ccy: number;

  /**
   * Фактично списана сума.
   */
  finalAmount?: number;

  createdDate: string;
  modifiedDate: string;

  /**
   * Наш reference.
   */
  reference?: string;

  destination?: string;

  errCode?: string;

  paymentInfo?: {
    maskedPan?: string;
    approvalCode?: string;
    rrn?: string;
    tranId?: string;
    terminal?: string;
    bank?: string;
    paymentSystem?: string;
    paymentMethod?: string;
    country?: string;
    fee?: number;
    agentFee?: number;
  } | null;

  cancelList?: Array<{
    status?: string;
    amount?: number;
    ccy?: number;
    createdDate?: string;
    modifiedDate?: string;
    approvalCode?: string;
    rrn?: string;
    extRef?: string;
  }>;
};

let cachedPublicKeyBase64: string | null = null;

/**
 * -------------------------------------------------------
 * ENV
 * -------------------------------------------------------
 */

function getMonoToken(): string {
  const token = process.env.MONO_TOKEN?.trim();

  if (!token) {
    throw new Error("MONO_TOKEN is not configured");
  }

  return token;
}

/**
 * -------------------------------------------------------
 * GENERIC MONOBANK REQUEST
 * -------------------------------------------------------
 */

async function monoRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${MONO_API_URL}${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      "X-Token": getMonoToken(),
      ...(options.headers ?? {}),
    },

    cache: "no-store",
  });

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = `Monobank API error: ${response.status}`;

    if (typeof data === "object" && data !== null) {
      if (
        "errText" in data &&
        typeof data.errText === "string"
      ) {
        message = data.errText;
      } else if (
        "message" in data &&
        typeof data.message === "string"
      ) {
        message = data.message;
      }
    }

    throw new Error(message);
  }

  return data as T;
}

/**
 * -------------------------------------------------------
 * CREATE INVOICE
 * -------------------------------------------------------
 *
 * Monobank:
 *
 * amount = minor currency units.
 *
 * Для UAH:
 *
 * 1 грн = 100 копійок.
 *
 * Документація:
 * POST /api/merchant/invoice/create
 */

export async function createMonoInvoice(
  params: CreateMonoInvoiceParams,
): Promise<CreateMonoInvoiceResponse> {
  if (
    !Number.isInteger(params.amount) ||
    params.amount <= 0
  ) {
    throw new Error(
      "Monobank invoice amount must be a positive integer",
    );
  }

  if (!params.reference.trim()) {
    throw new Error(
      "Monobank invoice reference is required",
    );
  }

  if (!params.destination.trim()) {
    throw new Error(
      "Monobank invoice destination is required",
    );
  }

  if (!params.redirectUrl.trim()) {
    throw new Error(
      "Monobank redirectUrl is required",
    );
  }

  if (!params.webHookUrl.trim()) {
    throw new Error(
      "Monobank webHookUrl is required",
    );
  }

  if (
    params.basketOrder &&
    params.basketOrder.some(
      (item) =>
        !item.name.trim() ||
        !Number.isInteger(item.qty) ||
        item.qty <= 0 ||
        !Number.isInteger(item.sum) ||
        item.sum <= 0 ||
        !Number.isInteger(item.total) ||
        item.total <= 0,
    )
  ) {
    throw new Error(
      "Invalid Monobank basketOrder",
    );
  }

  const payload = {
    amount: params.amount,

    /**
     * UAH.
     */
    ccy: MONO_CURRENCY_UAH,

    merchantPaymInfo: {
      reference: params.reference,
      destination: params.destination,

      comment:
        params.comment?.trim() ||
        params.destination,

      ...(params.basketOrder?.length
        ? {
            basketOrder: params.basketOrder,
          }
        : {}),
    },

    redirectUrl: params.redirectUrl,

    webHookUrl: params.webHookUrl,

    /**
     * 1 година.
     */
    validity: MONO_INVOICE_VALIDITY_SECONDS,

    /**
     * Звичайна оплата.
     *
     * debit = звичайне списання.
     */
    paymentType: "debit",
  };

  return monoRequest<CreateMonoInvoiceResponse>(
    "/api/merchant/invoice/create",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * -------------------------------------------------------
 * GET INVOICE STATUS
 * -------------------------------------------------------
 *
 * Використовується для:
 *
 * - перевірки розсинхронізації;
 * - ручної перевірки;
 * - fallback-механізму.
 *
 * Основним механізмом у нас залишається webhook.
 */

export async function getMonoInvoiceStatus(
  invoiceId: string,
): Promise<MonoInvoiceStatus> {
  const normalizedInvoiceId =
    invoiceId.trim();

  if (!normalizedInvoiceId) {
    throw new Error(
      "Monobank invoiceId is required",
    );
  }

  return monoRequest<MonoInvoiceStatus>(
    `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(
      normalizedInvoiceId,
    )}`,
    {
      method: "GET",
    },
  );
}

/**
 * -------------------------------------------------------
 * PUBLIC KEY
 * -------------------------------------------------------
 *
 * Monobank повертає:
 *
 * {
 *   "key": "BASE64..."
 * }
 *
 * Ключ можна кешувати.
 *
 * Новий ключ запитуємо тільки тоді,
 * коли поточна перевірка підпису не пройшла.
 */

async function fetchMonoPublicKey(): Promise<string> {
  const result =
    await monoRequest<{ key: string }>(
      "/api/merchant/pubkey",
      {
        method: "GET",
      },
    );

  if (
    !result ||
    typeof result.key !== "string" ||
    !result.key.trim()
  ) {
    throw new Error(
      "Monobank returned an invalid public key",
    );
  }

  return result.key.trim();
}

export async function getMonoPublicKey(): Promise<string> {
  if (cachedPublicKeyBase64) {
    return cachedPublicKeyBase64;
  }

  const key = await fetchMonoPublicKey();

  cachedPublicKeyBase64 = key;

  return key;
}

/**
 * Очистити кеш public key.
 */
function clearMonoPublicKeyCache(): void {
  cachedPublicKeyBase64 = null;
}

/**
 * -------------------------------------------------------
 * SIGNATURE VERIFICATION
 * -------------------------------------------------------
 *
 * Monobank:
 *
 * x-sign:
 * Base64 ECDSA signature
 *
 * public key:
 * Base64 encoded PEM/X.509 ECDSA public key
 *
 * message:
 * RAW webhook body
 *
 * hash:
 * SHA-256
 */

function verifyWithPublicKey(
  body: Buffer,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  try {
    if (!body.length) {
      return false;
    }

    if (!signatureBase64.trim()) {
      return false;
    }

    if (!publicKeyBase64.trim()) {
      return false;
    }

    /**
     * Base64 public key → PEM.
     */
    const publicKeyPem =
      Buffer.from(
        publicKeyBase64,
        "base64",
      ).toString("utf8");

    if (
      !publicKeyPem.includes(
        "BEGIN PUBLIC KEY",
      )
    ) {
      console.error(
        "[MONO] Invalid public key format",
      );

      return false;
    }

    /**
     * Base64 signature → DER.
     */
    const signatureBuffer =
      Buffer.from(
        signatureBase64,
        "base64",
      );

    if (!signatureBuffer.length) {
      return false;
    }

    /**
     * ECDSA + SHA-256.
     *
     * ВАЖЛИВО:
     *
     * body повинен бути саме RAW body,
     * без JSON.parse() / JSON.stringify().
     */
    const verifier =
      crypto.createVerify("SHA256");

    verifier.update(body);
    verifier.end();

    return verifier.verify(
      publicKeyPem,
      signatureBuffer,
    );
  } catch (error) {
    console.error(
      "[MONO] Signature verification error:",
      error,
    );

    return false;
  }
}

/**
 * -------------------------------------------------------
 * VERIFY WEBHOOK
 * -------------------------------------------------------
 *
 * Алгоритм:
 *
 * 1. Перевіряємо cached public key.
 * 2. Якщо не пройшло — очищаємо кеш.
 * 3. Отримуємо новий public key.
 * 4. Повторюємо перевірку.
 *
 * Саме такий flow рекомендує Monobank.
 */

export async function verifyMonoWebhookSignature(
  body: Buffer,
  signature: string,
): Promise<boolean> {
  if (!body.length) {
    console.error(
      "[MONO] Empty webhook body",
    );

    return false;
  }

  const normalizedSignature =
    signature.trim();

  if (!normalizedSignature) {
    console.error(
      "[MONO] Missing x-sign header",
    );

    return false;
  }

  /**
   * -----------------------------------------------------
   * FIRST ATTEMPT
   * Cached public key.
   * -----------------------------------------------------
   */

  try {
    const publicKey =
      await getMonoPublicKey();

    const valid =
      verifyWithPublicKey(
        body,
        normalizedSignature,
        publicKey,
      );

    if (valid) {
      return true;
    }

    console.warn(
      "[MONO] Signature failed with cached public key",
    );
  } catch (error) {
    console.error(
      "[MONO] Cached public key verification error:",
      error,
    );
  }

  /**
   * -----------------------------------------------------
   * SECOND ATTEMPT
   * Fresh public key.
   * -----------------------------------------------------
   */

  try {
    clearMonoPublicKeyCache();

    const freshPublicKey =
      await fetchMonoPublicKey();

    cachedPublicKeyBase64 =
      freshPublicKey;

    const valid =
      verifyWithPublicKey(
        body,
        normalizedSignature,
        freshPublicKey,
      );

    if (valid) {
      return true;
    }

    console.error(
      "[MONO] Signature failed with fresh public key",
    );
  } catch (error) {
    console.error(
      "[MONO] Fresh public key verification error:",
      error,
    );
  }

  return false;
}

/**
 * -------------------------------------------------------
 * HELPERS
 * -------------------------------------------------------
 */

/**
 * Перевірка, що статус є валідним Monobank статусом.
 */
export function isMonoInvoiceStatus(
  value: unknown,
): value is MonoInvoiceStatusValue {
  return (
    value === "created" ||
    value === "processing" ||
    value === "hold" ||
    value === "success" ||
    value === "failure" ||
    value === "reversed" ||
    value === "expired"
  );
}

/**
 * Перевірка, що статус означає успішну оплату.
 */
export function isMonoSuccessfulStatus(
  status: MonoInvoiceStatusValue,
): boolean {
  return status === "success";
}

/**
 * Перевірка, що статус означає помилку оплати.
 */
export function isMonoFailedStatus(
  status: MonoInvoiceStatusValue,
): boolean {
  return status === "failure";
}

/**
 * Перевірка проміжного статусу.
 */
export function isMonoProcessingStatus(
  status: MonoInvoiceStatusValue,
): boolean {
  return (
    status === "processing" ||
    status === "hold"
  );
}

/**
 * Перевірка фінального статусу.
 */
export function isMonoFinalStatus(
  status: MonoInvoiceStatusValue,
): boolean {
  return (
    status === "success" ||
    status === "failure" ||
    status === "reversed" ||
    status === "expired"
  );
}

/**
 * Monobank використовує 980 для UAH.
 */
export function isMonoUah(
  currency: number,
): boolean {
  return currency === MONO_CURRENCY_UAH;
}