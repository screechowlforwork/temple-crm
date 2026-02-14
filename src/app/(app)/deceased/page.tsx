"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Search } from "lucide-react";

type DeceasedItem = {
  id: string;
  lastName: string;
  firstName: string;
  posthumousName: string | null;
  deathDate: string;
  household: { id: string; name: string } | null;
  memorialInstances: { id: string; year: number; dueDate: string; completedAt: string | null }[];
};

export default function DeceasedListPage() {
  const [list, setList] = useState<DeceasedItem[]>([]);
  const [q, setQ] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    api.get<DeceasedItem[]>(`/api/deceased?${params}`).then(setList).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const today = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">🙏 故人一覧</h1>
        <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1 rounded-full">
          {list.length}名
        </span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・戒名で検索..."
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-base focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        <button type="submit" className="bg-gray-100 px-5 py-2.5 rounded-xl text-base hover:bg-gray-200 transition font-medium">
          検索
        </button>
      </form>

      {/* Cards */}
      <div className="space-y-2">
        {list.length === 0 && (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-base">
            故人がいません
          </div>
        )}
        {list.map((d) => {
          const nextMemorial = d.memorialInstances.find((m) => !m.completedAt);
          const daysLeft = nextMemorial ? differenceInDays(new Date(nextMemorial.dueDate), today) : null;
          return (
            <Link
              key={d.id}
              href={`/deceased/${d.id}`}
              className="block bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">
                    {d.lastName} {d.firstName}
                  </span>
                  {d.posthumousName && (
                    <span className="text-sm text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                      {d.posthumousName}
                    </span>
                  )}
                </div>
                {nextMemorial && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
                      {nextMemorial.year}回忌
                    </span>
                    <span className={`text-sm font-medium ${
                      daysLeft !== null && daysLeft < 0
                        ? "text-red-600"
                        : daysLeft !== null && daysLeft <= 30
                        ? "text-orange-600"
                        : "text-gray-400"
                    }`}>
                      {format(new Date(nextMemorial.dueDate), "yyyy/M/d")}
                      {daysLeft !== null && (
                        <span className="ml-1">
                          ({daysLeft < 0 ? `${Math.abs(daysLeft)}日超過` : daysLeft === 0 ? "本日" : `あと${daysLeft}日`})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                <span>没 {format(new Date(d.deathDate), "yyyy年M月d日", { locale: ja })}</span>
                {d.household && (
                  <span className="text-indigo-500">{d.household.name}</span>
                )}
                {d.memorialInstances.length > 0 && (
                  <span className="text-gray-400">
                    年忌 {d.memorialInstances.filter((m) => m.completedAt).length}/{d.memorialInstances.length} 完了
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
