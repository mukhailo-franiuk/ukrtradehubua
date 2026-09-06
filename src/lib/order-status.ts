// =====================================================
// ORDER STATUS LABELS
// =====================================================

export function orderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";
    case "CONFIRMED":
      return "Підтверджене";
    case "PROCESSING":
      return "В обробці";
    case "SHIPPED":
      return "Відправлене";
    case "DELIVERED":
      return "Доставлене";
    case "COMPLETED":
      return "Завершене";
    case "CANCELLED":
      return "Скасоване";
    case "RETURNED":
      return "Повернене";
    case "REFUNDED":
      return "Повернено кошти";
    default:
      return status;
  }
}

export function orderStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "CONFIRMED":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    case "PROCESSING":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";
    case "SHIPPED":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    case "DELIVERED":
    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "RETURNED":
    case "REFUNDED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";
    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

// =====================================================
// PAYMENT STATUS LABELS
// =====================================================

export function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує оплати";
    case "PROCESSING":
      return "Обробляється";
    case "PAID":
      return "Оплачено";
    case "FAILED":
      return "Помилка оплати";
    case "REFUNDED":
      return "Кошти повернено";
    case "PARTIALLY_REFUNDED":
      return "Частково повернено";
    case "CANCELLED":
      return "Скасовано";
    default:
      return status;
  }
}

export function paymentStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "PENDING":
    case "PROCESSING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "FAILED":
    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

// =====================================================
// DELIVERY / PAYMENT METHOD LABELS
// =====================================================

export function deliveryMethodLabel(method: string | null | undefined) {
  switch (method) {
    case "NOVA_POSHTA":
      return "Нова пошта";
    case "UKRPOSHTA":
      return "Укрпошта";
    case "MIST":
      return "Meest";
    case "COURIER":
      return "Кур'єром";
    case "PICKUP":
      return "Самовивіз";
    default:
      return "Не вказано";
  }
}

export function paymentMethodLabel(method: string | null | undefined) {
  switch (method) {
    case "CARD":
      return "Картка онлайн";
    case "CASH_ON_DELIVERY":
      return "Оплата при отриманні";
    case "BANK_TRANSFER":
      return "Банківський переказ";
    case "APPLE_PAY":
      return "Apple Pay";
    case "GOOGLE_PAY":
      return "Google Pay";
    default:
      return "Не вказано";
  }
}

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("uk-UA").format(value) + " ₴";

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));