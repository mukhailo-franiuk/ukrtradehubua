"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Edit3,
  Home,
  Loader2,
  MapPin,
  Plus,
  Save,
  Star,
  Trash2,
  User,
  X,
  Phone,
  Warehouse,
} from "lucide-react";

type AddressType = "SHIPPING" | "BILLING" | "BOTH";

type Address = {
  id: string;
  userId: string;
  type: AddressType;
  title: string | null;

  firstName: string | null;
  lastName: string | null;
  phone: string | null;

  country: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;

  street: string | null;
  building: string | null;
  apartment: string | null;

  novaPoshtaWarehouse: string | null;
  novaPoshtaRef: string | null;

  isDefault: boolean;

  createdAt: string;
  updatedAt: string;
};

type AddressForm = {
  type: AddressType;
  title: string;

  firstName: string;
  lastName: string;
  phone: string;

  country: string;
  region: string;
  city: string;
  postalCode: string;

  street: string;
  building: string;
  apartment: string;

  novaPoshtaWarehouse: string;
  novaPoshtaRef: string;

  isDefault: boolean;
};

const emptyForm: AddressForm = {
  type: "SHIPPING",
  title: "",

  firstName: "",
  lastName: "",
  phone: "",

  country: "Україна",
  region: "",
  city: "",
  postalCode: "",

  street: "",
  building: "",
  apartment: "",

  novaPoshtaWarehouse: "",
  novaPoshtaRef: "",

  isDefault: false,
};

function getTypeLabel(type: AddressType) {
  switch (type) {
    case "SHIPPING":
      return "Адреса доставки";

    case "BILLING":
      return "Платіжна адреса";

    case "BOTH":
      return "Доставка та оплата";

    default:
      return "Адреса";
  }
}

function formatAddress(address: Address) {
  const parts = [
    address.country,
    address.region,
    address.city,
    address.street,
    address.building
      ? `буд. ${address.building}`
      : null,
    address.apartment
      ? `кв. ${address.apartment}`
      : null,
    address.postalCode,
  ].filter(Boolean);

  return parts.join(", ");
}

function getAddressTitle(address: Address) {
  if (address.title?.trim()) {
    return address.title.trim();
  }

  if (address.city) {
    return address.city;
  }

  return "Моя адреса";
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [form, setForm] = useState<AddressForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );
  const [defaultId, setDefaultId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    null
  );

  // =====================================================
  // LOAD ADDRESSES
  // =====================================================

  async function loadAddresses() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/addresses", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Не вдалося завантажити адреси"
        );
      }

      setAddresses(result.data ?? []);
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
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  // =====================================================
  // FORM
  // =====================================================

  function openCreateForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      isDefault: addresses.length === 0,
    });

    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function openEditForm(address: Address) {
    setEditingId(address.id);

    setForm({
      type: address.type,
      title: address.title ?? "",

      firstName: address.firstName ?? "",
      lastName: address.lastName ?? "",
      phone: address.phone ?? "",

      country: address.country ?? "Україна",
      region: address.region ?? "",
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",

      street: address.street ?? "",
      building: address.building ?? "",
      apartment: address.apartment ?? "",

      novaPoshtaWarehouse:
        address.novaPoshtaWarehouse ?? "",

      novaPoshtaRef: address.novaPoshtaRef ?? "",

      isDefault: address.isDefault,
    });

    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
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

    try {
      setSaving(true);

      const payload = {
        type: form.type,
        title: form.title.trim() || null,

        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phone: form.phone.trim() || null,

        country:
          form.country.trim() || "Україна",

        region: form.region.trim() || null,
        city: form.city.trim(),

        postalCode:
          form.postalCode.trim() || null,

        street: form.street.trim() || null,
        building: form.building.trim() || null,
        apartment:
          form.apartment.trim() || null,

        novaPoshtaWarehouse:
          form.novaPoshtaWarehouse.trim() || null,

        novaPoshtaRef:
          form.novaPoshtaRef.trim() || null,

        isDefault: form.isDefault,
      };

      const url = editingId
        ? `/api/addresses/${editingId}`
        : "/api/addresses";

      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/account/addresses";
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Не вдалося зберегти адресу"
        );
      }

      if (editingId) {
        setSuccess("Адресу успішно оновлено.");
      } else {
        setSuccess("Адресу успішно додано.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadAddresses();
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
  // DEFAULT ADDRESS
  // =====================================================

  async function makeDefault(id: string) {
    try {
      setDefaultId(id);
      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/addresses/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Не вдалося зробити адресу основною"
        );
      }

      setSuccess("Основну адресу змінено.");

      await loadAddresses();
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
      `Видалити адресу "${getAddressTitle(
        address
      )}"?\n\nЦю дію неможливо скасувати.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(address.id);
      setError(null);
      setSuccess(null);

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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Не вдалося видалити адресу"
        );
      }

      setSuccess("Адресу видалено.");

      await loadAddresses();
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
  // FIELD
  // =====================================================

  function Field({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    type = "text",
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: string;
  }) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-gray-300">
          {label}
          {required && (
            <span className="ml-1 text-amber-400">*</span>
          )}
        </span>

        <input
          type={type}
          value={value}
          required={required}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
        />
      </label>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Назад до кабінету
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
                <MapPin
                  size={24}
                  className="text-amber-400"
                />
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Мої адреси
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
                Керуйте адресами доставки та
                збереженими адресами для оформлення
                замовлень.
              </p>
            </div>

            {!showForm && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
              >
                <Plus size={18} />
                Додати адресу
              </button>
            )}
          </div>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-300">
            <X size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
            <Check
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span>{success}</span>
          </div>
        )}

        {/* FORM */}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#111722] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Редагування адреси"
                    : "Нова адреса"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Заповніть дані адреси доставки.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8 p-5 sm:p-7">
              {/* BASIC */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <Home size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Основна інформація
                    </h3>
                    <p className="text-xs text-gray-500">
                      Назва та призначення адреси
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Назва адреси"
                    value={form.title}
                    onChange={(value) =>
                      updateField("title", value)
                    }
                    placeholder="Наприклад: Дім"
                  />

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-300">
                      Тип адреси
                    </span>

                    <select
                      value={form.type}
                      onChange={(event) =>
                        updateField(
                          "type",
                          event.target
                            .value as AddressType
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                    >
                      <option value="SHIPPING">
                        Адреса доставки
                      </option>
                      <option value="BILLING">
                        Платіжна адреса
                      </option>
                      <option value="BOTH">
                        Доставка та оплата
                      </option>
                    </select>
                  </label>
                </div>
              </section>

              {/* RECIPIENT */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                    <User size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Отримувач
                    </h3>
                    <p className="text-xs text-gray-500">
                      Дані людини, яка отримує замовлення
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
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
                    placeholder="+380 XX XXX XX XX"
                    type="tel"
                  />
                </div>
              </section>

              {/* LOCATION */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <MapPin size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Місцезнаходження
                    </h3>
                    <p className="text-xs text-gray-500">
                      Країна, область та населений пункт
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
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
                    label="Місто"
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
                      updateField(
                        "postalCode",
                        value
                      )
                    }
                    placeholder="58000"
                  />
                </div>
              </section>

              {/* STREET */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400">
                    <Home size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Адреса
                    </h3>
                    <p className="text-xs text-gray-500">
                      Вулиця та номер будинку
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Field
                      label="Вулиця"
                      value={form.street}
                      onChange={(value) =>
                        updateField(
                          "street",
                          value
                        )
                      }
                      placeholder="вул. Головна"
                    />
                  </div>

                  <Field
                    label="Будинок"
                    value={form.building}
                    onChange={(value) =>
                      updateField(
                        "building",
                        value
                      )
                    }
                    placeholder="25"
                  />

                  <Field
                    label="Квартира"
                    value={form.apartment}
                    onChange={(value) =>
                      updateField(
                        "apartment",
                        value
                      )
                    }
                    placeholder="42"
                  />
                </div>
              </section>

              {/* NOVA POSHTA */}

              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                    <Warehouse size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Нова пошта
                    </h3>
                    <p className="text-xs text-gray-500">
                      Дані відділення Нової пошти
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Відділення"
                    value={
                      form.novaPoshtaWarehouse
                    }
                    onChange={(value) =>
                      updateField(
                        "novaPoshtaWarehouse",
                        value
                      )
                    }
                    placeholder="Відділення №1"
                  />

                  <Field
                    label="Ref відділення"
                    value={form.novaPoshtaRef}
                    onChange={(value) =>
                      updateField(
                        "novaPoshtaRef",
                        value
                      )
                    }
                    placeholder="UUID / Ref"
                  />
                </div>
              </section>

              {/* DEFAULT */}

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#0b0f17] p-4 transition hover:border-amber-400/30">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) =>
                    updateField(
                      "isDefault",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 accent-amber-400"
                />

                <span>
                  <span className="block text-sm font-semibold text-white">
                    Зробити основною адресою
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Ця адреса буде автоматично
                    вибиратися під час оформлення
                    замовлення.
                  </span>
                </span>
              </label>
            </div>

            {/* FORM ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Скасувати
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {editingId
                      ? "Зберегти зміни"
                      : "Додати адресу"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* CONTENT */}

        {!showForm && (
          <>
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-white/10 bg-[#111722]">
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2
                    size={22}
                    className="animate-spin text-amber-400"
                  />
                  Завантаження адрес...
                </div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#111722] px-6 py-16 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10">
                  <MapPin
                    size={30}
                    className="text-amber-400"
                  />
                </div>

                <h2 className="text-xl font-bold">
                  Адрес ще немає
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Додайте адресу доставки, щоб не
                  вводити її щоразу під час оформлення
                  замовлення.
                </p>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
                >
                  <Plus size={18} />
                  Додати першу адресу
                </button>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {addresses.map((address) => (
                  <article
                    key={address.id}
                    className={`relative overflow-hidden rounded-3xl border bg-[#111722] transition ${
                      address.isDefault
                        ? "border-amber-400/30 shadow-lg shadow-amber-400/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* DEFAULT STRIP */}

                    {address.isDefault && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" />
                    )}

                    <div className="p-5 sm:p-6">
                      {/* CARD HEADER */}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                              address.isDefault
                                ? "bg-amber-400/10 text-amber-400"
                                : "bg-white/5 text-gray-400"
                            }`}
                          >
                            <Home size={21} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate font-bold text-white">
                                {getAddressTitle(
                                  address
                                )}
                              </h2>

                              {address.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                                  <Star
                                    size={11}
                                    fill="currentColor"
                                  />
                                  Основна
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {getTypeLabel(
                                address.type
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(address)
                          }
                          className="shrink-0 rounded-xl p-2.5 text-gray-500 transition hover:bg-white/5 hover:text-white"
                          title="Редагувати"
                        >
                          <Edit3 size={18} />
                        </button>
                      </div>

                      {/* ADDRESS */}

                      <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-[#0b0f17] p-4">
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />

                          <p className="text-sm leading-6 text-gray-300">
                            {formatAddress(address)}
                          </p>
                        </div>

                        {(address.firstName ||
                          address.lastName) && (
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <User
                              size={16}
                              className="shrink-0 text-gray-500"
                            />

                            <span>
                              {[
                                address.firstName,
                                address.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                          </div>
                        )}

                        {address.phone && (
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <Phone
                              size={16}
                              className="shrink-0 text-gray-500"
                            />

                            <span>
                              {address.phone}
                            </span>
                          </div>
                        )}

                        {address.novaPoshtaWarehouse && (
                          <div className="flex items-start gap-3 text-sm text-gray-400">
                            <Warehouse
                              size={16}
                              className="mt-0.5 shrink-0 text-gray-500"
                            />

                            <span>
                              {
                                address.novaPoshtaWarehouse
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="mt-5 flex flex-wrap gap-2">
                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              makeDefault(
                                address.id
                              )
                            }
                            disabled={
                              defaultId ===
                              address.id
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-gray-300 transition hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-amber-400 disabled:opacity-50"
                          >
                            {defaultId ===
                            address.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Star size={14} />
                            )}

                            Зробити основною
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(address)
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
                        >
                          <Edit3 size={14} />
                          Редагувати
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAddress(address)
                          }
                          disabled={
                            deletingId ===
                            address.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-400 transition hover:border-red-500/20 hover:bg-red-500/5 disabled:opacity-50"
                        >
                          {deletingId ===
                          address.id ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={14} />
                          )}

                          Видалити
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}