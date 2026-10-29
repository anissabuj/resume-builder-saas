import { NextRequest, NextResponse } from "next/server";
import { createResumeOrder } from "../../../lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://resume.howlark.com").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(APP_URL).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const checkout = await createResumeOrder();
    return NextResponse.json(checkout, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("ResumeLite checkout initialization error:", error);
    return NextResponse.json(
      { error: "Checkout is not ready. The site owner must configure WooCommerce REST API access and confirm the store uses USD." },
      { status: 503 }
    );
  }
}
