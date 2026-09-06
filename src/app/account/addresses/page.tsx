"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Home,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Truck,
  X,
} from "lucide-react";

type Address = {
  id: string;
  userId: string;
  type: "SHIPPING" | "BILLING" | "BOTH";

  firstName: string | null;
  lastName: string | null;
  phone: string | null;

  country: string | null;
  region: string | null;
  district: string | null;
  city: string | null;

  street: string | null;
  house: string | null;
  apartment: string | null;

  postalCode: string | null;

  novaPoshtaCityRef: string | null;
  novaPoshtaWarehouseRef: string | null;

  isDefault: boolean;

  createdAt: string;
  updatedAt: string;
};

type AddressForm = {
  type: Address["type"];

  firstName: string;
  lastName: string;
  phone: string;

  country: string;
  region: string;
  district: string;
  city: string;

  street: string;
  house: string;
  apartment: string;

  postalCode: string;

  novaPoshtaCityRef: string;
  novaPoshtaWarehouseRef: string;

  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  type: "SHIPPING",

  firstName: "",
  lastName: "",
  phone: "",

  country: "Україна",
  region: "",
  district: "",
  city: "",

  street: "",
  house: "",
  apartment: "",

  postalCode: "",

  novaPoshtaCityRef: "",
  novaPoshtaWarehouseRef: "",

  isDefault: false,
};

function addressToForm(address: Address): AddressForm {
  return {
    type: address.type,

    firstName: address.firstName ?? "",
    lastName: address.lastName ?? "",
    phone: address.phone ?? "",

    country: address.country ?? "Україна",
    region: address.region ?? "",
    district: address.district ?? "",
    city: address.city ?? "",

    street: address.street ?? "",
    house: address.house ?? "",
    apartment: address.apartment ?? "",

    postalCode: address.postalCode ?? "",

    novaPoshtaCityRef: address.novaPoshtaCityRef ?? "",
    novaPoshtaWarehouseRef:
      address.novaPoshtaWarehouseRef ?? "",

    isDefault: address.isDefault,
  };
}

function formatAddress(address: Address) {
  const parts = [
    address.country,
    address.region,
    address.district,
    address.city,
    address.street,
    address.house,
    address.apartment
      ? `кв. ${address.apartment}`
      : null,
    address.postalCode,
  ].filter(Boolean);

  return parts.join(", ");
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );
  const [defaultId, setDefaultId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =====================================================
  // LOAD
  // =====================================================

  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/addresses", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error || "Не вдалося завантажити адреси"
        );
      }

      setAddresses(json.data ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити адреси"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // =====================================================
  // FORM
  // =====================================================

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    });
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function openEditForm(address: Address) {
    setEditingId(address.id);
    setForm(addressToForm(address));
    setError(null);
    setSuccess(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateField<K extends keyof AddressForm>(
    field: K,
    value: AddressForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // =====================================================
  // SAVE
  // =====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!form.city.trim()) {
      setError("Вкажіть місто.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/addresses/${editingId}`
        : "/api/addresses";

      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: form.type,

          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),

          country: form.country.trim(),
          region: form.region.trim(),
          district: form.district.trim(),
          city: form.city.trim(),

          street: form.street.trim(),
          house: form.house.trim(),
          apartment: form.apartment.trim(),

          postalCode: form.postalCode.trim(),

          novaPoshtaCityRef:
            form.novaPoshtaCityRef.trim(),

          novaPoshtaWarehouseRef:
            form.novaPoshtaWarehouseRef.trim(),

          isDefault: form.isDefault,
        }),
      });

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error || "Не вдалося зберегти адресу"
        );
      }

      setSuccess(
        editingId
          ? "Адресу успішно оновлено."
          : "Адресу успішно додано."
      );

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadAddresses();

      window.setTimeout(() => {
        setSuccess(null);
      }, 3500);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося зберегти адресу"
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DEFAULT
  // =====================================================

  async function makeDefault(addressId: string) {
    if (defaultId === addressId) return;

    setDefaultId(addressId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/addresses/${addressId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            isDefault: true,
          }),
        }
      );

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error ||
            "Не вдалося змінити основну адресу"
        );
      }

      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address.id === addressId,
        }))
      );

      setSuccess("Основну адресу змінено.");

      window.setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося змінити основну адресу"
      );
    } finally {
      setDefaultId(null);
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function deleteAddress(address: Address) {
    const confirmed = window.confirm(
      address.isDefault
        ? "Ви дійсно хочете видалити основну адресу?"
        : "Ви дійсно хочете видалити цю адресу?"
    );

    if (!confirmed) return;

    setDeletingId(address.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/addresses/${address.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.error || "Не вдалося видалити адресу"
        );
      }

      await loadAddresses();

      setSuccess("Адресу видалено.");

      window.setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося видалити адресу"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Завантаження адрес...</span>
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/account"
            className="transition hover:text-white"
          >
            Мій акаунт
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="text-zinc-300">
            Адреси доставки
          </span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
                <MapPin className="h-6 w-6 text-amber-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Адреси доставки
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Збережені адреси для швидкого оформлення
                  замовлень
                </p>
              </div>
            </div>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              <Plus className="h-5 w-5" />
              Додати адресу
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">{error}</div>

            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 transition hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>{success}</div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-lg font-bold">
                  {editingId
                    ? "Редагування адреси"
                    : "Нова адреса"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Введіть дані для доставки замовлень
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-7 p-5 sm:p-7"
            >
              {/* Recipient */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />

                  <h3 className="font-semibold">
                    Отримувач
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ім'я"
                    value={form.firstName}
                    onChange={(value) =>
                      updateField("firstName", value)
                    }
                    placeholder="Михайло"
                  />

                  <Field
                    label="Прізвище"
                    value={form.lastName}
                    onChange={(value) =>
                      updateField("lastName", value)
                    }
                    placeholder="Франюк"
                  />

                  <Field
                    label="Телефон"
                    value={form.phone}
                    onChange={(value) =>
                      updateField("phone", value)
                    }
                    placeholder="+380..."
                    type="tel"
                  />

                  <Field
                    label="Тип адреси"
                    value={form.type}
                    onChange={(value) =>
                      updateField(
                        "type",
                        value as Address["type"]
                      )
                    }
                    select
                    options={[
                      {
                        value: "SHIPPING",
                        label: "Адреса доставки",
                      },
                      {
                        value: "BILLING",
                        label: "Платіжна адреса",
                      },
                      {
                        value: "BOTH",
                        label: "Доставка та платіжна",
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />

                  <h3 className="font-semibold">
                    Місцезнаходження
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Країна"
                    value={form.country}
                    onChange={(value) =>
                      updateField("country", value)
                    }
                    placeholder="Україна"
                  />

                  <Field
                    label="Область"
                    value={form.region}
                    onChange={(value) =>
                      updateField("region", value)
                    }
                    placeholder="Чернівецька область"
                  />

                  <Field
                    label="Район"
                    value={form.district}
                    onChange={(value) =>
                      updateField("district", value)
                    }
                    placeholder="Район"
                  />

                  <Field
                    label="Місто / населений пункт"
                    value={form.city}
                    onChange={(value) =>
                      updateField("city", value)
                    }
                    placeholder="Чернівці"
                    required
                  />

                  <Field
                    label="Поштовий індекс"
                    value={form.postalCode}
                    onChange={(value) =>
                      updateField("postalCode", value)
                    }
                    placeholder="58000"
                  />
                </div>
              </div>

              {/* Street */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />

                  <h3 className="font-semibold">
                    Адреса
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <Field
                      label="Вулиця"
                      value={form.street}
                      onChange={(value) =>
                        updateField("street", value)
                      }
                      placeholder="Головна"
                    />
                  </div>

                  <Field
                    label="Будинок"
                    value={form.house}
                    onChange={(value) =>
                      updateField("house", value)
                    }
                    placeholder="25"
                  />

                  <Field
                    label="Квартира"
                    value={form.apartment}
                    onChange={(value) =>
                      updateField("apartment", value)
                    }
                    placeholder="12"
                  />
                </div>
              </div>

              {/* Nova Poshta */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                    <Truck className="h-5 w-5 text-red-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Нова пошта
                    </h3>

                    <p className="text-xs text-zinc-500">
                      Дані можна буде використовувати для
                      доставки через Нову пошту
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="ID міста Нової пошти"
                    value={form.novaPoshtaCityRef}
                    onChange={(value) =>
                      updateField(
                        "novaPoshtaCityRef",
                        value
                      )
                    }
                    placeholder="Ref міста"
                  />

                  <Field
                    label="ID відділення Нової пошти"
                    value={form.novaPoshtaWarehouseRef}
                    onChange={(value) =>
                      updateField(
                        "novaPoshtaWarehouseRef",
                        value
                      )
                    }
                    placeholder="Ref відділення"
                  />
                </div>
              </div>

              {/* Default */}
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) =>
                    updateField(
                      "isDefault",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5 rounded border-zinc-700 bg-zinc-900 accent-amber-400"
                />

                <div>
                  <div className="font-medium">
                    Зробити основною адресою
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    Ця адреса автоматично вибиратиметься під
                    час оформлення замовлення.
                  </div>
                </div>
              </label>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="h-11 rounded-xl border border-zinc-700 px-5 font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                >
                  Скасувати
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Збереження...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {editingId
                        ? "Зберегти зміни"
                        : "Додати адресу"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Empty */}
        {addresses.length === 0 && !showForm && (
          <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10">
              <MapPin className="h-8 w-8 text-amber-400" />
            </div>

            <h2 className="text-xl font-bold">
              У вас ще немає збережених адрес
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Додайте адресу доставки один раз, і під час
              наступних замовлень вам не доведеться вводити її
              повторно.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              <Plus className="h-5 w-5" />
              Додати першу адресу
            </button>
          </section>
        )}

        {/* Address list */}
        {addresses.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Збережені адреси
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {addresses.length === 1
                    ? "1 адреса"
                    : `${addresses.length} адреси`}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {addresses.map((address) => (
                <article
                  key={address.id}
                  className={`relative overflow-hidden rounded-3xl border bg-zinc-900/70 transition ${
                    address.isDefault
                      ? "border-amber-400/40 shadow-lg shadow-amber-400/5"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {address.isDefault && (
                    <div className="absolute right-0 top-0 rounded-bl-2xl bg-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950">
                      Основна
                    </div>
                  )}

                  <div className="p-5 sm:p-6">
                    <div className="mb-5 flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          address.isDefault
                            ? "bg-amber-400/10 text-amber-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {address.isDefault ? (
                          <Home className="h-5 w-5" />
                        ) : (
                          <MapPin className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 pr-20">
                        <h3 className="font-semibold">
                          {address.firstName ||
                          address.lastName
                            ? `${address.firstName ?? ""} ${
                                address.lastName ?? ""
                              }`.trim()
                            : "Отримувач"}
                        </h3>

                        {address.phone && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {address.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-sm leading-6 text-zinc-300">
                        {formatAddress(address)}
                      </p>

                      {address.novaPoshtaWarehouseRef && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                          <Truck className="h-4 w-4 text-red-400" />

                          <span>
                            Нова пошта · відділення
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {!address.isDefault && (
                        <button
                          type="button"
                          onClick={() =>
                            makeDefault(address.id)
                          }
                          disabled={defaultId === address.id}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 px-3.5 text-sm font-medium text-zinc-300 transition hover:border-amber-400/40 hover:bg-amber-400/5 hover:text-amber-300 disabled:opacity-50"
                        >
                          {defaultId === address.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}

                          Зробити основною
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(address)
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700 px-3.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                      >
                        <Edit3 className="h-4 w-4" />
                        Редагувати
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteAddress(address)
                        }
                        disabled={deletingId === address.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 px-3.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingId === address.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}

                        Видалити
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Bottom navigation */}
        <div className="mt-8 border-t border-zinc-900 pt-6">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Повернутися до акаунта
          </Link>
        </div>
      </div>
    </main>
  );
}

// =====================================================
// FIELD
// =====================================================

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  select?: boolean;
  options?: {
    value: string;
    label: string;
  }[];
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  select = false,
  options = [],
}: FieldProps) {
  const baseClass =
    "mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10";

  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-300">
        {label}

        {required && (
          <span className="ml-1 text-amber-400">*</span>
        )}
      </span>

      {select ? (
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={baseClass}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          required={required}
          className={baseClass}
        />
      )}
    </label>
  );
}