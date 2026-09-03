"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_PHASES = ["scan", "assign", "split"];

const STEPS = [
  { title: "Foto dan baca otomatis", desc: "AI baca item dan harga langsung dari foto struk." },
  { title: "Assign ke teman", desc: "Tandai siapa pesan apa cukup sekali tap." },
  { title: "Split adil otomatis", desc: "Pajak dan service charge dibagi proporsional." },
];

const FEATURES = [
  {
    title: "Scan struk otomatis",
    desc: "Foto struk, AI baca item dan harga satu-satu. Nggak perlu ketik manual.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
  {
    title: "Assign per item",
    desc: "Tandai siapa pesan apa dengan sekali tap. Satu item bisa dibagi ke beberapa orang.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
        <circle cx="17.5" cy="8.5" r="2.3" />
        <path d="M15.8 14.3c2.8.4 4.7 2.6 4.7 5.5" />
      </svg>
    ),
  },
  {
    title: "Pajak & service otomatis",
    desc: "Biaya tambahan di struk dibagi proporsional sesuai belanjaan tiap orang, bukan rata.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19 19 5" />
        <circle cx="7" cy="7" r="2.2" />
        <circle cx="17" cy="17" r="2.2" />
      </svg>
    ),
  },
  {
    title: "Tinggal share link",
    desc: "Tiap orang buka link, lihat bagian masing-masing langsung. Nggak perlu install apa-apa.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 13.5a4 4 0 0 0 5.6.4l2.8-2.8a4 4 0 0 0-5.6-5.6l-1.6 1.5" />
        <path d="M13.5 10.5a4 4 0 0 0-5.6-.4L5.1 12.9a4 4 0 0 0 5.6 5.6l1.6-1.5" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState(0);
  const router = useRouter();
  const pausedRef = useRef(false);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setPhase((p) => (p + 1) % DEMO_PHASES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/receipts", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat sesi baru.");
      router.push(`/r/${body.id}`);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan, coba lagi.");
      setLoading(false);
    }
  }

  function scrollToSteps() {
    document.getElementById("cara-kerja")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <div className="landing-hero-zone">
          <nav className="landing-nav">
            <div className="landing-nav-left">
              <span className="brand">
                <span className="brand-mark">P</span>
                Patungin
              </span>
              <div className="landing-nav-links">
                <a href="#fitur">Fitur</a>
                <a href="#cara-kerja">Cara kerja</a>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
              {loading ? "Menyiapkan..." : "Coba sekarang"}
            </button>
          </nav>

          <div className="landing-hero">
            <div>
              <h1 className="landing-title">Patungin</h1>
              <p className="landing-hero-sub">
                Foto struk, tandai siapa pesan apa, dan biarkan Patungin hitung bagian tiap
                orang secara adil.
              </p>
              <div className="landing-cta-row">
                <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
                  {loading ? "Menyiapkan..." : "Coba sekarang"}
                </button>
                <button className="landing-demo-link" onClick={scrollToSteps} type="button">
                  Lihat cara kerja
                </button>
              </div>
              {error && (
                <p className="field-error" style={{ maxWidth: "38ch", marginTop: 16 }}>
                  {error}
                </p>
              )}
            </div>

            <div>
              <div
                className="struk-card-wrap"
                onMouseEnter={() => (pausedRef.current = true)}
                onMouseLeave={() => (pausedRef.current = false)}
                onFocus={() => (pausedRef.current = true)}
                onBlur={() => (pausedRef.current = false)}
              >
                <div
                  className="struk-card"
                  role="group"
                  aria-label="Contoh animasi cara Patungin membagi tagihan"
                >
                  <p className="struk-label">
                    {phase === 0 && "Struk dibaca otomatis"}
                    {phase === 1 && "Ditandai siapa pesan apa"}
                    {phase === 2 && "Kebagi otomatis"}
                  </p>

                  <div className="struk-phase" key={phase}>
                    {phase === 0 && (
                      <>
                        <div className="struk-row">
                          <span>Nasi goreng</span>
                          <span>25rb</span>
                        </div>
                        <div className="struk-row">
                          <span>Es teh</span>
                          <span>8rb</span>
                        </div>
                        <div className="struk-total">
                          <span>Total</span>
                          <span>33rb</span>
                        </div>
                      </>
                    )}

                    {phase === 1 && (
                      <>
                        <div className="struk-assign-row">
                          <span>Nasi goreng</span>
                          <span className="struk-mini-chip">B</span>
                        </div>
                        <div className="struk-assign-row">
                          <span>Es teh</span>
                          <span>
                            <span className="struk-mini-chip">R</span>
                            <span className="struk-mini-chip">B</span>
                          </span>
                        </div>
                        <div className="struk-total">
                          <span>Total</span>
                          <span>33rb</span>
                        </div>
                      </>
                    )}

                    {phase === 2 && (
                      <>
                        <div className="struk-summary-row">
                          <span className="avatar-mini">B</span>
                          <span className="name">Bima</span>
                          <span className="amount">29rb</span>
                        </div>
                        <div className="struk-summary-row">
                          <span className="avatar-mini">R</span>
                          <span className="name">Rani</span>
                          <span className="amount">4rb</span>
                        </div>
                        <div className="struk-total">
                          <span>Total</span>
                          <span>33rb</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="struk-tear" aria-hidden="true" />
              </div>

              <div className="struk-dots">
                {DEMO_PHASES.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    className={`struk-dot${phase === i ? " active" : ""}`}
                    aria-label={`Tahap ${i + 1}`}
                    aria-current={phase === i ? "step" : undefined}
                    onClick={() => setPhase(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-features-zone" id="fitur">
          <h2 className="landing-section-heading">Semua yang dibutuhkan buat patungan</h2>
          <p className="landing-section-sub">
            Dari foto struk sampai siapa harus transfer berapa, satu alur, tanpa kalkulator.
          </p>

          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-steps-zone" id="cara-kerja">
          <h2 className="landing-section-heading">Ubah struk berantakan jadi split yang adil</h2>
          <p className="landing-section-sub">Tiga langkah, tanpa kalkulator, tanpa drama patungan. Klik salah satu buat lihat contohnya.</p>

          <div
            className="landing-steps-grid"
            onMouseEnter={() => (pausedRef.current = true)}
            onMouseLeave={() => (pausedRef.current = false)}
          >
            {STEPS.map((step, i) => (
              <button
                type="button"
                key={step.title}
                className={`landing-step-card${phase === i ? " featured" : ""}`}
                onClick={() => setPhase(i)}
                onFocus={() => (pausedRef.current = true)}
                onBlur={() => (pausedRef.current = false)}
                aria-pressed={phase === i}
              >
                <p className="landing-step-index">{String(i + 1).padStart(2, "0")}/</p>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-desc">{step.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <footer className="landing-footer">Patungin — split bill tanpa drama.</footer>
      </div>
    </div>
  );
}