
"use client";

import { useState } from "react";

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

export default function Home() {
  const [resume, setResume] = useState<Resume>(initialResume);

  function update(field: keyof Resume, value: string) {
    setResume((current) => ({ ...current, [field]: value }));
  }

  function printResume() {
    window.print();
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <div className="brand">Resume<span>Lite</span></div>
          <p className="tagline">A simple resume builder demo</p>
        </div>
        <button className="primary printButton" onClick={printResume}>Print / Save as PDF</button>
      </header>

      <section className="intro">
        <span className="eyebrow">FREE MVP TEST</span>
        <h1>Build a clean resume in minutes.</h1>
        <p>Edit the fields and see your resume update instantly. This lightweight demo works without an account or database.</p>
      </section>

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
            <label className="full">Work experience<textarea value={resume.experience} onChange={(e) => update("experience", e.target.value)} rows={6} placeholder="Role | Company | Dates&#10;Describe your achievements..." /></label>
            <label className="full">Education<textarea value={resume.education} onChange={(e) => update("education", e.target.value)} rows={3} placeholder="Degree | School | Dates" /></label>
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
          <p className="previewNote">Tip: Choose “Print / Save as PDF” to save a PDF from your browser.</p>
        </section>
      </div>

      <footer>ResumeLite MVP · Demo only · No information is sent to a server.</footer>
    </main>
  );
}
