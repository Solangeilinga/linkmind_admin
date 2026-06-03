"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api }   from "@/lib/api";

interface User         { name?: string; email: string; }
interface Professional {
  firstName: string; lastName: string; type: string;
  city?: string; sessionPrice?: number; currency?: string; photo?: string;
}
interface Booking {
  _id: string;
  user: User;
  professional: Professional;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  consultationType: "in_person" | "online";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  sessionPrice?: number;
  commissionRate: number;
  commissionAmount?: number;
  adminNote?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}
interface Stats {
  pending: number; confirmed: number; cancelled: number;
  completed: number; total: number; totalCommission: number;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed";
type ModalType = "confirm" | "cancel" | null;

export default function BookingsPage() {
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [status, setStatus]       = useState<StatusFilter>("pending");
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal]         = useState<{ type: ModalType; booking: Booking | null }>({ type: null, booking: null });
  const [note, setNote]           = useState("");
  const [price, setPrice]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get<{ data: Booking[]; pagination: any }>(`/api/bookings?status=${status}&page=${p}&limit=15`),
        api.get<Stats>("/api/bookings/stats"),
      ]);
      setBookings(bRes.data);
      setTotalPages(bRes.pagination.pages || 1);
      setStats(sRes);
    } catch (e: any) {
      showToast("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const openModal = (type: ModalType, booking: Booking) => {
    setModal({ type, booking });
    setNote("");
    setPrice(booking.sessionPrice ? String(booking.sessionPrice) : "");
  };

  const confirmBooking = async () => {
    if (!modal.booking) return;
    setSaving(true);
    try {
      const body: any = { adminNote: note };
      if (price) body.sessionPrice = parseFloat(price);
      const res = await api.post<any>(`/api/bookings/${modal.booking._id}/confirm`, body);
      showToast(`✅ Réservation confirmée${res.commissionAmount ? ` — Commission : ${res.commissionAmount} FCFA` : ""}`);
      setModal({ type: null, booking: null });
      fetchData(page);
    } catch (e: any) {
      showToast("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async () => {
    if (!modal.booking || !note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/bookings/${modal.booking._id}/cancel`, { reason: note });
      showToast("✅ Réservation annulée");
      setModal({ type: null, booking: null });
      fetchData(page);
    } catch (e: any) {
      showToast("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const completeBooking = async (id: string) => {
    if (!confirm("Marquer cette réservation comme terminée ?")) return;
    try {
      await api.delete(`/api/bookings/${id}/complete`);
      showToast("✅ Réservation marquée comme terminée");
      fetchData(page);
    } catch (e: any) {
      showToast("❌ " + e.message);
    }
  };

  const statusColors: Record<string, string> = {
    pending:   "text-amber-700  bg-amber-50  border-amber-200",
    confirmed: "text-green-700  bg-green-50  border-green-200",
    cancelled: "text-red-600    bg-red-50    border-red-200",
    completed: "text-gray-600   bg-gray-50   border-gray-200",
  };
  const statusLabels: Record<string, string> = {
    pending: "⏳ En attente", confirmed: "✅ Confirmée",
    cancelled: "❌ Annulée",  completed: "✔ Terminée",
  };
  const typeLabels: Record<string, string> = {
    in_person: "🏢 Présentiel", online: "💻 En ligne",
  };
  const proTypes: Record<string, string> = {
    psychologist: "Psychologue", coach: "Coach", doctor: "Médecin",
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "pending",   label: "En attente" },
    { key: "confirmed", label: "Confirmées" },
    { key: "completed", label: "Terminées" },
    { key: "cancelled", label: "Annulées" },
    { key: "all",       label: "Toutes" },
  ];

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestion des demandes de consultation chez les professionnels
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
              {[
                { label: "En attente",  value: stats.pending,   icon: "⏳", color: "text-amber-600 bg-amber-50" },
                { label: "Confirmées",  value: stats.confirmed, icon: "✅", color: "text-green-600 bg-green-50" },
                { label: "Terminées",   value: stats.completed, icon: "✔",  color: "text-blue-600  bg-blue-50"  },
                { label: "Annulées",    value: stats.cancelled, icon: "❌", color: "text-red-600   bg-red-50"   },
                {
                  label: "Commission totale",
                  value: `${stats.totalCommission.toLocaleString()} FCFA`,
                  icon: "💰", color: "text-purple-600 bg-purple-50"
                },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${s.color}`}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg leading-none">{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filtres */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  status === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
                {f.key === "pending" && stats?.pending ? (
                  <span className="ml-1.5 text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                    {stats.pending}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Liste */}
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-semibold text-gray-900">Aucune réservation</div>
              <div className="text-sm text-gray-400 mt-1">
                {status === "pending" ? "Aucune demande en attente ✅" : "Aucun résultat pour ce filtre"}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <div key={b._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition">
                  <div className="flex items-start gap-5">
                    {/* Avatar pro */}
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {b.professional.photo ? (
                        <img src={b.professional.photo} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        b.professional.firstName[0]
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header ligne */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {b.professional.firstName} {b.professional.lastName}
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              {proTypes[b.professional.type] || b.professional.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Demandé par <strong>{b.user.name || b.user.email}</strong>
                            {b.professional.city && ` · 📍 ${b.professional.city}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${statusColors[b.status]}`}>
                            {statusLabels[b.status]}
                          </span>
                        </div>
                      </div>

                      {/* Détails */}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                        <span>{typeLabels[b.consultationType]}</span>
                        {b.preferredDate && <span>📅 {b.preferredDate}</span>}
                        {b.preferredTime && <span>🕐 {b.preferredTime}</span>}
                        {b.professional.sessionPrice && (
                          <span>💰 {b.professional.sessionPrice.toLocaleString()} {b.professional.currency || "FCFA"}</span>
                        )}
                        {b.commissionAmount && (
                          <span className="text-purple-600 font-medium">
                            Commission : {b.commissionAmount.toLocaleString()} FCFA
                          </span>
                        )}
                        <span className="text-gray-300">·</span>
                        <span>Reçue le {new Date(b.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>

                      {/* Message utilisateur */}
                      {b.message && (
                        <div className="mt-3 text-sm text-gray-600 italic bg-gray-50 rounded-xl px-4 py-2.5">
                          &ldquo;{b.message}&rdquo;
                        </div>
                      )}

                      {/* Note admin */}
                      {b.adminNote && (
                        <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5">
                          📋 Note admin : {b.adminNote}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {b.status === "pending" && (
                          <>
                            <button
                              onClick={() => openModal("confirm", b)}
                              className="px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition"
                            >
                              ✅ Confirmer
                            </button>
                            <button
                              onClick={() => openModal("cancel", b)}
                              className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                            >
                              ❌ Refuser
                            </button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => completeBooking(b._id)}
                            className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                          >
                            ✔ Marquer terminée
                          </button>
                        )}
                        {(b.status === "confirmed" || b.status === "pending") && (
                          <button
                            onClick={() => openModal("cancel", b)}
                            className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 pt-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-500">Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal Confirmer */}
      {modal.type === "confirm" && modal.booking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">Confirmer la réservation</h2>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{modal.booking.professional.firstName} {modal.booking.professional.lastName}</strong> pour{" "}
              <strong>{modal.booking.user.name || modal.booking.user.email}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prix de la séance (FCFA)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder={modal.booking.professional.sessionPrice
                    ? String(modal.booking.professional.sessionPrice)
                    : "Ex: 25000"}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {price && (
                  <p className="text-xs text-purple-600 mt-1">
                    Commission LinkMind (10%) : {Math.round(parseFloat(price) * 0.10).toLocaleString()} FCFA
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Note admin (optionnelle)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Instructions particulières, horaires confirmés..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal({ type: null, booking: null })}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={confirmBooking} disabled={saving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {saving ? "En cours..." : "✅ Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Annuler / Refuser */}
      {modal.type === "cancel" && modal.booking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">
              {modal.booking.status === "pending" ? "Refuser la demande" : "Annuler la réservation"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              La raison sera conservée dans l&apos;historique admin.
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Raison du refus / annulation (obligatoire)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setModal({ type: null, booking: null })}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Retour
              </button>
              <button onClick={cancelBooking} disabled={!note.trim() || saving}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {saving ? "En cours..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50">
          {toast}
        </div>
      )}
    </AuthGuard>
  );
}
