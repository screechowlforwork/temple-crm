"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, X, Calendar, Pencil } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  status: string;
  venue: string | null;
  description: string | null;
  _count: { eventTargets: number; eventParticipations: number; transactions: number };
};

const typeConfig: Record<string, { label: string; color: string }> = {
  memorial: { label: "🙏 年忌法要", color: "bg-purple-100 text-purple-700" },
  obon: { label: "🏮 お盆", color: "bg-orange-100 text-orange-700" },
  higan: { label: "🌸 お彼岸", color: "bg-pink-100 text-pink-700" },
  new_year: { label: "🎍 正月", color: "bg-red-100 text-red-700" },
  ceremony: { label: "⛩️ 法事", color: "bg-indigo-100 text-indigo-700" },
  other: { label: "📋 その他", color: "bg-gray-100 text-gray-700" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  scheduled: { label: "予定", color: "bg-blue-100 text-blue-700" },
  completed: { label: "完了", color: "bg-green-100 text-green-700" },
  cancelled: { label: "中止", color: "bg-red-100 text-red-700" },
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("event_type", typeFilter);
    api.get<EventItem[]>(`/api/events?${params}`).then(setEvents).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">📅 イベント一覧</h1>
          <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1 rounded-full">
            {events.length}件
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={18} /> イベントを作成
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
        >
          <option value="">全種別</option>
          <option value="memorial">年忌法要</option>
          <option value="obon">お盆</option>
          <option value="higan">お彼岸</option>
          <option value="new_year">正月</option>
          <option value="other">その他</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
        >
          <option value="">全ステータス</option>
          <option value="draft">下書き</option>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">中止</option>
        </select>
        <button onClick={load} className="bg-gray-100 px-5 py-2.5 rounded-xl text-base hover:bg-gray-200 transition font-medium">
          絞り込み
        </button>
      </div>

      {showForm && (
        <NewEventForm
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Event cards */}
      <div className="space-y-2">
        {events.length === 0 && (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-base">
            イベントがありません
          </div>
        )}
        {events.map((ev) => {
          const tc = typeConfig[ev.eventType] || typeConfig.other;
          const sc = statusConfig[ev.status] || statusConfig.draft;
          const daysLeft = differenceInDays(new Date(ev.eventDate), new Date());
          return editingId === ev.id ? (
            <EditEventForm
              key={ev.id}
              event={ev}
              onSaved={() => { setEditingId(null); load(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={ev.id} className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${tc.color}`}>
                    {tc.label}
                  </span>
                  <Link href={`/events/${ev.id}`} className="text-lg font-bold text-gray-800 hover:text-indigo-600 hover:underline">
                    {ev.title}
                  </Link>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {ev._count.eventTargets > 0 && <span>対象 {ev._count.eventTargets}</span>}
                    {ev._count.eventParticipations > 0 && <span>参加 {ev._count.eventParticipations}</span>}
                    {ev._count.transactions > 0 && <span>取引 {ev._count.transactions}</span>}
                  </div>
                  <button
                    onClick={() => setEditingId(ev.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition"
                    title="イベントを編集"
                  >
                    <Pencil size={14} /> 編集
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {format(new Date(ev.eventDate), "yyyy年M月d日（E）", { locale: ja })}
                </span>
                {ev.status !== "completed" && ev.status !== "cancelled" && (
                  <span className={`font-medium ${
                    daysLeft < 0 ? "text-red-600" : daysLeft <= 7 ? "text-orange-600" : "text-gray-400"
                  }`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}日前` : daysLeft === 0 ? "本日" : `あと${daysLeft}日`}
                  </span>
                )}
                {ev.description && <span className="text-gray-400 truncate max-w-xs">{ev.description}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditEventForm({
  event,
  onSaved,
  onCancel,
}: {
  event: EventItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate.slice(0, 10),
    status: event.status,
    venue: event.venue || "",
    description: event.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/events/${event.id}`, {
        ...form,
        venue: form.venue || undefined,
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
    <form onSubmit={handleSubmit} className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">✏️ イベントを編集</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="イベント名" required />
        <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5">
          <option value="memorial">🙏 年忌法要</option>
          <option value="obon">🏮 お盆</option>
          <option value="higan">🌸 お彼岸</option>
          <option value="new_year">🎍 正月</option>
          <option value="ceremony">⛩️ 法事</option>
          <option value="other">📋 その他</option>
        </select>
        <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" required />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5">
          <option value="draft">下書き</option>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">中止</option>
        </select>
        <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="場所" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border border-gray-300 rounded-xl px-3 py-2.5" placeholder="説明" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100">キャンセル</button>
      </div>
    </form>
  );
}

function NewEventForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: "",
    eventType: "memorial",
    eventDate: "",
    description: "",
    venue: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const templates = [
    { label: "🙏 年忌法要", type: "memorial", title: "年忌法要" },
    { label: "🏮 お盆法要", type: "obon", title: `お盆法要${new Date().getFullYear()}` },
    { label: "🌸 春彼岸法要", type: "higan", title: `春彼岸法要${new Date().getFullYear()}` },
    { label: "🍂 秋彼岸法要", type: "higan", title: `秋彼岸法要${new Date().getFullYear()}` },
    { label: "🎍 正月法要", type: "new_year", title: `正月法要${new Date().getFullYear()}` },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/events", {
        ...form,
        venue: form.venue || undefined,
        description: form.description || undefined,
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
        <h2 className="font-bold text-lg">📅 新規イベントを作成</h2>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Quick templates */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">よく使うイベント（タップで入力）</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setForm({ ...form, title: t.title, eventType: t.type })}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                form.title === t.title
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">イベント名 *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例: 春彼岸法要2026"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">種別</label>
          <select
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="memorial">🙏 年忌法要</option>
            <option value="obon">🏮 お盆</option>
            <option value="higan">🌸 お彼岸</option>
            <option value="new_year">🎍 正月</option>
            <option value="ceremony">⛩️ 法事</option>
            <option value="other">📋 その他</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日付 *</label>
          <input
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">場所</label>
          <input
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            placeholder="例: 本堂"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">説明メモ</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="例: 春のお彼岸の合同法要"
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
          {saving ? "作成中..." : "📅 イベントを作成"}
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
