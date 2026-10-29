"use client";

import { useEffect, useState } from "react";

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

type OrderReference = { orderId: number; orderKey: string };

const initialResume: Resume = {
  name: "Alex Morgan",
  title: "Marketing Specialist",
  email: "alex@example.com",
  phone: "+1 555 010 2040",
  location: "New York, NY",
  summary: "Results-oriented professional with experience growing digital audiences, improving customer journeys, and delivering measurable business outcomes.",
  skills: "Digital marketing, SEO, Analytics, Project management, Communication",
  experience: "Marketing Specialist | Bright Co. | 2022–Present\n• Planned campaigns and reported on performance.\n• Improved website content and conversion journeys.",
  education: "B.A. Business Administration | Example University | 2018–2022"
};

const RESUME_STORAGE_KEY = "resumelite.resume.v1";
const ORDER_STORAGE_KEY = "resumelite.pending-order.v1";

export default function Home() {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [loaded, setLoaded] = useState(false);
  const [order, setOrder] = useState<OrderReference | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function update(field: keyof Resume, value: string) {
    setResume((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    let active = true;
    try {
      const savedResume = localStorage.getItem(RESUME_STORAGE_KEY);
      if (savedResume) {
        const parsed = JSON.parse(savedResume) as Partial<Resume>;
        if (parsed && typeof parsed === "object") {
          setResume({ ...initialResume, ...parsed });
        }
      }
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const fragmentOrderId = Number(fragment.get("order_id"));
      const fragmentOrderKey = fragment.get("order_key");
      let pendingOrder: OrderReference | null = null;

      if (Number.isSafeInteger(fragmentOrderId) && fragmentOrderId > 0 && fragmentOrderKey && fragmentOrderKey.length <= 200) {
        pendingOrder = { orderId: fragmentOrderId, orderKey: fragmentOrderKey };
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(pendingOrder));
      } else {
        const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
        if (savedOrder) {
          const parsed = JSON.parse(savedOrder) as OrderReference;
          if (Number.isSafeInteger(parsed.orderId) && parsed.orderId > 0 && typeof parsed.orderKey === "string") {
            pendingOrder = parsed;
          }
        }
      }

      if (pendingOrder) {
        setOrder(pendingOrder);
        setMessage("Checking your payment with WooCommerce…");
        fetch("/api/verify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingOrder),
          cache: "no-store"
        }).then(async (response) => {
          const result = await response.json();
          if (!active) return;
          if (response.ok && result.paid === true) {
            setIsPaid(true);
            setMessage("Payment verified. Your PDF is ready to download.");
          } else {
            setIsPaid(false);
            setMessage(query.get("payment") === "return" || fragmentOrderId > 0
              ? "Payment is not confirmed yet. If you just paid, wait a few seconds and refresh this page."
              : "Complete checkout to unlock your PDF download.");
          }
        }).catch(() => {
          if (active) setMessage("We could not verify payment right now. Please refresh this page.");
        });
      } else if (query.get("payment") === "return") {
        setMessage("We couldn't find the order reference. Please contact support before paying again.");
      }

      if (query.get("payment") === "return" || fragmentOrderId > 0) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {
      setMessage("We couldn't restore your saved resume in this browser.");
    } finally {
      setLoaded(true);
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume)); } catch { /* storage may be disabled */ }
    }
  }, [resume, loaded]);

  async function startCheckout() {
    setBusy(true);
    setMessage("Preparing secure checkout…");
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
      const response = await fetch("/api/checkout", { method: "POST", cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "Checkout could not be started.");
      }
      localStorage.removeItem(ORDER_STORAGE_KEY);
      setOrder(null);
      setIsPaid(false);
      window.location.assign(String(result.checkoutUrl));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started. Please try again.");
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!order || !isPaid) {
      setMessage("Complete payment before downloading your PDF.");
      return;
    }
    setBusy(true);
    setMessage("Verifying payment and preparing your PDF…");
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, resume }),
        cache: "no-store"
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Download failed. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(resume.name || "resume").replace(/[^a-z0-9-_]+/gi, "-") || "resume"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Your PDF has been downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="brand">Resume<span>Lite</span></div>
          <p className="tagline">Create your resume and download it for $2.</p>
        </div>
        <button className="primary printButton" disabled={busy || !loaded} onClick={isPaid ? downloadPdf : startCheckout}>
          {busy ? "Please wait…" : isPaid ? "Download PDF" : "Pay $2 & Download PDF"}
        </button>
      </header>

      <section className="intro">
        <span className="eyebrow">ONE-TIME PAYMENT · NO SUBSCRIPTION</span>
        <h1>Build a clean resume in minutes.</h1>
        <p>Edit your information and see your resume update instantly. Pay once through our secure WooCommerce checkout, then download your PDF.</p>
      </section>

      {message && <p role="status" aria-live="polite" className="paymentMessage">{message}</p>}

      <div className="workspace">
        <section className="editor panel">
          <div className="sectionHeading">
            <div>
              <h2>Your information</h2>
              <p>Fill in the details below.</p>
            </div>
            <button className="secondary" onClick={() => setResume(initialResume)}>Reset demo</button>
          </div>

          <div className="formGrid">
            <label>Full name<input value={resume.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" /></label>
            <label>Professional title<input value={resume.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Software Developer" /></label>
            <label>Email<input type="email" value={resume.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></label>
            <label>Phone<input value={resume.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 ..." /></label>
            <label className="full">Location<input value={resume.location} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" /></label>
            <label className="full">Professional summary<textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} rows={4} placeholder="A short introduction about you" /></label>
            <label className="full">Skills <span className="hint">(separate with commas)</span><textarea value={resume.skills} onChange={(e) => update("skills", e.target.value)} rows={3} placeholder="Communication, Excel, ..." /></label>
            <label className="full">Work experience<textarea value={resume.experience} onChange={(e) => update("experience", e.target.value)} rows={6} placeholder="Role | Company | Dates\nDescribe your achievements..." /></label>
            <label className="full">Education<textarea value={resume.education} onChange={(e) => update("education", e.target.value)} rows={3} placeholder="Degree | School | Dates" /></label>
          </div>
          <div className="checkoutActions">
            <button className="primary" disabled={busy || !loaded} onClick={isPaid ? downloadPdf : startCheckout}>
              {busy ? "Please wait…" : isPaid ? "Download PDF" : "Pay $2 & Download PDF"}
            </button>
            <span className="secureNote">Secure checkout · One-time payment · No subscription</span>
          </div>
        </section>

        <section className="previewWrap">
          <div className="previewLabel"><span className="liveDot" /> LIVE PREVIEW</div>
          <article className="resume">
            <div className="resumeHeader">
              <h2>{resume.name || "Your Name"}</h2>
              <p className="resumeTitle">{resume.title || "Professional Title"}</p>
              <p className="contact">{[resume.email, resume.phone, resume.location].filter(Boolean).join("  •  ")}</p>
            </div>
            {resume.summary.trim() && <section className="resumeSection"><h3>PROFILE</h3><p>{resume.summary}</p></section>}
            {resume.skills.trim() && <section className="resumeSection"><h3>SKILLS</h3><div className="skillList">{resume.skills.split(",").map((skill) => skill.trim()).filter(Boolean).map((skill, i) => <span key={`${skill}-${i}`} className="skill">{skill}</span>)}</div></section>}
            {resume.experience.trim() && <section className="resumeSection"><h3>EXPERIENCE</h3><p className="multiline">{resume.experience}</p></section>}
            {resume.education.trim() && <section className="resumeSection"><h3>EDUCATION</h3><p className="multiline">{resume.education}</p></section>}
          </article>
          <p className="previewNote">Your resume stays in this browser. Payment is verified on the server before every PDF download.</p>
        </section>
      </div>

      <footer>ResumeLite · $2 one-time PDF download · No subscription</footer>
    </main>
  );
}
