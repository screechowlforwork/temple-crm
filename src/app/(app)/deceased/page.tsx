"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Search, X } from "lucide-react";
import ComboBox from "@/components/ComboBox";
import { useHouseholdOptions } from "@/lib/use-options";

type MemorialSummary = {
  id: string;
  year: number;
  dueDate: string;
  completedAt: string | null;
};

type DeceasedLiteItem = {
  id: string;
  lastName: string;
  firstName: string;
  posthumousName: string | null;
  deathDate: string;
  household: { id: string; name: string } | null;
};

type DeceasedSummaryItem = {
  id: string;
  nextMemorial: MemorialSummary | null;
  totalCount: number;
  completedCount: number;
};

type DeceasedListItem = DeceasedLiteItem & {
  nextMemorial: MemorialSummary | null;
  totalCount: number;
  completedCount: number;
};

export default function DeceasedListPage() {
  const [list, setList] = useState<DeceasedListItem[]>([]);
  const [q, setQ] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(async (query: string) => {
    requestSeq.current += 1;
    const reqId = requestSeq.current;

    const params = new URLSearchParams();
    params.set("lite", "1");
    if (query) params.set("q", query);

    try {
      const liteRows = await api.get<DeceasedLiteItem[]>(`/api/deceased?${params}`);
      if (reqId !== requestSeq.current) return;

      const baseRows: DeceasedListItem[] = liteRows.map((item) => ({
        ...item,
        nextMemorial: null,
        totalCount: 0,
        completedCount: 0,
      }));
      setList(baseRows);

      if (liteRows.length === 0) return;

      const ids = liteRows.map((d) => d.id).join(",");
      const summaryRows = await api.get<DeceasedSummaryItem[]>(
        `/api/deceased?summary=1&ids=${encodeURIComponent(ids)}`
      );
      if (reqId !== requestSeq.current) return;

      const summaryMap = new Map(summaryRows.map((item) => [item.id, item]));
      setList((prev) =>
        prev.map((item) => {
          const summary = summaryMap.get(item.id);
          if (!summary) return item;
          return {
            ...item,
            nextMemorial: summary.nextMemorial,
            totalCount: summary.totalCount,
            completedCount: summary.completedCount,
          };
        })
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load("");
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(q);
  };

  const today = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">🙏 故人一覧</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">{list.length}名</span>
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showCreateForm ? <X size={16} /> : <Plus size={16} />}
          {showCreateForm ? "閉じる" : "故人を追加"}
        </button>
      </div>

      {showCreateForm && (
        <DeceasedCreateForm
          onCreated={() => {
            setShowCreateForm(false);
            load(q);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・戒名で検索..."
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-base outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button type="submit" className="rounded-xl bg-gray-100 px-5 py-2.5 text-base font-medium transition hover:bg-gray-200">
          検索
        </button>
      </form>

      <div className="space-y-2">
        {list.length === 0 && <div className="rounded-xl border bg-white p-10 text-center text-base text-gray-400">故人がいません</div>}
        {list.map((d) => {
          const nextMemorial = d.nextMemorial;
          const daysLeft = nextMemorial ? differenceInDays(new Date(nextMemorial.dueDate), today) : null;

          return (
            <Link key={d.id} href={`/deceased/${d.id}`} className="block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">
                    {d.lastName} {d.firstName}
                  </span>
                  {d.posthumousName && <span className="rounded bg-gray-50 px-2 py-0.5 text-sm text-gray-500">{d.posthumousName}</span>}
                </div>
                {nextMemorial && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">{nextMemorial.year}回忌</span>
                    <span
                      className={`text-sm font-medium ${
                        daysLeft !== null && daysLeft < 0
                          ? "text-red-600"
                          : daysLeft !== null && daysLeft <= 30
                            ? "text-orange-600"
                            : "text-gray-400"
                      }`}
                    >
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

              <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-500">
                <span>没 {format(new Date(d.deathDate), "yyyy年M月d日", { locale: ja })}</span>
                {d.household && <span className="text-indigo-500">{d.household.name}</span>}
                {d.totalCount > 0 && (
                  <span className="text-gray-400">
                    年忌 {d.completedCount}/{d.totalCount} 完了
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

function DeceasedCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const householdOptions = useHouseholdOptions();
  const [form, setForm] = useState({
    householdId: "",
    lastName: "",
    firstName: "",
    posthumousName: "",
    deathDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.householdId) {
      setError("世帯を選択してください");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post("/api/deceased", {
        householdId: form.householdId,
        lastName: form.lastName,
        firstName: form.firstName,
        posthumousName: form.posthumousName || undefined,
        deathDate: form.deathDate,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "故人の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-indigo-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-indigo-900">故人を新規登録</h2>
        <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-500 hover:bg-white">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ComboBox
          label="世帯 *"
          options={householdOptions}
          value={form.householdId}
          onChange={(v) => setForm((prev) => ({ ...prev, householdId: v }))}
          placeholder="世帯を選択..."
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">没年月日 *</label>
          <input
            type="date"
            value={form.deathDate}
            onChange={(e) => setForm((prev) => ({ ...prev, deathDate: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">姓 *</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">名 *</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">戒名</label>
          <input
            value={form.posthumousName}
            onChange={(e) => setForm((prev) => ({ ...prev, posthumousName: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">備考</label>
          <input
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {saving ? "登録中..." : "故人を登録"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-white">
          キャンセル
        </button>
      </div>
    </form>
  );
}
