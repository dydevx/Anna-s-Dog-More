const labels: Record<string, string> = {
  pending_payment: "Zahlung offen",
  unpaid: "Unbezahlt",
  paid: "Bezahlt",
  failed: "Fehlgeschlagen",
  processing: "In Bearbeitung",
  shipped: "Versendet",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
  unfulfilled: "Offen",
  fulfilled: "Erfüllt",
  active: "Aktiv",
  archived: "Archiviert",
};

function getTone(status: string) {
  if (["paid", "completed", "fulfilled", "shipped", "active"].includes(status)) return "success";
  if (["cancelled", "refunded", "failed", "archived"].includes(status)) return "danger";
  if (["pending_payment", "unpaid", "processing", "unfulfilled"].includes(status)) return "warning";
  return "neutral";
}

export function AdminStatus({ status, label }: { status: string; label?: string }) {
  const tone = getTone(status);

  return (
    <span className="status-chip" data-tone={tone}>
      {label ?? labels[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}
