import "server-only";

const STORE_URL = (process.env.WOOCOMMERCE_URL || "https://howlark.com").replace(/\/$/, "");
const EXPECTED_CURRENCY = (process.env.RESUMELITE_EXPECTED_CURRENCY || "USD").toUpperCase();
export const RESUMELITE_SKU = "resumelite-pdf-download";
export const RESUMELITE_PRICE = "2.00";

type WooProduct = {
  id: number;
  name: string;
  sku: string;
  status: string;
  type: string;
  regular_price: string;
  price: string;
  virtual: boolean;
  catalog_visibility: string;
};

type WooOrderLine = {
  product_id: number;
  sku?: string;
  subtotal: string;
  total: string;
};

type WooOrder = {
  id: number;
  status: string;
  currency: string;
  total: string;
  order_key: string;
  date_paid: string | null;
  line_items: WooOrderLine[];
};

function credentials() {
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("WooCommerce API credentials are not configured.");
  }
  const parsed = new URL(STORE_URL);
  if (parsed.protocol !== "https:") {
    throw new Error("WooCommerce URL must use HTTPS.");
  }
  return { key, secret };
}

async function wooFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { key, secret } = credentials();
  const response = await fetch(`${STORE_URL}/wp-json/wc/v3/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data.message === "string" ? data.message : "WooCommerce API request failed.";
    throw new Error(`WooCommerce API error (${response.status}): ${message}`);
  }
  return data as T;
}

export async function assertStoreCurrency() {
  const settings = await wooFetch<Array<{ id: string; value: string }>>("settings/general");
  const currency = settings.find((item) => item.id === "woocommerce_currency")?.value?.toUpperCase();
  if (currency !== EXPECTED_CURRENCY) {
    throw new Error(`WooCommerce store currency must be ${EXPECTED_CURRENCY}; detected ${currency || "unknown"}.`);
  }
}

export async function findResumeProduct(): Promise<WooProduct | null> {
  const products = await wooFetch<WooProduct[]>(`products?sku=${encodeURIComponent(RESUMELITE_SKU)}&per_page=10`);
  return products.find((product) => product.sku === RESUMELITE_SKU) || null;
}

export async function createOrUpdateResumeProduct(): Promise<WooProduct> {
  await assertStoreCurrency();
  const existing = await findResumeProduct();
  const payload = {
    name: "ResumeLite PDF Download",
    type: "simple",
    status: "publish",
    sku: RESUMELITE_SKU,
    regular_price: RESUMELITE_PRICE,
    virtual: true,
    downloadable: false,
    catalog_visibility: "hidden",
    description: "One-time payment to download a PDF created with ResumeLite.",
  };
  if (existing) {
    return wooFetch<WooProduct>(`products/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return wooFetch<WooProduct>("products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyPaidResumeOrder(orderId: number, suppliedOrderKey: string) {
  await assertStoreCurrency();
  const product = await findResumeProduct();
  if (!product || product.status !== "publish" || Number(product.regular_price) !== 2 || !product.virtual) {
    throw new Error("ResumeLite WooCommerce product is missing or incorrectly configured.");
  }

  const order = await wooFetch<WooOrder>(`orders/${orderId}`);
  if (order.order_key !== suppliedOrderKey) {
    return { paid: false, status: "invalid_order_key" as const };
  }

  const includesProduct = order.line_items.some((item) =>
    item.product_id === product.id &&
    Number(item.subtotal) === 2 &&
    Number(item.total) === 2
  );
  if (order.currency.toUpperCase() !== EXPECTED_CURRENCY || !includesProduct) {
    return { paid: false, status: "order_mismatch" as const };
  }

  const paid = (order.status === "processing" || order.status === "completed") && Boolean(order.date_paid);
  return { paid, status: order.status };
}

export function getStoreCheckoutUrl(productId: number) {
  return `${STORE_URL}/checkout/?add-to-cart=${productId}&quantity=1`;
}
