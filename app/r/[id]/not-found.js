import Link from "next/link";

export default function ReceiptNotFound() {
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
      </header>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h1>Sesi tidak ditemukan</h1>
        <p className="sub">
          Link ini mungkin salah ketik, atau sesinya sudah dihapus. Coba mulai sesi baru.
        </p>
        <Link href="/" className="btn btn-primary">
          Mulai patungan baru
        </Link>
      </main>
    </div>
  );
}