import { NextResponse } from "next/server";
import { createReceipt } from "../../lib/receiptRepository";

export async function POST() {
  try {
    const id = await createReceipt();
    return NextResponse.json({ id });
  } catch (error) {
    console.error("[POST /api/receipts]", error);
    return NextResponse.json(
      { error: "Gagal membuat sesi baru. Cek konfigurasi Supabase kamu." },
      { status: 500 }
    );
  }
}
