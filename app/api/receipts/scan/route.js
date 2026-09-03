import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Pastikan Anda sudah menambahkan GEMINI_API_KEY di file .env.local
const apiKey = process.env.GEMINI_API_KEY;

// gemini-1.5-flash (model lama) sudah resmi di-retire oleh Google — semua
// request ke situ balikin error, bukan cuma "lambat" atau "kadang gagal".
// gemini-2.5-* juga sudah dijadwalkan pensiun (16 Okt 2026) dan malah
// sempat kena retired lebih awal di sebagian akun. Pakai generasi 3.x yang
// masih aktif didukung.
const MODEL = "gemini-3.7-flash";

// Batas ukuran gambar (setelah decode dari base64) — cukup longgar buat
// foto struk dari HP, tapi mencegah payload raksasa yang bikin request
// ke Gemini gagal atau lambat.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

/** Data URL: "data:image/png;base64,iVBORw0..." -> { mimeType, base64Data } */
function parseDataUrl(imageBase64) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageBase64);
  if (match) {
    return { mimeType: match[1], base64Data: match[2] };
  }
  // Sudah base64 murni tanpa prefix data URL — asumsikan JPEG.
  return { mimeType: "image/jpeg", base64Data: imageBase64 };
}

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "Tidak ada gambar." }, { status: 400 });
    }

    const { mimeType, base64Data } = parseDataUrl(imageBase64);

    // Base64 membengkakkan ukuran ~33%; hitung mundur ke ukuran file asli.
    const approxFileBytes = (base64Data.length * 3) / 4;
    if (approxFileBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Ukuran foto kegedean. Coba foto ulang atau kompres dulu (maks ~8MB)." },
        { status: 413 }
      );
    }

    if (!apiKey) {
      console.error("GEMINI_API_KEY belum dikonfigurasi di .env.local");
      return NextResponse.json({ error: "Konfigurasi server AI belum selesai." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // System Prompt yang ketat (Zero-shot) untuk hasil deterministik
    const prompt = `
      Anda adalah API ekstraksi data struk kasir untuk aplikasi patungan (split bill).
      Tugas: Ekstrak HANYA nama pesanan (makanan/minuman/barang) dan harga total dari masing-masing pesanan tersebut dari gambar struk ini.
      Abaikan pajak, service charge, diskon, subtotal, grand total, nomor meja, metode pembayaran, atau alamat toko.
      
      Aturan WAJIB:
      1. Kembalikan HANYA array JSON valid. Jangan ada teks markdown, jangan ada penjelasan, jangan ada kalimat pembuka/penutup.
      2. Skema JSON harus persis seperti ini: [{"name": "Nama Item", "price": 15000}]
      3. Harga (price) harus berupa angka murni (integer) tanpa tulisan Rp, tanpa titik/koma ribuan, dan tanpa desimal.
      4. Jika sebuah pesanan memiliki kuantitas lebih dari satu (misal: 2x Nasi Goreng @15000), kalikan harganya dan gabungkan menjadi satu pesanan dengan total harga (misal: {"name": "2 Nasi Goreng", "price": 30000}).
    `;

    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      });
    } catch (aiError) {
      console.error("[scan] Gemini request failed:", aiError);
      return NextResponse.json(
        { error: "Gagal menghubungi AI. Coba lagi sebentar lagi." },
        { status: 502 }
      );
    }

    // Catatan migrasi: di SDK lama (@google/generative-ai) ini adalah
    // result.response.text() — sebuah method. Di @google/genai, response.text
    // adalah property biasa, bukan fungsi. Salah satu penyebab error samar
    // kalau nge-copy contoh kode dari SDK yang beda tanpa disadari.
    const text = response.text ?? "";

    // Membersihkan markdown ```json jika model AI tidak mematuhinya secara ketat
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[scan] AI returned non-JSON output:", text);
      return NextResponse.json(
        { error: "AI gagal membaca struk ini dengan format yang benar. Coba foto yang lebih jelas." },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed)) {
      console.error("[scan] AI output wasn't an array:", parsed);
      return NextResponse.json({ error: "Format hasil AI tidak sesuai." }, { status: 502 });
    }

    // Saring entri yang bentuknya gak masuk akal (nama kosong, harga <= 0,
    // dsb) daripada meloloskannya ke state aplikasi dan bikin error di
    // layar berikutnya.
    const items = parsed
      .filter(
        (item) =>
          item &&
          typeof item.name === "string" &&
          item.name.trim() &&
          Number.isFinite(Number(item.price)) &&
          Number(item.price) > 0
      )
      .map((item) => ({ name: item.name.trim(), price: Number(item.price) }));

    if (items.length === 0) {
      return NextResponse.json(
        { error: "AI tidak menemukan item pesanan yang valid di struk ini." },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[scan] Unexpected error:", error);
    return NextResponse.json({ error: "Gagal memproses struk." }, { status: 500 });
  }
}