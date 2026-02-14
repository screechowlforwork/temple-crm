"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Pencil, X } from "lucide-react";

type DeceasedDetail = {
  id: string;
  lastName: string;
  firstName: string;
  posthumousName: string | null;
  deathDate: string;
  notes: string | null;
  household: { id: string; name: string } | null;
  memorialInstances: {
    id: string;
    year: number;
    dueDate: string;
    completedAt: string | null;
    memorialRule: { name: string } | null;
    event: { id: string; title: string } | null;
  }[];
  eventTargets: {
    id: string;
    event: { id: string; title: string; eventDate: string };
  }[];
  transactions: {
    id: string;
    type: string;
    amount: number;
    transactionDate: string;
    description: string | null;
  }[];
};

export default function DeceasedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deceased, setDeceased] = useState<DeceasedDetail | null>(null);
  const [editing, setEditing] = useState(false);

  const load = () => {
    api.get<DeceasedDetail>(`/api/deceased/${id}`).then(setDeceased).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  if (!deceased) return <p className="text-gray-400">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/deceased" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">
          {deceased.lastName} {deceased.firstName}
        </h1>
        <button
          onClick={() => setEditing(!editing)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
          title="編集"
        >
          <Pencil size={16} />
        </button>
      </div>

      {editing ? (
        <DeceasedEditForm
          deceased={deceased}
          onSaved={() => { setEditing(false); load(); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h2 className="font-medium mb-3">基本情報</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">戒名:</span> {deceased.posthumousName || "-"}
          </div>
          <div>
            <span className="text-gray-500">没年月日:</span> {format(new Date(deceased.deathDate), "yyyy年M月d日")}
          </div>
          <div>
            <span className="text-gray-500">世帯:</span>{" "}
            {deceased.household ? (
              <Link href={`/households/${deceased.household.id}`} className="text-indigo-600 hover:underline">
                {deceased.household.name}
              </Link>
            ) : (
              "-"
            )}
          </div>
          {deceased.notes && (
            <div className="col-span-2">
              <span className="text-gray-500">備考:</span> {deceased.notes}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Memorial Timeline */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b font-medium">年忌タイムライン</div>
        <div className="divide-y">
          {deceased.memorialInstances.length === 0 && (
            <p className="p-4 text-sm text-gray-400">年忌予定なし</p>
          )}
          {deceased.memorialInstances.map((m) => (
            <div key={m.id} className="p-3 text-sm flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    m.completedAt ? "bg-green-500" : new Date(m.dueDate) < new Date() ? "bg-red-500" : "bg-orange-400"
                  }`}
                />
                <span className="font-medium">{m.year}回忌</span>
                {m.memorialRule && <span className="text-xs text-gray-400">({m.memorialRule.name})</span>}
                {m.event && (
                  <Link href={`/events/${m.event.id}`} className="text-indigo-600 hover:underline text-xs">
                    {m.event.title}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{format(new Date(m.dueDate), "yyyy/M/d")}</span>
                {m.completedAt ? (
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">済</span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs">未</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Related Events */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-medium">関連イベント</div>
          <div className="divide-y">
            {deceased.eventTargets.length === 0 && <p className="p-4 text-sm text-gray-400">なし</p>}
            {deceased.eventTargets.map((et) => (
              <div key={et.id} className="p-3 text-sm">
                <Link href={`/events/${et.event.id}`} className="text-indigo-600 hover:underline">
                  {et.event.title}
                </Link>
                <span className="ml-2 text-xs text-gray-400">
                  {format(new Date(et.event.eventDate), "yyyy/M/d")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-medium">取引</div>
          <div className="divide-y">
            {deceased.transactions.length === 0 && <p className="p-4 text-sm text-gray-400">なし</p>}
            {deceased.transactions.map((t) => (
              <div key={t.id} className="p-3 text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.type === "ofuse"
                        ? "bg-green-100 text-green-700"
                        : t.type === "toba"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {t.type === "ofuse" ? "お布施" : t.type === "toba" ? "塔婆料" : "その他"}
                  </span>
                  {t.description && <span className="text-gray-500">{t.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">¥{t.amount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">{format(new Date(t.transactionDate), "M/d")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Deceased Edit Form ─────────────────────────────── */

function DeceasedEditForm({
  deceased,
  onSaved,
  onCancel,
}: {
  deceased: DeceasedDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    lastName: deceased.lastName,
    firstName: deceased.firstName,
    posthumousName: deceased.posthumousName || "",
    deathDate: deceased.deathDate.slice(0, 10),
    notes: deceased.notes || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/deceased/${deceased.id}`, {
        lastName: form.lastName,
        firstName: form.firstName,
        posthumousName: form.posthumousName || undefined,
        deathDate: form.deathDate,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">✏️ 故人情報を編集</h2>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">姓 *</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="例: 山田" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">名 *</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="例: 太郎" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">没年月日 *</label>
          <input type="date" value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">戒名</label>
          <input value={form.posthumousName} onChange={(e) => setForm({ ...form, posthumousName: e.target.value })} placeholder="例: 釋浄光居士" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">備考</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="メモ" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
      </div>
      {error && <p className="text-red-600 font-medium">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存する"}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition">
          やめる
        </button>
      </div>
    </form>
  );
}
