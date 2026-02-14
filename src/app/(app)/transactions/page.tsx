"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, X, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ComboBox from "@/components/ComboBox";
import { useHouseholdOptions, useEventOptions, useDeceasedOptions } from "@/lib/use-options";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  transactionDate: string;
  description: string | null;
  household: { id: string; name: string } | null;
  event: { id: string; title: string } | null;
  deceased: { id: string; lastName: string; firstName: string } | null;
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const householdOptions = useHouseholdOptions();
  const eventOptions = useEventOptions();
  const deceasedOptions = useDeceasedOptions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [householdFilter, setHouseholdFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [deceasedFilter, setDeceasedFilter] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canEdit = user && ["Admin", "OfficeManager"].includes(user.roleName);

  const load = (
    filterType = typeFilter,
    from = fromFilter,
    to = toFilter,
    householdId = householdFilter,
    eventId = eventFilter,
    deceasedId = deceasedFilter,
    onlyUnlinked = unlinkedOnly
  ) => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (householdId) params.set("household_id", householdId);
    if (eventId) params.set("event_id", eventId);
    if (deceasedId) params.set("deceased_id", deceasedId);
    if (onlyUnlinked) params.set("unlinked", "true");
    api.get<Transaction[]>(`/api/transactions?${params}`).then(setTransactions).catch(console.error);
  };

  useEffect(() => {
    load(typeFilter, fromFilter, toFilter, householdFilter, eventFilter, deceasedFilter, unlinkedOnly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, fromFilter, toFilter, householdFilter, eventFilter, deceasedFilter, unlinkedOnly]);

  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 取引一覧</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl text-base font-medium hover:bg-green-700 transition"
          >
            <Plus size={18} /> 入金を記録
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
        >
          <option value="">全種別</option>
          <option value="ofuse">お布施</option>
          <option value="toba">塔婆料</option>
          <option value="other">その他</option>
        </select>

        <input
          type="date"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
          title="開始日"
        />

        <input
          type="date"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
          title="終了日"
        />

        <ComboBox
          options={householdOptions}
          value={householdFilter}
          onChange={setHouseholdFilter}
          placeholder="世帯で絞り込み..."
          className="min-w-[220px]"
        />

        <ComboBox
          options={eventOptions}
          value={eventFilter}
          onChange={setEventFilter}
          placeholder="イベントで絞り込み..."
          className="min-w-[220px]"
        />

        <ComboBox
          options={deceasedOptions}
          value={deceasedFilter}
          onChange={setDeceasedFilter}
          placeholder="故人で絞り込み..."
          className="min-w-[220px]"
        />

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-3 py-2 border border-gray-300 rounded-xl bg-white">
          <input
            type="checkbox"
            checked={unlinkedOnly}
            onChange={(e) => setUnlinkedOnly(e.target.checked)}
          />
          未紐付けのみ
        </label>

        <button onClick={() => load(typeFilter, fromFilter, toFilter, householdFilter, eventFilter, deceasedFilter, unlinkedOnly)} className="bg-gray-100 px-5 py-2.5 rounded-xl text-base hover:bg-gray-200 transition font-medium">
          再読込
        </button>

        <button
          onClick={() => {
            setTypeFilter("");
            setFromFilter("");
            setToFilter("");
            setHouseholdFilter("");
            setEventFilter("");
            setDeceasedFilter("");
            setUnlinkedOnly(false);
          }}
          className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition font-medium"
        >
          クリア
        </button>

        {transactions.length > 0 && (
          <div className="ml-auto text-lg font-bold text-gray-700">
            合計: <span className="text-green-700">¥{total.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* New form */}
      {showForm && canEdit && (
        <NewTransactionForm
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm text-gray-600">日付</th>
              <th className="text-left px-4 py-3 font-medium text-sm text-gray-600">種別</th>
              <th className="text-left px-4 py-3 font-medium text-sm text-gray-600">世帯</th>
              <th className="text-left px-4 py-3 font-medium text-sm text-gray-600">イベント</th>
              <th className="text-left px-4 py-3 font-medium text-sm text-gray-600">説明</th>
              <th className="text-right px-4 py-3 font-medium text-sm text-gray-600">金額</th>
              {canEdit && <th className="w-10 px-2 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t) => (
              editingId === t.id ? (
                <tr key={t.id}>
                  <td colSpan={canEdit ? 7 : 6} className="p-0">
                    <EditTransactionForm
                      tx={t}
                      onSaved={() => { setEditingId(null); load(); }}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
              <tr key={t.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-gray-600">{format(new Date(t.transactionDate), "yyyy/M/d")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      t.type === "ofuse"
                        ? "bg-green-100 text-green-700"
                        : t.type === "toba"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {t.type === "ofuse" ? "お布施" : t.type === "toba" ? "塔婆料" : "その他"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {t.household ? (
                    <Link href={`/households/${t.household.id}`} className="text-indigo-600 hover:underline font-medium">
                      {t.household.name}
                    </Link>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.event ? (
                    <Link href={`/events/${t.event.id}`} className="text-indigo-600 hover:underline">
                      {t.event.title}
                    </Link>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{t.description || "—"}</td>
                <td className="px-4 py-3 text-right font-bold text-lg">¥{t.amount.toLocaleString()}</td>
                {canEdit && (
                  <td className="px-2 py-3">
                    <button
                      onClick={() => setEditingId(t.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                      title="編集"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                )}
              </tr>
              )
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-gray-400 text-base">
                  取引がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {transactions.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 font-bold text-right text-lg">
            合計: ¥{total.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

function NewTransactionForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const householdOptions = useHouseholdOptions();
  const eventOptions = useEventOptions();
  const deceasedOptions = useDeceasedOptions();
  const [form, setForm] = useState({
    type: "ofuse",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
    householdId: "",
    eventId: "",
    deceasedId: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const presets = [
    { label: "お布施 ¥10,000", type: "ofuse", amount: "10000", desc: "お布施" },
    { label: "お布施 ¥30,000", type: "ofuse", amount: "30000", desc: "お布施" },
    { label: "お布施 ¥50,000", type: "ofuse", amount: "50000", desc: "お布施" },
    { label: "塔婆 1本 ¥3,000", type: "toba", amount: "3000", desc: "塔婆1本" },
    { label: "塔婆 3本 ¥9,000", type: "toba", amount: "9000", desc: "塔婆3本" },
    { label: "塔婆 5本 ¥15,000", type: "toba", amount: "15000", desc: "塔婆5本" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/transactions", {
        type: form.type,
        amount: parseInt(form.amount),
        transactionDate: form.transactionDate,
        description: form.description || undefined,
        householdId: form.householdId || undefined,
        eventId: form.eventId || undefined,
        deceasedId: form.deceasedId || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">💰 新規入金を記録</h2>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Quick presets */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">よく使う金額（タップで入力）</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setForm({ ...form, type: p.type, amount: p.amount, description: p.desc })}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                form.amount === p.amount && form.type === p.type
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">種別</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="ofuse">お布施</option>
            <option value="toba">塔婆料</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">金額（円）</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="例: 30000"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日付</label>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <ComboBox
          label="世帯"
          options={householdOptions}
          value={form.householdId}
          onChange={(v) => setForm({ ...form, householdId: v })}
          placeholder="世帯を選択..."
        />
        <ComboBox
          label="イベント（任意）"
          options={eventOptions}
          value={form.eventId}
          onChange={(v) => setForm({ ...form, eventId: v })}
          placeholder="イベントを選択..."
        />
        <ComboBox
          label="故人（任意）"
          options={deceasedOptions}
          value={form.deceasedId}
          onChange={(v) => setForm({ ...form, deceasedId: v })}
          placeholder="故人を選択..."
        />
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-600 mb-1">説明メモ</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="例: 春彼岸お布施"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
      </div>

      <p className="text-sm text-gray-400">※ 世帯・イベント・故人のいずれかは必須です</p>
      {error && <p className="text-red-600 font-medium">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 text-white px-6 py-3 rounded-xl text-base font-bold hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "登録中..." : "💰 入金を登録"}
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

/* ─── Edit Transaction Form ──────────────────────────── */

function EditTransactionForm({
  tx,
  onSaved,
  onCancel,
}: {
  tx: Transaction;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    type: tx.type,
    amount: tx.amount,
    transactionDate: tx.transactionDate.slice(0, 10),
    description: tx.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/transactions/${tx.id}`, {
        type: form.type,
        amount: form.amount,
        transactionDate: form.transactionDate,
        description: form.description || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 border-b border-yellow-300 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">✏️ 取引を編集</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">種別</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="ofuse">お布施</option>
            <option value="toba">塔婆料</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">金額 *</label>
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日付 *</label>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">説明</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
      </div>
      {error && <p className="text-red-600 font-medium text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition">
          キャンセル
        </button>
      </div>
    </form>
  );
}
