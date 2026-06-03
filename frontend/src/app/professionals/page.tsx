"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api, getAdmin } from "@/lib/api";

interface Pro {
  _id: string; firstName: string; lastName: string;
  photo?: string; type: string; specialties?: string[];
  city?: string; phone?: string; email?: string;
  sessionPrice?: number; currency?: string;
  isActive: boolean; isVerified: boolean;
  totalBookings?: number; rating?: number;
}

const TYPES = ["psychologist","coach","doctor"];
const TYPE_LABELS: Record<string,string> = { psychologist:"Psychologue", coach:"Coach de vie", doctor:"Médecin" };
const EMPTY = { firstName:"", lastName:"", type:"psychologist", city:"", phone:"", email:"", sessionPrice:"", currency:"FCFA", specialties:"", isActive:true, isVerified:false };

export default function ProfessionalsPage() {
  const admin        = getAdmin();
  const isSuperAdmin = admin?.role === "super_admin";

  const [items,   setItems]   = useState<Pro[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<""|"verified"|"unverified"|"inactive">("");
  const [toast,   setToast]   = useState("");
  const [modal,   setModal]   = useState<"create"|"edit"|null>(null);
  const [editing, setEditing] = useState<any>({...EMPTY});
  const [saving,  setSaving]  = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };

  const fetchData = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:String(p), limit:"20" });
      if (search) params.set("search", search);
      if (filter==="verified")   params.set("verified","true");
      if (filter==="unverified") params.set("verified","false");
      if (filter==="inactive")   params.set("active","false");
      const res = await api.get<any>(`/api/professionals?${params}`);
      setItems(res.data); setTotal(res.pagination.total);
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setLoading(false); }
  },[search, filter]);

  useEffect(()=>{ setPage(1); },[search, filter]);
  useEffect(()=>{ fetchData(page); },[fetchData, page]);

  const openCreate = () => { setEditing({...EMPTY}); setModal("create"); };
  const openEdit   = (p: Pro) => { setEditing({...p, specialties: p.specialties?.join(", ")||"", sessionPrice: String(p.sessionPrice||"")}); setModal("edit"); };

  const save = async () => {
    if (!editing.firstName || !editing.lastName) return showToast("⚠️ Prénom et nom requis");
    setSaving(true);
    const payload = {
      ...editing,
      specialties:  editing.specialties ? editing.specialties.split(",").map((s:string)=>s.trim()).filter(Boolean) : [],
      sessionPrice: editing.sessionPrice ? Number(editing.sessionPrice) : undefined,
    };
    try {
      if (modal==="create") {
        await api.post("/api/professionals", payload);
        showToast("✅ Professionnel ajouté");
      } else {
        await api.patch(`/api/professionals/${editing._id}`, payload);
        showToast("✅ Professionnel modifié");
      }
      setModal(null); fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setSaving(false); }
  };

  const verify = async (p: Pro) => {
    try {
      await api.patch(`/api/professionals/${p._id}/verify`, {});
      showToast("✅ Professionnel vérifié"); fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
  };

  const toggle = async (p: Pro) => {
    try {
      await api.patch(`/api/professionals/${p._id}/toggle`, {});
      showToast(`✅ ${p.isActive?"Désactivé":"Activé"}`); fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce professionnel ?")) return;
    try { await api.delete(`/api/professionals/${id}`); showToast("✅ Supprimé"); fetchData(page); }
    catch(e:any) { showToast("❌ "+e.message); }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professionnels</h1>
              <p className="text-sm text-gray-500 mt-0.5">{total} professionnels au total</p>
            </div>
            {isSuperAdmin && (
              <button onClick={openCreate} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
                + Ajouter
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
              {([["","Tous"],["verified","Vérifiés"],["unverified","Non vérifiés"],["inactive","Inactifs"]] as [string,string][]).map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter===v?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-20"/>
            ))}</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">👨‍⚕️</div>
              <div className="font-semibold text-gray-900">Aucun professionnel</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500">Professionnel</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500">Type</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500">Ville</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500">Tarif</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-500">Statut</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(pro=>(
                    <tr key={pro._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {pro.firstName[0]}{pro.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{pro.firstName} {pro.lastName}</div>
                            <div className="text-xs text-gray-400">{pro.email||"—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{TYPE_LABELS[pro.type]||pro.type}</td>
                      <td className="px-5 py-3.5 text-gray-500">{pro.city||"—"}</td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium">
                        {pro.sessionPrice ? `${pro.sessionPrice.toLocaleString()} ${pro.currency||"FCFA"}` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${pro.isActive?"bg-green-50 text-green-600":"bg-gray-50 text-gray-400"}`}>
                            {pro.isActive?"Actif":"Inactif"}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${pro.isVerified?"bg-blue-50 text-blue-600":"bg-amber-50 text-amber-600"}`}>
                            {pro.isVerified?"✓ Vérifié":"En attente"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex gap-2 justify-end">
                          {!pro.isVerified && (
                            <button onClick={()=>verify(pro)} className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                              Vérifier
                            </button>
                          )}
                          <button onClick={()=>toggle(pro)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${pro.isActive?"bg-gray-50 text-gray-600 hover:bg-gray-100":"bg-green-50 text-green-600 hover:bg-green-100"}`}>
                            {pro.isActive?"Désactiver":"Activer"}
                          </button>
                          {isSuperAdmin && (
                            <>
                              <button onClick={()=>openEdit(pro)} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                                Modifier
                              </button>
                              <button onClick={()=>remove(pro._id)} className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition">
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-5">{modal==="create"?"Ajouter un professionnel":"Modifier"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[["firstName","Prénom *"],["lastName","Nom *"]].map(([k,l])=>(
                  <div key={k}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{l}</label>
                    <input value={editing[k]||""} onChange={e=>setEditing((p:any)=>({...p,[k]:e.target.value}))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
                  <select value={editing.type||"psychologist"} onChange={e=>setEditing((p:any)=>({...p,type:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ville</label>
                  <input value={editing.city||""} onChange={e=>setEditing((p:any)=>({...p,city:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input type="email" value={editing.email||""} onChange={e=>setEditing((p:any)=>({...p,email:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                  <input value={editing.phone||""} onChange={e=>setEditing((p:any)=>({...p,phone:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tarif séance</label>
                  <input type="number" value={editing.sessionPrice||""} onChange={e=>setEditing((p:any)=>({...p,sessionPrice:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Devise</label>
                  <input value={editing.currency||"FCFA"} onChange={e=>setEditing((p:any)=>({...p,currency:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Spécialités (séparées par virgule)</label>
                <input value={editing.specialties||""} onChange={e=>setEditing((p:any)=>({...p,specialties:e.target.value}))}
                  placeholder="Anxiété, Dépression, Stress..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!editing.isActive} onChange={e=>setEditing((p:any)=>({...p,isActive:e.target.checked}))} className="rounded"/>
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {saving?"Enregistrement...":modal==="create"?"Ajouter":"Modifier"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50">{toast}</div>}
    </AuthGuard>
  );
}
