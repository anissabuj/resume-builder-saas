import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateResumeProduct } from "@/lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expectedToken = process.env.RESUMELITE_SETUP_TOKEN;
  const authorization = request.headers.get("authorization") || "";
  if (!expectedToken || authorization !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const product = await createOrUpdateResumeProduct();
    return NextResponse.json({
      success: true,
      productId: product.id,
      sku: product.sku,
      price: product.regular_price,
      currency: process.env.RESUMELITE_EXPECTED_CURRENCY || "USD",
      virtual: product.virtual,
    });
  } catch (error) {
    console.error("ResumeLite product setup error:", error);
    return NextResponse.json(
      { error: "Product setup failed. Check the WooCommerce API credentials, store currency, and API permissions." },
      { status: 503 }
    );
  }
}
