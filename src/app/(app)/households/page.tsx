"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { Plus, Search, X, Pencil } from "lucide-react";

type Household = {
  id: string;
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  phoneNumber: string | null;
  email: string | null;
  contactPriority: string;
  status: string;
  _count: { deceased: number; transactions: number; tasks: number };
};

const contactLabel: Record<string, string> = { postal: "📮 郵送", phone: "📞 電話", email: "📧 メール", line: "💬 LINE" };

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    api.get<Household[]>(`/api/households?${params}`).then(setHouseholds).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">🏠 世帯一覧</h1>
          <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1 rounded-full">
            {households.length}件
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={18} /> 新規世帯を登録
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・住所・電話で検索..."
            className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-base focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
        >
          <option value="">全ステータス</option>
          <option value="active">有効</option>
          <option value="inactive">休止</option>
          <option value="withdrawn">離檀</option>
        </select>
        <button type="submit" className="bg-gray-100 px-5 py-2.5 rounded-xl text-base hover:bg-gray-200 transition font-medium">
          検索
        </button>
      </form>

      {/* New Household Form */}
      {showForm && (
        <NewHouseholdForm
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Cards */}
      <div className="space-y-2">
        {households.length === 0 && (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-base">
            世帯がありません
          </div>
        )}
        {households.map((h) => (
          editingId === h.id ? (
            <EditHouseholdForm
              key={h.id}
              household={h}
              onSaved={() => { setEditingId(null); load(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={h.id} className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/households/${h.id}`} className="text-lg font-bold text-gray-800 hover:text-indigo-600 hover:underline">
                    {h.name}
                  </Link>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-medium ${
                      h.status === "active"
                        ? "bg-green-100 text-green-700"
                        : h.status === "inactive"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {h.status === "active" ? "有効" : h.status === "inactive" ? "休止" : "離檀"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {h._count.deceased > 0 && <span>故人 {h._count.deceased}</span>}
                    {h._count.transactions > 0 && <span>取引 {h._count.transactions}</span>}
                    {h._count.tasks > 0 && <span>タスク {h._count.tasks}</span>}
                  </div>
                  <button
                    onClick={() => setEditingId(h.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition"
                    title="世帯を編集"
                  >
                    <Pencil size={14} /> 編集
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                <span>〒{h.postalCode} {h.prefecture}{h.city}{h.addressLine1}</span>
                {h.phoneNumber && <span>📞 {h.phoneNumber}</span>}
                <span>{contactLabel[h.contactPriority] || h.contactPriority}</span>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function EditHouseholdForm({
  household,
  onSaved,
  onCancel,
}: {
  household: Household;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: household.name,
    postalCode: household.postalCode,
    prefecture: household.prefecture,
    city: household.city,
    addressLine1: household.addressLine1,
    phoneNumber: household.phoneNumber || "",
    email: household.email || "",
    contactPriority: household.contactPriority,
    status: household.status,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/households/${household.id}`, {
        ...form,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">✏️ 世帯を編集</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="世帯名" required />
        <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="郵便番号" required />
        <input value={form.prefecture} onChange={(e) => setForm({ ...form, prefecture: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="都道府県" required />
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="市区町村" required />
        <input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className="sm:col-span-2 border border-gray-300 rounded-xl px-3 py-2.5" placeholder="住所" required />
        <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="電話番号" />
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="メール" />
        <select value={form.contactPriority} onChange={(e) => setForm({ ...form, contactPriority: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5">
          <option value="postal">📮 郵送</option>
          <option value="phone">📞 電話</option>
          <option value="email">📧 メール</option>
          <option value="line">💬 LINE</option>
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5">
          <option value="active">有効</option>
          <option value="inactive">休止</option>
          <option value="withdrawn">離檀</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100">
          キャンセル
        </button>
      </div>
    </form>
  );
}

function NewHouseholdForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: "", postalCode: "", prefecture: "", city: "", addressLine1: "",
    addressLine2: "", phoneNumber: "", email: "", lineId: "",
    lineAvailable: false, contactPriority: "postal", notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/households", {
        ...form,
        addressLine2: form.addressLine2 || undefined,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        lineId: form.lineId || undefined,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">🏠 新規世帯を登録</h2>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">世帯名 *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例: 田中家"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">郵便番号 *</label>
          <input
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            placeholder="例: 100-0001"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">都道府県 *</label>
          <input
            value={form.prefecture}
            onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
            placeholder="例: 東京都"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">市区町村 *</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="例: 千代田区"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">住所1 *</label>
          <input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            placeholder="例: 丸の内1-1-1"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">住所2</label>
          <input
            value={form.addressLine2}
            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            placeholder="建物名・部屋番号など"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">電話番号</label>
          <input
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="例: 03-1234-5678"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">メール</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="例: tanaka@example.com"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">連絡優先手段</label>
          <select
            value={form.contactPriority}
            onChange={(e) => setForm({ ...form, contactPriority: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="postal">📮 郵送</option>
            <option value="phone">📞 電話</option>
            <option value="email">📧 メール</option>
            <option value="line">💬 LINE</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-600 mb-1">備考</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="例: 長男が窓口。毎年お盆にお参りに来られる。"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
      </div>

      {error && <p className="text-red-600 font-medium">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saving ? "登録中..." : "🏠 世帯を登録"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
