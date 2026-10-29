import { NextResponse } from "next/server";
import { findResumeProduct, getStoreCheckoutUrl, assertStoreCurrency } from "@/lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await assertStoreCurrency();
    const product = await findResumeProduct();
    if (!product || product.status !== "publish" || Number(product.regular_price) !== 2 || !product.virtual) {
      return NextResponse.json(
        { error: "The ResumeLite $2 product is not configured yet. Please contact the site owner." },
        { status: 503 }
      );
    }
    return NextResponse.json({ checkoutUrl: getStoreCheckoutUrl(product.id) });
  } catch (error) {
    console.error("ResumeLite checkout setup error:", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
