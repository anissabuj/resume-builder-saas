import { NextRequest, NextResponse } from "next/server";
import { verifyPaidResumeOrder } from "../../../lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { orderId?: unknown; orderKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = Number(body.orderId);
  const orderKey = typeof body.orderKey === "string" ? body.orderKey : "";
  if (!Number.isSafeInteger(orderId) || orderId < 1 || orderKey.length < 8 || orderKey.length > 200) {
    return NextResponse.json({ error: "Invalid order reference." }, { status: 400 });
  }

  try {
    const result = await verifyPaidResumeOrder(orderId, orderKey);
    return NextResponse.json(result, { status: result.status === "invalid_order_key" ? 403 : 200 });
  } catch (error) {
    console.error("ResumeLite order verification error:", error);
    return NextResponse.json({ error: "Unable to verify payment right now." }, { status: 503 });
  }
}
