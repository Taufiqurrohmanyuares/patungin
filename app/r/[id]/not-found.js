import Link from "next/link";

export default function ReceiptNotFound() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Patungin</span>
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
