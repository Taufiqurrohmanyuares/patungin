import "./globals.css";

export const metadata = {
  title: "Porsi — Makan bareng. Bayar sesuai porsi.",
  description:
    "Foto struk, tandai siapa pesan apa, dan Porsi hitung siapa bayar berapa, lengkap dengan pajak dan service.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}