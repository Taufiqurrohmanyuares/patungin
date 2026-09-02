import { notFound } from "next/navigation";
import { getReceiptState } from "../../lib/receiptRepository";
import PatunginApp from "../../components/PatunginApp";

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
