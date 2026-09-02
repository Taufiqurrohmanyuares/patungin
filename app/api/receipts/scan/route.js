import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Pastikan Anda sudah menambahkan GEMINI_API_KEY di file .env.local
const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Tidak ada gambar" }, { status: 400 });

    if (!apiKey) {
        console.error("GEMINI_API_KEY belum dikonfigurasi di .env.local");
        return NextResponse.json({ error: "Konfigurasi server AI belum selesai" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Hapus prefix 'data:image/jpeg;base64,' jika ada
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    
    // Membersihkan markdown ```json jika model AI tidak mematuhinya secara ketat
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return NextResponse.json({ data: JSON.parse(cleanJson) });
  } catch (error) {
    console.error("AI Scan Error:", error);
    return NextResponse.json({ error: "Gagal memproses struk" }, { status: 500 });
  }
}