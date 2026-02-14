"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, X, Pencil } from "lucide-react";
import ComboBox from "@/components/ComboBox";
import { useHouseholdOptions } from "@/lib/use-options";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  household: { id: string; name: string } | null;
  assignee: { id: string; displayName: string } | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api.get<Task[]>(`/api/tasks?${params}`).then(setTasks).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/tasks/${id}`, { status });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">📋 タスク一覧</h1>
          {openCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full">
              未完了 {openCount}件
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={18} /> タスクを追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-base"
        >
          <option value="">全ステータス</option>
          <option value="open">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
        <button onClick={load} className="bg-gray-100 px-5 py-2.5 rounded-xl text-base hover:bg-gray-200 transition font-medium">
          絞り込み
        </button>
      </div>

      {showForm && (
        <NewTaskForm
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Task cards */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-base">
            タスクがありません
          </div>
        )}
        {tasks.map((t) => (
          editingId === t.id ? (
            <EditTaskForm
              key={t.id}
              task={t}
              onSaved={() => { setEditingId(null); load(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
          <div
            key={t.id}
            className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition hover:shadow-md ${
              t.status === "done" ? "opacity-60" : ""
            }`}
          >
            {/* Status indicator */}
            <div
              className={`w-4 h-4 rounded-full shrink-0 ${
                t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
              }`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-base font-medium ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {t.title}
                </span>
                {t.priority === "high" && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">🔴 重要</span>
                )}
                {t.priority === "low" && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">低</span>
                )}
                <button
                  onClick={() => setEditingId(t.id)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                  title="編集"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {t.household && (
                  <Link href={`/households/${t.household.id}`} className="text-indigo-600 hover:underline">
                    {t.household.name}
                  </Link>
                )}
                {t.dueDate && (
                  <span>期限: {format(new Date(t.dueDate), "M/d")}</span>
                )}
                {t.assignee && <span>担当: {t.assignee.displayName}</span>}
              </div>
            </div>

            {/* Action */}
            <div className="shrink-0">
              {t.status === "open" && (
                <button
                  onClick={() => updateStatus(t.id, "in_progress")}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                >
                  着手する
                </button>
              )}
              {t.status === "in_progress" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(t.id, "open")}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 transition"
                  >
                    ↩ 未着手
                  </button>
                  <button
                    onClick={() => updateStatus(t.id, "done")}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                  >
                    完了にする
                  </button>
                </div>
              )}
              {t.status === "done" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(t.id, "open")}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 transition"
                  >
                    ↩ 未着手
                  </button>
                  <button
                    onClick={() => updateStatus(t.id, "in_progress")}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    ↩ 進行中
                  </button>
                </div>
              )}
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  );
}

function NewTaskForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const householdOptions = useHouseholdOptions();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    householdId: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const templates = [
    "案内状を郵送",
    "電話で出欠確認",
    "年忌法要の準備",
    "入金確認",
    "塔婆の手配",
    "お礼状を郵送",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/tasks", {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        householdId: form.householdId || undefined,
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
        <h2 className="font-bold text-lg">📋 新規タスク</h2>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Quick templates */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">よく使うタスク（タップで入力）</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, title: t })}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                form.title === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">タスク内容</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例: 山田家に春彼岸の案内状を郵送"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <ComboBox
          label="関連世帯（任意）"
          options={householdOptions}
          value={form.householdId}
          onChange={(v) => setForm({ ...form, householdId: v })}
          placeholder="世帯を選択..."
        />
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">期限</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
          <div className="flex gap-2">
            {[
              { value: "high", label: "🔴 高", color: "border-red-400 bg-red-50 text-red-700" },
              { value: "medium", label: "🟡 中", color: "border-yellow-400 bg-yellow-50 text-yellow-700" },
              { value: "low", label: "🟢 低", color: "border-green-400 bg-green-50 text-green-700" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, priority: p.value })}
                className={`flex-1 py-3 rounded-xl text-base font-medium border-2 transition ${
                  form.priority === p.value ? p.color : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">メモ（任意）</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="例: 3月10日までに届くように"
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
          {saving ? "作成中..." : "📋 タスクを作成"}
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

/* ─── Edit Task Form ─────────────────────────────────── */

function EditTaskForm({
  task,
  onSaved,
  onCancel,
}: {
  task: Task;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/tasks/${task.id}`, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 rounded-xl border border-yellow-300 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">✏️ タスクを編集</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">タイトル *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">期限</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className={`flex-1 py-3 rounded-xl text-base font-medium border-2 transition ${
                  form.priority === p
                    ? p === "high" ? "border-red-400 bg-red-50 text-red-700"
                      : p === "medium" ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                      : "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {p === "high" ? "🔴 高" : p === "medium" ? "🟡 中" : "🟢 低"}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">メモ</label>
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
