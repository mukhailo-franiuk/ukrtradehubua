export type EmailUser = {
  email: string;
  name?: string | null;
};

export type OrderEmailData = {
  orderId: string;

  customerName?: string | null;

  total?: number | string | null;

  currency?: string;

  items?: Array<{
    name: string;
    quantity: number;
    price: number | string;
    imageUrl?: string | null;
  }>;

  trackingNumber?: string | null;

  deliveryMethod?: string | null;

  deliveryAddress?: string | null;
};

export type OrderStatusEmailData = {
  orderId: string;

  customerName?: string | null;

  status: string;

  statusLabel: string;

  message?: string | null;

  total?: number | string | null;

  currency?: string;
};

export type DeliveryEmailData = {
  orderId: string;

  customerName?: string | null;

  trackingNumber?: string | null;

  deliveryMethod?: string | null;

  deliveryAddress?: string | null;

  estimatedDelivery?: string | null;
};

export type PasswordResetEmailData = {
  name?: string | null;

  resetUrl: string;

  expiresIn?: string;
};