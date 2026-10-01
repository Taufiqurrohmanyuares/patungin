"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./landing.css";

const PEOPLE = ["Ares", "Rian", "Budi"];
const ITEMS = [
  { name: "Nasi Goreng", price: 28000 },
  { name: "Es Teh", price: 8000 },
  { name: "Ayam Geprek", price: 25000 },
];
const TAX = 0.1;

const rp = (n) => "Rp" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Sparkle({ size, className = "", style }) {
  return (
    <svg className={`pl-sp ${className}`} style={{ "--s": `${size}px`, ...style }} aria-hidden="true">
      <use href="#sp" />
    </svg>
  );
}

/* Mockup interaktif: ketuk nama untuk ganti siapa yang pesan */
function AssignDemo({ autoPlay }) {
  const [assigned, setAssigned] = useState({ 0: ["Ares"], 1: ["Ares"], 2: ["Budi"] });
  const [tick, setTick] = useState(0);
  const sumRef = useRef(null);

  function toggle(i, p) {
    setAssigned((prev) => {
      const cur = prev[i];
      const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
      return { ...prev, [i]: next };
    });
    setTick((t) => t + 1);
  }

  // satu momen otomatis: Rian ikut minum es teh
  useEffect(() => {
    if (!autoPlay) return;
    const id = setTimeout(() => toggle(1, "Rian"), 700);
    return () => clearTimeout(id);
  }, [autoPlay]);

  const totals = Object.fromEntries(PEOPLE.map((p) => [p, 0]));
  ITEMS.forEach((it, i) => {
    const who = assigned[i];
    who.forEach((p) => (totals[p] += it.price / who.length));
  });
  const sub = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="pl-rc">
      {ITEMS.map((it, i) => (
        <div className="pl-it" key={it.name}>
          <div className="r">
            <span>{it.name}</span>
            <span>{rp(it.price)}</span>
          </div>
          <div className="pl-chips">
            {PEOPLE.map((p) => (
              <button
                key={p}
                type="button"
                className="pl-chip"
                aria-pressed={assigned[i].includes(p)}
                onClick={() => toggle(i, p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="pl-sum" ref={sumRef} key={tick}>
        <div className="r m">
          <span>Pajak 10%, dibagi sesuai porsi</span>
          <span>{rp(sub * TAX)}</span>
        </div>
        {PEOPLE.map((p) => (
          <div className="r pl-flash" key={p}>
            <span>{p}</span>
            <span>{rp(totals[p] * (1 + TAX))}</span>
          </div>
        ))}
        <div className="r tot">
          <span>TOTAL</span>
          <span>{rp(sub * (1 + TAX))}</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoOn, setDemoOn] = useState(false);
  const router = useRouter();
  const rootRef = useRef(null);

  // muncul pelan saat discroll
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".pl-rv") ?? [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          if (e.target.dataset.demo && !reduce) setDemoOn(true);
          io.unobserve(e.target);
        }),
      { threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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
    <div className="pl" ref={rootRef}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="sp" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z" />
        </symbol>
        <symbol id="rcp" viewBox="0 0 26 30">
          <path d="M3 2h20v22l-3.3 2.4L16.5 24l-3.5 2.4L9.5 24l-3.2 2.4L3 24z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M7 8h12M7 13h5M7 18h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="14" y="11" width="7" height="3.6" rx="1.8" fill="#5B2A9E" />
          <rect x="14" y="16.4" width="7" height="3.6" rx="1.8" fill="#5B2A9E" />
        </symbol>
      </svg>

      <Sparkle size={26} style={{ left: "5%", top: 150 }} />
      <Sparkle size={34} style={{ right: "8%", top: 132 }} />
      <Sparkle size={22} style={{ right: "12%", top: 360 }} />

      <header className="pl-nav">
        <div className="pl-nav-l">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#fitur">Fitur</a>
        </div>
        <a className="pl-logo" href="/" aria-label="Porsi">
          <svg aria-hidden="true"><use href="#rcp" /></svg>
          <span className="pl-wm">P<span className="o" />RSI</span>
        </a>
        <div className="pl-nav-r">
          <button className="pl-pill sm" onClick={handleStart} disabled={loading} type="button">
            {loading ? "Menyiapkan..." : "Coba sekarang ↗"}
          </button>
        </div>
      </header>

      <main>
        <section className="pl-hero">
          <h1 className="pl-h1">
            Bagi tagihan{" "}
            <span className="pl-star" aria-hidden="true">
              <svg><use href="#sp" /></svg>
            </span>{" "}
            tanpa <span className="pl-nw">hitung-hitungan.</span>
          </h1>
          <p className="pl-sub">Foto struk. Tandai pesanan. Porsi hitung sisanya.</p>
          <div className="pl-cta">
            <button className="pl-pill" onClick={handleStart} disabled={loading} type="button">
              {loading ? "Menyiapkan..." : "Coba sekarang"} <b>↗</b>
            </button>
            <button className="pl-link" onClick={scrollToSteps} type="button">
              Lihat cara kerja
            </button>
          </div>
          {error && <p className="pl-err">{error}</p>}
        </section>

        <section className="pl-box" id="cara-kerja">
          <div className="pl-boxhd">
            <h2>Cara kerja</h2>
            <p>Dari struk di meja sampai semua orang tahu bayar berapa.</p>
          </div>
          <div className="pl-cards">
            <article className="pl-card pl-rv">
              <div className="t"><span>Foto struk</span><i>01</i></div>
              <p className="d">Foto sekali. Nggak perlu input satu-satu.</p>
              <div className="pl-panel">
                <div className="pl-rc">
                  <div className="hd"><span>WARUNG BU TINI</span><span>12 SEP</span></div>
                  {ITEMS.map((it) => (
                    <div className="pl-it" key={it.name}>
                      <div className="r"><span>{it.name}</span><span>{num(it.price)}</span></div>
                    </div>
                  ))}
                  <div className="r" style={{ paddingTop: 8 }}><span>Pajak 10%</span><span>6.100</span></div>
                </div>
              </div>
            </article>

            <article className="pl-card fill pl-rv" data-demo="1">
              <div className="t"><span>Tandai pesanan</span><i>02</i></div>
              <p className="d">Yang pesan, yang bayar. Ketuk namanya.</p>
              <div className="pl-panel"><AssignDemo autoPlay={demoOn} /></div>
            </article>

            <article className="pl-card pl-rv">
              <div className="t"><span>Bagikan</span><i>03</i></div>
              <p className="d">Kirim link. Beres.</p>
              <div className="pl-panel">
                <div className="pl-res">
                  <h4>TAGIHAN #024</h4>
                  <div className="p"><span>Ares</span><span>Rp33.000</span></div>
                  <div className="p"><span>Rian</span><span>Rp41.500</span></div>
                  <div className="p"><span>Dina</span><span>Rp27.000</span></div>
                  <div className="t2"><span>TOTAL</span><span>Rp101.500</span></div>
                  <div className="go">Bagikan hasil</div>
                </div>
              </div>
            </article>
          </div>
          <div className="pl-dots" aria-hidden="true"><i /><i /><i /></div>
        </section>

        <section className="pl-end" id="fitur">
          <Sparkle size={34} style={{ left: "6%", top: 38 }} />
          <Sparkle size={20} className="o" style={{ right: "8%", bottom: 90 }} />
          <small>- Pajak ikut kebagian -</small>
          <h2>
            Bagi per item atau rata, dengan pajak, service, dan diskon yang{" "}
            <span className="pl-hl">dihitung adil</span>
          </h2>
          <p>Struk sudah di tangan? Mulai dari foto, sisanya biar Porsi yang hitung.</p>
          <button className="pl-pill" onClick={handleStart} disabled={loading} type="button">
            {loading ? "Menyiapkan..." : "Coba sekarang"} <b>↗</b>
          </button>
          <div className="pl-foot">
            <span>Porsi</span>
            <span>Makan bareng. Bayar sesuai porsi.</span>
          </div>
        </section>
      </main>
    </div>
  );
}