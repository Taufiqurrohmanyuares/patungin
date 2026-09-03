"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { calculateSplit, formatRupiah } from "../lib/calculateSplit";

const STEP_INDEX = { items: 1, assign: 2, summary: 3 };

// QA Fix: Menangani input kosong atau NaN agar tidak merusak kalkulasi
function clampNonNegative(val) {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function initials(name) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function initialAssignmentsMap(initialState) {
  const map = {};
  (initialState?.items ?? []).forEach((item) => {
    map[item.id] = new Set();
  });
  (initialState?.assignments ?? []).forEach(({ itemId, participantId }) => {
    if (!map[itemId]) map[itemId] = new Set();
    map[itemId].add(participantId);
  });
  return map;
}

export default function PatunginApp({ receiptId, initialState }) {
  const [screen, setScreen] = useState("items");

  const [items, setItems] = useState(initialState?.items ?? []); 
  const [participants, setParticipants] = useState(initialState?.participants ?? []); 
  const [assignments, setAssignments] = useState(() => initialAssignmentsMap(initialState)); 
  const [splitMode, setSplitMode] = useState(initialState?.splitMode ?? "itemized");

  const [taxMode, setTaxMode] = useState(initialState?.taxMode ?? "percent");
  const [taxValue, setTaxValue] = useState(initialState?.taxValue ?? initialState?.taxPercent ?? 0);
  const [serviceMode, setServiceMode] = useState(initialState?.serviceMode ?? "percent");
  const [serviceValue, setServiceValue] = useState(
    initialState?.serviceValue ?? initialState?.servicePercent ?? 0
  );
  const [discountAmount, setDiscountAmount] = useState(initialState?.discountAmount ?? 0);

  const [itemNameInput, setItemNameInput] = useState("");
  const [itemPriceInput, setItemPriceInput] = useState("");
  const [itemError, setItemError] = useState("");

  const [participantNameInput, setParticipantNameInput] = useState("");
  const [participantError, setParticipantError] = useState("");

  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  const [linkCopied, setLinkCopied] = useState(false);
  const linkTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(linkTimeoutRef.current), []);

  // ---------- AI Vision Scanner State ----------
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileInputRef = useRef(null);

  const MAX_IMAGE_MB = 8;

  async function handleScanReceipt(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setScanError(`Ukuran foto kegedean (maks ${MAX_IMAGE_MB}MB). Coba foto ulang atau kompres dulu.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsScanning(true);
    setScanError("");

    try {
      // Konversi file ke Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve) => (reader.onload = resolve));
      
      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: reader.result }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal memindai struk.");
      }
      
      const { data } = await res.json();
      
      // Injeksi data AI ke dalam state aplikasi
      if (Array.isArray(data) && data.length > 0) {
        const newItems = data.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name || "Item Tidak Terbaca",
          price: Number(item.price) || 0,
        }));

        setItems((prev) => [...prev, ...newItems]);
        
        // Inisialisasi set assignment untuk item baru
        setAssignments((prev) => {
          const next = { ...prev };
          newItems.forEach((i) => (next[i.id] = new Set()));
          return next;
        });
      } else {
        setScanError("AI tidak menemukan item pesanan di struk ini.");
      }
    } catch (err) {
      setScanError(err.message || "Koneksi gagal, coba lagi.");
    } finally {
      setIsScanning(false);
      // Reset input agar bisa memindai file yang sama dua kali berturut-turut
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  }

  // ---------- Auto-save to Supabase (debounced) ----------
  const [saveStatus, setSaveStatus] = useState("idle"); 
  const isFirstRender = useRef(true);
  const abortControllerRef = useRef(null); // Mencegah Race Condition di API

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!receiptId) return;

    setSaveStatus("saving");
    
    // Batalkan request sebelumnya jika user mengetik lagi sebelum 800ms
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const timeout = setTimeout(async () => {
      const payload = {
        items: items.map(({ id, name, price }) => ({ id, name, price })),
        participants: participants.map(({ id, name }) => ({ id, name })),
        assignments: Object.entries(assignments).flatMap(([itemId, set]) =>
          [...set].map((participantId) => ({ itemId, participantId }))
        ),
        taxMode,
        taxValue,
        serviceMode,
        serviceValue,
        discountAmount,
        splitMode,
      };
      
      try {
        const res = await fetch(`/api/receipts/${receiptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal, // Menyematkan Abort Signal
        });
        if (!res.ok) throw new Error("save failed");
        setSaveStatus("saved");
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSaveStatus("error");
          console.error("Gagal menyimpan data:", err);
        }
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [items, participants, assignments, taxMode, taxValue, serviceMode, serviceValue, discountAmount, splitMode, receiptId]);

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    clearTimeout(linkTimeoutRef.current);
    linkTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
  }

  // ---------- Items ----------
  function handleAddItem(e) {
    e.preventDefault();
    const trimmed = itemNameInput.trim();
    const price = parseFloat(itemPriceInput);

    if (!trimmed) return setItemError("Nama item belum diisi.");
    if (!Number.isFinite(price) || price <= 0) return setItemError("Harga harus lebih dari 0.");
    setItemError("");

    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, name: trimmed, price }]);
    setAssignments((prev) => ({ ...prev, [id]: new Set() }));
    setItemNameInput("");
    setItemPriceInput("");
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // ---------- Participants ----------
  function handleAddParticipant(e) {
    e.preventDefault();
    const trimmed = participantNameInput.trim();
    if (!trimmed) return setParticipantError("Nama peserta belum diisi.");
    const duplicate = participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return setParticipantError("Nama itu sudah ada, pakai nama lain biar gak ketuker.");
    setParticipantError("");

    const id = crypto.randomUUID();
    setParticipants((prev) => [...prev, { id, name: trimmed }]);
    setParticipantNameInput("");
  }

  function removeParticipant(id) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setAssignments((prev) => {
      const next = {};
      for (const [itemId, set] of Object.entries(prev)) {
        const newSet = new Set(set);
        newSet.delete(id);
        next[itemId] = newSet;
      }
      return next;
    });
  }

  function toggleAssignment(itemId, participantId) {
    setAssignments((prev) => {
      const set = new Set(prev[itemId] || []);
      if (set.has(participantId)) set.delete(participantId);
      else set.add(participantId);
      return { ...prev, [itemId]: set };
    });
  }

  // ---------- Navigation ----------
  function goToAssign() {
    setScreen("assign");
  }

  function goToSummary() {
    setScreen("summary");
  }

  // ---------- Split calculation ----------
  const { results, grandTotal } = useMemo(
    () => calculateSplit({ items, participants, assignments, splitMode, taxMode, taxValue, serviceMode, serviceValue, discountAmount }),
    [items, participants, assignments, splitMode, taxMode, taxValue, serviceMode, serviceValue, discountAmount]
  );

  async function handleCopySummary() {
    const lines = [
      "Ringkasan Patungin",
      ...results.map((r) => `${r.name}: ${formatRupiah(r.rounded)}`),
      `Total: ${formatRupiah(grandTotal)}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      // Silently fail if unsupported
    }
    setCopyFeedback(true);
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(false), 2500);
  }

  const stepIndex = STEP_INDEX[screen];

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="brand brand-link">
          <svg
            className="brand-back-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="brand-mark">P</span>
          Patungin
        </Link>
        <div className="topbar-actions">
          {/* Visual Feedback untuk Status Auto-Save */}
          <span
            className={`save-status${saveStatus === "error" ? " save-status-error" : ""}`}
            aria-live="polite"
          >
            {saveStatus === "saving" && "Menyimpan…"}
            {saveStatus === "saved" && "✓ Tersimpan"}
            {saveStatus === "error" && "⚠ Gagal menyimpan"}
          </span>
          <button type="button" className="link-copy-btn" onClick={handleCopyLink}>
            {linkCopied ? "Link disalin" : "Salin link"}
          </button>
          <div className="steps" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`step-dot${n <= stepIndex ? " active" : ""}`} />
            ))}
          </div>
        </div>
      </header>

      <main>
        {screen === "items" && (
          <ItemsScreen
            items={items}
            itemNameInput={itemNameInput}
            itemPriceInput={itemPriceInput}
            itemError={itemError}
            taxMode={taxMode}
            taxValue={taxValue}
            serviceMode={serviceMode}
            serviceValue={serviceValue}
            discountAmount={discountAmount}
            isScanning={isScanning}
            scanError={scanError}
            fileInputRef={fileInputRef}
            onScanReceipt={handleScanReceipt}
            onNameChange={setItemNameInput}
            onPriceChange={setItemPriceInput}
            onSubmit={handleAddItem}
            onRemove={removeItem}
            onTaxModeChange={setTaxMode}
            onTaxChange={(v) => setTaxValue(clampNonNegative(v))}
            onServiceModeChange={setServiceMode}
            onServiceChange={(v) => setServiceValue(clampNonNegative(v))}
            onDiscountChange={(v) => setDiscountAmount(clampNonNegative(v))}
            onNext={goToAssign}
          />
        )}

        {screen === "assign" && (
          <AssignScreen
            items={items}
            participants={participants}
            assignments={assignments}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            participantNameInput={participantNameInput}
            participantError={participantError}
            onParticipantNameChange={setParticipantNameInput}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={removeParticipant}
            onToggleAssignment={toggleAssignment}
            onBack={() => setScreen("items")}
            onNext={goToSummary}
          />
        )}

        {screen === "summary" && (
          <SummaryScreen
            results={results}
            grandTotal={grandTotal}
            copyFeedback={copyFeedback}
            onBack={() => setScreen("assign")}
            onCopy={handleCopySummary}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// Sub-Components
// ==========================================

// Toggle kecil buat milih apakah suatu biaya (pajak/service) dihitung
// sebagai persentase dari subtotal, atau nominal rupiah tetap — dua-duanya
// muncul di struk asli tergantung tempatnya.
function ChargeModeToggle({ mode, onModeChange, label }) {
  return (
    <div className="mode-toggle" role="group" aria-label={label}>
      <button
        type="button"
        className={`mode-toggle-btn${mode === "percent" ? " active" : ""}`}
        aria-pressed={mode === "percent"}
        onClick={() => onModeChange("percent")}
      >
        %
      </button>
      <button
        type="button"
        className={`mode-toggle-btn${mode === "amount" ? " active" : ""}`}
        aria-pressed={mode === "amount"}
        onClick={() => onModeChange("amount")}
      >
        Rp
      </button>
    </div>
  );
}

function ItemsScreen({
  items, itemNameInput, itemPriceInput, itemError,
  taxMode, taxValue, serviceMode, serviceValue, discountAmount,
  isScanning, scanError, fileInputRef, onScanReceipt,
  onNameChange, onPriceChange, onSubmit, onRemove,
  onTaxModeChange, onTaxChange, onServiceModeChange, onServiceChange,
  onDiscountChange, onNext,
}) {
  
  // QA Fix: Mencegah user mengetik simbol minus, 'e', atau '+' pada kolom angka
  const blockInvalidNumberChars = (e) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <section aria-labelledby="items-heading">
      <h1 id="items-heading">Masukkan item struk</h1>
      <p className="sub">
        Ketik manual atau <strong>Scan Foto Struk</strong> biar otomatis.
      </p>

      {/* Area Kamera AI */}
      <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={onScanReceipt}
          style={{ display: "none" }}
          id="camera-input"
        />
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", gap: "8px", opacity: isScanning ? 0.7 : 1 }}
        >
          {isScanning ? "AI Sedang Membaca..." : "📸 Scan Foto Struk"}
        </button>
        {scanError && <p className="field-error">{scanError}</p>}
      </div>

      <form className="row-form" onSubmit={onSubmit} noValidate>
        <input
          type="text"
          className="item-name-input"
          placeholder="Nama item, misal Nasi goreng"
          autoComplete="off"
          value={itemNameInput}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <input
          type="number"
          className="item-price-input"
          placeholder="Harga"
          min="0"
          inputMode="numeric"
          onKeyDown={blockInvalidNumberChars}
          value={itemPriceInput}
          onChange={(e) => onPriceChange(e.target.value)}
        />
        <button type="submit" className="btn btn-ghost">Tambah</button>
      </form>
      {itemError && <p className="field-error">{itemError}</p>}

      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <span className="item-name">{item.name}</span>
            <span className="item-price">{formatRupiah(item.price)}</span>
            <button
              type="button"
              className="item-remove"
              aria-label={`Hapus ${item.name}`}
              onClick={() => onRemove(item.id)}
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="empty-note">Belum ada item. Tambahkan minimal satu item buat lanjut.</p>
      )}

      <div className="charges">
        <label>
          <div className="charge-label-row">
            <span>Pajak</span>
            <ChargeModeToggle mode={taxMode} onModeChange={onTaxModeChange} label="Jenis nilai pajak" />
          </div>
          <div className="unit-input">
            {taxMode === "amount" && <span>Rp</span>}
            <input
              type="number"
              min="0"
              max={taxMode === "percent" ? 100 : undefined}
              inputMode="numeric"
              onKeyDown={blockInvalidNumberChars}
              value={taxValue || ""}
              onChange={(e) => onTaxChange(e.target.value)}
            />
            {taxMode === "percent" && <span>%</span>}
          </div>
        </label>
        <label>
          <div className="charge-label-row">
            <span>Service charge</span>
            <ChargeModeToggle
              mode={serviceMode}
              onModeChange={onServiceModeChange}
              label="Jenis nilai service charge"
            />
          </div>
          <div className="unit-input">
            {serviceMode === "amount" && <span>Rp</span>}
            <input
              type="number"
              min="0"
              max={serviceMode === "percent" ? 100 : undefined}
              inputMode="numeric"
              onKeyDown={blockInvalidNumberChars}
              value={serviceValue || ""}
              onChange={(e) => onServiceChange(e.target.value)}
            />
            {serviceMode === "percent" && <span>%</span>}
          </div>
        </label>
        <label>
          <span>Diskon</span>
          <div className="unit-input">
            <span>Rp</span>
            <input
              type="number" min="0" inputMode="numeric"
              onKeyDown={blockInvalidNumberChars}
              value={discountAmount || ""}
              onChange={(e) => onDiscountChange(e.target.value)}
            />
          </div>
        </label>
      </div>

      <div className="nav-row nav-row-end">
        <button type="button" className="btn btn-primary" disabled={items.length === 0} onClick={onNext}>
          Lanjut ke peserta
        </button>
      </div>
    </section>
  );
}

function AssignScreen({
  items, participants, assignments,
  splitMode, onSplitModeChange,
  participantNameInput, participantError,
  onParticipantNameChange, onAddParticipant, onRemoveParticipant,
  onToggleAssignment, onBack, onNext,
}) {
  
  // UX Fix: Hitung otomatis apakah ada item yang belum di-assign (yatim piatu)
  // — cuma relevan di mode itemized, karena mode equal gak butuh assign sama sekali.
  const unassignedItems = items.filter(
    (item) => !assignments[item.id] || assignments[item.id].size === 0
  );
  
  // UX Fix: Tombol hanya aktif jika peserta >= 2, dan (kalau mode itemized)
  // semua item sudah ada pemiliknya. Mode equal cukup ada item + peserta.
  const isReadyToCalculate =
    participants.length >= 2 &&
    items.length > 0 &&
    (splitMode === "equal" || unassignedItems.length === 0);

  return (
    <section aria-labelledby="assign-heading">
      <h1 id="assign-heading">Tambah peserta, lalu assign</h1>
      <p className="sub">
        Tandai siapa saja yang pesan tiap item. Satu item boleh ditandai lebih dari satu orang.
      </p>

      <div className="split-mode-row">
        <span className="split-mode-label">Cara bagi:</span>
        <div className="mode-toggle" role="group" aria-label="Cara membagi tagihan">
          <button
            type="button"
            className={`mode-toggle-btn${splitMode === "itemized" ? " active" : ""}`}
            aria-pressed={splitMode === "itemized"}
            onClick={() => onSplitModeChange("itemized")}
          >
            Sesuai pesanan
          </button>
          <button
            type="button"
            className={`mode-toggle-btn${splitMode === "equal" ? " active" : ""}`}
            aria-pressed={splitMode === "equal"}
            onClick={() => onSplitModeChange("equal")}
          >
            Bagi rata
          </button>
        </div>
      </div>

      <form className="row-form" onSubmit={onAddParticipant} noValidate>
        <input
          type="text"
          className="participant-name-input"
          placeholder="Nama peserta, misal Budi"
          autoComplete="off"
          value={participantNameInput}
          onChange={(e) => onParticipantNameChange(e.target.value)}
        />
        <button type="submit" className="btn btn-ghost">Tambah</button>
      </form>
      {participantError && <p className="field-error">{participantError}</p>}

      <div className="chip-row">
        {participants.map((p) => (
          <span className="chip" key={p.id}>
            <span>{p.name}</span>
            <button type="button" aria-label={`Hapus peserta ${p.name}`} onClick={() => onRemoveParticipant(p.id)}>
              ×
            </button>
          </span>
        ))}
      </div>
      {participants.length < 2 && <p className="empty-note">Tambahkan minimal dua peserta.</p>}

      {splitMode === "equal" ? (
        <p className="empty-note equal-mode-note">
          Mode "Bagi rata" aktif — semua item ({items.length}) otomatis dibagi rata ke semua
          peserta ({participants.length}), gak perlu ditandai satu-satu. Assignment yang udah
          kamu tandai sebelumnya tetap kesimpen kalau mau balik ke "Sesuai pesanan".
        </p>
      ) : (
        <div className="assign-list">
          {items.map((item) => (
            <div className="assign-item" key={item.id}>
              <div className="assign-item-head">
                <span className="name">{item.name}</span>
                <span className="price">{formatRupiah(item.price)}</span>
              </div>
              <div className="assign-chips">
                {participants.length === 0 ? (
                  <span className="assign-toggle" aria-disabled="true">Tambahkan peserta dulu</span>
                ) : (
                  participants.map((p) => {
                    const selected = assignments[item.id]?.has(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        className={`assign-toggle${selected ? " selected" : ""}`}
                        onClick={() => onToggleAssignment(item.id, p.id)}
                      >
                        {p.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pesan Peringatan jika ada item yang belum di-assign (cuma di mode itemized) */}
      {splitMode === "itemized" && participants.length >= 2 && unassignedItems.length > 0 && (
        <p className="field-warning">
          Peringatan: {unassignedItems.map((i) => i.name).join(", ")} belum ada yang bayar!
        </p>
      )}

      <div className="nav-row">
        <button type="button" className="btn btn-text" onClick={onBack}>Kembali</button>
        <button 
          type="button" 
          className="btn btn-primary" 
          disabled={!isReadyToCalculate} 
          onClick={onNext}
          title={!isReadyToCalculate ? "Selesaikan assignment untuk melihat hasil" : ""}
        >
          Lihat hasil
        </button>
      </div>
    </section>
  );
}

function SummaryScreen({ results, grandTotal, copyFeedback, onBack, onCopy }) {
  return (
    <section aria-labelledby="summary-heading">
      <h1 id="summary-heading">Ringkasan pembayaran</h1>
      <p className="sub">
        Pajak, service charge, dan diskon sudah dibagi sesuai porsi belanja masing-masing.
      </p>

      <ul className="summary-list">
        {results.map((r) => (
          <li key={r.id}>
            <div className="avatar" aria-hidden="true">{initials(r.name)}</div>
            <div className="summary-name">{r.name}</div>
            <span className="summary-amount">{formatRupiah(r.rounded)}</span>
          </li>
        ))}
      </ul>

      <div className="summary-total">
        <span>Total struk</span>
        <span>{formatRupiah(grandTotal)}</span>
      </div>

      <div className="nav-row">
        <button type="button" className="btn btn-text" onClick={onBack}>Kembali</button>
        <button type="button" className="btn btn-primary" onClick={onCopy}>Salin ringkasan</button>
      </div>
      {copyFeedback && <p className="copy-feedback">✓ Ringkasan berhasil disalin.</p>}
    </section>
  );
}