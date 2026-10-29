import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { verifyPaidResumeOrder } from "../../../lib/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resume = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
};

const FIELD_LIMITS: Record<keyof Resume, number> = {
  name: 120,
  title: 160,
  email: 180,
  phone: 80,
  location: 160,
  summary: 4000,
  skills: 3000,
  experience: 12000,
  education: 6000,
};

function normalizeResume(input: unknown): Resume | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const result = {} as Resume;
  for (const [field, max] of Object.entries(FIELD_LIMITS) as [keyof Resume, number][]) {
    const value = source[field];
    if (typeof value !== "string" || value.length > max) return null;
    result[field] = value.trim();
  }
  return result;
}

function createPdf(resume: Resume): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margins: { top: 52, bottom: 52, left: 52, right: 52 }, info: { Title: "Resume", Author: "ResumeLite" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const blue = "#315eea";
    const body = "#354056";
    document.fillColor("#172033").font("Helvetica-Bold").fontSize(25).text(resume.name || "Your Name", { width: 490 });
    document.moveDown(0.25);
    document.fillColor(blue).font("Helvetica-Bold").fontSize(13).text(resume.title || "Professional Title");
    document.moveDown(0.35);
    document.fillColor("#687386").font("Helvetica").fontSize(9).text([resume.email, resume.phone, resume.location].filter(Boolean).join("  •  "), { width: 490 });
    document.moveDown(0.7);
    document.moveTo(52, document.y).lineTo(543, document.y).strokeColor(blue).lineWidth(2).stroke();
    document.moveDown(0.8);

    const section = (heading: string, content: string, skills = false) => {
      if (!content.trim()) return;
      if (document.y > 700) document.addPage();
      document.fillColor(blue).font("Helvetica-Bold").fontSize(10).text(heading.toUpperCase(), { characterSpacing: 1 });
      document.moveDown(0.35);
      document.fillColor(body).font("Helvetica").fontSize(10);
      document.text(skills ? content.split(",").map((item) => item.trim()).filter(Boolean).join("  •  ") : content, { width: 491, lineGap: 3 });
      document.moveDown(0.8);
    };

    section("Profile", resume.summary);
    section("Skills", resume.skills, true);
    section("Experience", resume.experience);
    section("Education", resume.education);
    document.end();
  });
}

export async function POST(request: NextRequest) {
  let body: { orderId?: unknown; orderKey?: unknown; resume?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = Number(body.orderId);
  const orderKey = typeof body.orderKey === "string" ? body.orderKey : "";
  const resume = normalizeResume(body.resume);
  if (!Number.isSafeInteger(orderId) || orderId < 1 || orderKey.length < 8 || orderKey.length > 200 || !resume) {
    return NextResponse.json({ error: "Invalid download request. Please check your resume fields and payment reference." }, { status: 400 });
  }

  try {
    const payment = await verifyPaidResumeOrder(orderId, orderKey);
    if (!payment.paid) {
      return NextResponse.json({ error: "Payment has not been confirmed. Complete checkout before downloading." }, { status: 402 });
    }

    const pdf = await createPdf(resume);
    const filename = (resume.name || "Resume").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "Resume";
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("ResumeLite PDF download error:", error);
    return NextResponse.json({ error: "We could not verify your payment or generate the PDF. Please try again." }, { status: 503 });
  }
}
