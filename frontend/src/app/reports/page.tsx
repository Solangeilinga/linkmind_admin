"use client";
import { useEffect, useState } from "react";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import StatCard  from "@/components/ui/StatCard";
import { api }   from "@/lib/api";

interface DashboardData {
  users: { total: number; active: number; banned: number; newToday: number; newWeek: number };
}
interface GrowthEntry { _id: string; count: number }

export default function ReportsPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [growth, setGrowth]   = useState<GrowthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>("/api/reports/dashboard"),
      api.get<{ data: GrowthEntry[] }>("/api/reports/users/growth"),
    ]).then(([d, g]) => {
      setData(d);
      setGrowth(g.data);
    }).finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(...growth.map(g => g.count), 1);

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Statistiques et croissance de la plateforme</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400">Chargement des données...</div>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                <StatCard label="Total utilisateurs"    value={data.users.total}    icon="👥" color="indigo" />
                <StatCard label="Actifs"                value={data.users.active}   icon="✅" color="green"  />
                <StatCard label="Bannis"                value={data.users.banned}   icon="🚫" color="red"    />
                <StatCard label="Nouveaux cette semaine" value={data.users.newWeek} icon="📈" color="blue"   />
              </div>

              {/* Growth chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Inscriptions — 30 derniers jours</h2>
                <p className="text-xs text-gray-400 mb-6">Nombre de nouveaux comptes par jour</p>

                {growth.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Aucune donnée disponible pour cette période
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5 h-40">
                    {growth.map(g => (
                      <div key={g._id} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full bg-indigo-100 hover:bg-indigo-400 rounded-t-md transition-colors relative"
                          style={{ height: `${(g.count / maxCount) * 100}%`, minHeight: "4px" }}
                          title={`${g._id}: ${g.count} inscription(s)`}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition">
                            {g.count}
                          </div>
                        </div>
                        <div className="text-[8px] text-gray-400 hidden md:block">
                          {g._id.slice(5)} {/* MM-DD */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </AuthGuard>
  );
}
