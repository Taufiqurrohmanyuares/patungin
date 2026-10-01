import { notFound } from "next/navigation";
import { getReceiptState } from "../../lib/receiptRepository";
import PatunginApp from "../../components/PatunginApp";

export const metadata = {
  title: "Tagihan — Porsi",
  description: "Lihat bagian masing-masing dan siapa bayar berapa. Makan bareng, bayar sesuai porsi.",
  openGraph: {
    title: "Tagihan — Porsi",
    description: "Lihat bagian kamu di tagihan ini.",
  },
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ params }) {
  const { id } = await params;

  let initialState;
  try {
    initialState = await getReceiptState(id);
  } catch (error) {
    console.error(`[ReceiptPage ${id}]`, error);
    initialState = null;
  }

  if (!initialState) notFound();

  return <PatunginApp receiptId={id} initialState={initialState} />;
}