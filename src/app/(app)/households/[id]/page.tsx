"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Plus, Banknote, ClipboardList, MessageSquare, Calendar, Users, X, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ComboBox from "@/components/ComboBox";
import { useEventOptions, useDeceasedOptions } from "@/lib/use-options";

type HouseholdDetail = {
  id: string;
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phoneNumber: string | null;
  email: string | null;
  lineId: string | null;
  lineAvailable: boolean;
  contactPriority: string;
  status: string;
  notes: string | null;
  deceased: {
    id: string;
    lastName: string;
    firstName: string;
    posthumousName: string | null;
    deathDate: string;
    memorialInstances: { id: string; year: number; dueDate: string; completedAt: string | null }[];
  }[];
  transactions: { id: string; type: string; amount: number; transactionDate: string; description: string | null; event?: { id: string; title: string } | null }[];
  tasks: { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null }[];
  communicationLogs: {
    id: string;
    method: string;
    direction: string;
    subject: string | null;
    sentAt: string | null;
    createdAt: string;
  }[];
  eventParticipations: {
    id: string;
    status: string;
    tobaCount: number;
    event: { id: string; title: string; eventDate: string };
  }[];
};

const contactLabel: Record<string, string> = { postal: "郵送", phone: "電話", email: "メール", line: "LINE" };
const methodLabel: Record<string, string> = { postal: "📮 郵送", phone: "📞 電話", email: "📧 メール", line: "💬 LINE", visit: "🏠 訪問" };

export default function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCommForm, setShowCommForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeceasedForm, setShowDeceasedForm] = useState(false);
  const [editingDeceasedId, setEditingDeceasedId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const canEditTx = user && ["Admin", "OfficeManager"].includes(user.roleName);

  const changeStatus = async (newStatus: string) => {
    setStatusSaving(true);
    try {
      await api.patch(`/api/households/${id}`, { status: newStatus });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setStatusSaving(false);
    }
  };

  const load = () => {
    api.get<HouseholdDetail>(`/api/households/${id}`).then(setHousehold).catch(console.error);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  if (!household) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  const txTotal = household.transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/households" className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft size={22} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{household.name}</h1>
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-indigo-600"
              title="世帯情報を編集"
            >
              <Pencil size={16} />
            </button>
          </div>
          <p className="text-gray-500 mt-0.5">
            〒{household.postalCode} {household.prefecture}{household.city}{household.addressLine1}
            {household.addressLine2 || ""}
          </p>
        </div>
      </div>

      {/* Status change buttons */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-1">ステータス:</span>
            {(
              [
                { value: "active", label: "有効", color: "bg-green-600", ring: "ring-green-200" },
                { value: "inactive", label: "休止", color: "bg-yellow-500", ring: "ring-yellow-200" },
                { value: "withdrawn", label: "離檀", color: "bg-red-500", ring: "ring-red-200" },
              ] as const
            ).map((s) => (
              <button
                key={s.value}
                onClick={() => changeStatus(s.value)}
                disabled={statusSaving || household.status === s.value}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  household.status === s.value
                    ? `${s.color} text-white ring-2 ${s.ring} cursor-default`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-60`}
              >
                {household.status === s.value ? `● ${s.label}` : s.label}
              </button>
            ))}
          </div>
          {statusSaving && <span className="text-sm text-gray-400">変更中...</span>}
        </div>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <HouseholdEditForm
          household={household}
          onSaved={() => { setShowEditForm(false); load(); }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* Contact info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="電話番号" value={household.phoneNumber || "未登録"} />
        <InfoCard label="メール" value={household.email || "未登録"} />
        <InfoCard label="LINE" value={household.lineAvailable ? `有 ${household.lineId || ""}` : "未登録"} />
        <InfoCard label="連絡優先" value={contactLabel[household.contactPriority] || household.contactPriority} />
      </div>
      {household.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-sm font-medium text-amber-800">📝 備考:</span>
          <span className="text-sm text-amber-900 ml-2">{household.notes}</span>
        </div>
      )}

      {/* Deceased section */}
      <Section icon={<Users size={20} />} title="故人一覧" count={household.deceased.length}
        action={
          <button
            onClick={() => setShowDeceasedForm(!showDeceasedForm)}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Plus size={16} /> 故人を追加
          </button>
        }
      >
        {showDeceasedForm && (
          <InlineDeceasedForm
            householdId={id}
            onCreated={() => { setShowDeceasedForm(false); load(); }}
            onCancel={() => setShowDeceasedForm(false)}
          />
        )}
        {household.deceased.length === 0 && !showDeceasedForm && <EmptyState text="故人の登録はありません" />}
        {household.deceased.map((d) => (
          editingDeceasedId === d.id ? (
            <EditDeceasedForm
              key={d.id}
              deceased={d}
              onSaved={() => { setEditingDeceasedId(null); load(); }}
              onCancel={() => setEditingDeceasedId(null)}
            />
          ) : (
          <div key={d.id} className="p-4 hover:bg-gray-50 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href={`/deceased/${d.id}`} className="text-indigo-600 font-bold text-base hover:underline">
                  {d.lastName} {d.firstName}
                </Link>
                {d.posthumousName && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {d.posthumousName}
                  </span>
                )}
                <button
                  onClick={() => setEditingDeceasedId(d.id)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                  title="編集"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <span className="text-sm text-gray-500">
                没 {format(new Date(d.deathDate), "yyyy年M月d日")}
              </span>
            </div>
            {d.memorialInstances.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {d.memorialInstances.map((m) => (
                  <span
                    key={m.id}
                    className={`text-sm px-3 py-1 rounded-full font-medium ${
                      m.completedAt ? "bg-gray-100 text-gray-500" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {m.year}回忌 — {format(new Date(m.dueDate), "yyyy/M/d")}
                  </span>
                ))}
              </div>
            )}
          </div>
          )
        ))}
      </Section>

      {/* Event Participations */}
      <Section icon={<Calendar size={20} />} title="イベント参加" count={household.eventParticipations.length}>
        {household.eventParticipations.length === 0 && <EmptyState text="イベント参加の記録はありません" />}
        {household.eventParticipations.map((ep) => (
          <div key={ep.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
            <div>
              <Link href={`/events/${ep.event.id}`} className="text-indigo-600 font-medium text-base hover:underline">
                {ep.event.title}
              </Link>
              <span className="ml-3 text-sm text-gray-400">
                {format(new Date(ep.event.eventDate), "yyyy年M月d日")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ep.status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : ep.status === "declined"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {ep.status === "accepted" ? "✓ 出席" : ep.status === "declined" ? "✗ 欠席" : "— 未回答"}
              </span>
              {ep.tobaCount > 0 && (
                <span className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                  塔婆 {ep.tobaCount}本
                </span>
              )}
            </div>
          </div>
        ))}
      </Section>

      {/* Transactions */}
      <Section
        icon={<Banknote size={20} />}
        title="入金・取引履歴"
        count={household.transactions.length}
        action={
          canEditTx ? (
            <button
              onClick={() => setShowTxForm(!showTxForm)}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition"
            >
              <Plus size={18} /> 入金を記録
            </button>
          ) : undefined
        }
      >
        {showTxForm && canEditTx && (
          <InlineTransactionForm
            householdId={household.id}
            householdName={household.name}
            onCreated={() => { setShowTxForm(false); load(); }}
            onCancel={() => setShowTxForm(false)}
          />
        )}
        {household.transactions.length === 0 && !showTxForm && <EmptyState text="取引の記録はありません" />}
        {household.transactions.map((t) => (
          editingTxId === t.id ? (
            <EditTxInline
              key={t.id}
              tx={t}
              onSaved={() => { setEditingTxId(null); load(); }}
              onCancel={() => setEditingTxId(null)}
            />
          ) : (
          <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
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
              <span className="text-gray-600">{t.description || ""}</span>
              {t.event && (
                <Link href={`/events/${t.event.id}`} className="text-xs text-indigo-500 hover:underline">
                  📅 {t.event.title}
                </Link>
              )}
              {canEditTx && (
                <button onClick={() => setEditingTxId(t.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition" title="編集">
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold">¥{t.amount.toLocaleString()}</span>
              <span className="text-sm text-gray-400">{format(new Date(t.transactionDate), "yyyy/M/d")}</span>
            </div>
          </div>
          )
        ))}
        {household.transactions.length > 0 && (
          <div className="p-4 bg-gray-50 flex justify-between items-center font-bold text-base">
            <span>合計</span>
            <span className="text-lg">¥{txTotal.toLocaleString()}</span>
          </div>
        )}
      </Section>

      {/* Tasks */}
      <Section
        icon={<ClipboardList size={20} />}
        title="タスク"
        count={household.tasks.filter((t) => t.status !== "done").length}
        action={
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> タスクを追加
          </button>
        }
      >
        {showTaskForm && (
          <InlineTaskForm
            householdId={household.id}
            householdName={household.name}
            onCreated={() => { setShowTaskForm(false); load(); }}
            onCancel={() => setShowTaskForm(false)}
          />
        )}
        {household.tasks.length === 0 && !showTaskForm && <EmptyState text="タスクはありません" />}
        {household.tasks.map((t) => (
          editingTaskId === t.id ? (
            <EditTaskInline
              key={t.id}
              task={t}
              onSaved={() => { setEditingTaskId(null); load(); }}
              onCancel={() => setEditingTaskId(null)}
            />
          ) : (
          <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                }`}
              />
              <span className={`text-base ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                {t.title}
              </span>
              {t.priority === "high" && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">重要</span>
              )}
              <button onClick={() => setEditingTaskId(t.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition" title="編集">
                <Pencil size={14} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <TaskStatusButton taskId={t.id} status={t.status} onUpdate={load} />
              {t.dueDate && (
                <span className="text-sm text-gray-400">
                  期限 {format(new Date(t.dueDate), "M/d")}
                </span>
              )}
            </div>
          </div>
          )
        ))}
      </Section>

      {/* Communication Logs */}
      <Section
        icon={<MessageSquare size={20} />}
        title="連絡履歴"
        count={household.communicationLogs.length}
        action={
          <button
            onClick={() => setShowCommForm(!showCommForm)}
            className="flex items-center gap-1.5 bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition"
          >
            <Plus size={18} /> 連絡を記録
          </button>
        }
      >
        {showCommForm && (
          <CommForm
            householdId={household.id}
            onCreated={() => { setShowCommForm(false); load(); }}
            onCancel={() => setShowCommForm(false)}
          />
        )}
        {household.communicationLogs.length === 0 && !showCommForm && <EmptyState text="連絡履歴はありません" />}
        {household.communicationLogs.map((c) => (
          <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                {methodLabel[c.method] || c.method}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded ${c.direction === "outbound" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                {c.direction === "outbound" ? "→ 送信" : "← 受信"}
              </span>
              {c.subject && <span className="text-gray-700">{c.subject}</span>}
            </div>
            <span className="text-sm text-gray-400">
              {format(new Date(c.sentAt || c.createdAt), "yyyy/M/d")}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

/* ─── Shared UI Components ──────────────────────────── */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800 truncate">{value}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600">{icon}</span>
          <h2 className="font-bold text-lg">{title}</h2>
          {count !== undefined && (
            <span className="bg-gray-100 text-gray-600 text-sm px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {action}
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-6 text-center text-gray-400 text-base">{text}</p>;
}

function TaskStatusButton({ taskId, status, onUpdate }: { taskId: string; status: string; onUpdate: () => void }) {
  const change = async (newStatus: string) => {
    await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
    onUpdate();
  };

  if (status === "open") {
    return (
      <button onClick={() => change("in_progress")} className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-blue-100 text-blue-700 hover:bg-blue-200">
        着手する
      </button>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="flex gap-2">
        <button onClick={() => change("open")} className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700">
          ↩ 未着手
        </button>
        <button onClick={() => change("done")} className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-green-100 text-green-700 hover:bg-green-200">
          完了にする
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => change("open")} className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700">
        ↩ 未着手
      </button>
      <button onClick={() => change("in_progress")} className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-blue-100 text-blue-700 hover:bg-blue-200">
        ↩ 進行中
      </button>
    </div>
  );
}

/* ─── Inline Transaction Form ───────────────────────── */

function InlineTransactionForm({
  householdId,
  householdName,
  onCreated,
  onCancel,
}: {
  householdId: string;
  householdName: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const eventOptions = useEventOptions();
  const deceasedOptions = useDeceasedOptions();
  const [form, setForm] = useState({
    type: "ofuse",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
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
        householdId,
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
    <form onSubmit={handleSubmit} className="p-5 bg-green-50 border-b space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-green-800">💰 入金を記録 — {householdName}</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-green-100 rounded">
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
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">説明メモ</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="例: 春彼岸お布施"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <ComboBox
          label="関連イベント（任意）"
          options={eventOptions}
          value={form.eventId}
          onChange={(v) => setForm({ ...form, eventId: v })}
          placeholder="イベントを選択..."
        />
        <ComboBox
          label="関連故人（任意）"
          options={deceasedOptions}
          value={form.deceasedId}
          onChange={(v) => setForm({ ...form, deceasedId: v })}
          placeholder="故人を選択..."
        />
      </div>

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

/* ─── Inline Task Form ──────────────────────────────── */

function InlineTaskForm({
  householdId,
  householdName,
  onCreated,
  onCancel,
}: {
  householdId: string;
  householdName: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const taskTemplates = [
    { label: "📮 案内状を郵送", title: `${householdName}に案内状を郵送` },
    { label: "📞 電話で確認", title: `${householdName}に電話確認` },
    { label: "🙏 年忌法要の準備", title: `${householdName} 年忌法要の準備` },
    { label: "💰 入金確認", title: `${householdName}の入金確認` },
    { label: "📝 塔婆の手配", title: `${householdName} 塔婆の手配` },
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
        householdId,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-indigo-50 border-b space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-indigo-800">📋 タスクを追加 — {householdName}</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-indigo-100 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Quick templates */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">よく使うタスク（タップで入力）</label>
        <div className="flex flex-wrap gap-2">
          {taskTemplates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setForm({ ...form, title: t.title })}
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
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">タスク内容</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例: 山田家に春彼岸の案内状を郵送"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
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
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">期限</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">メモ（任意）</label>
          <input
            type="text"
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

/* ─── Communication Form ────────────────────────────── */

function CommForm({
  householdId,
  onCreated,
  onCancel,
}: {
  householdId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    method: "postal",
    direction: "outbound",
    subject: "",
    body: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/households/${householdId}/communications`, form);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-gray-50 border-b space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-gray-800">✉️ 連絡を記録</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-200 rounded">
          <X size={20} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">手段</label>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="postal">📮 郵送</option>
            <option value="phone">📞 電話</option>
            <option value="email">📧 メール</option>
            <option value="line">💬 LINE</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">方向</label>
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          >
            <option value="outbound">→ 送信（こちらから）</option>
            <option value="inbound">← 受信（先方から）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">件名</label>
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="例: 春彼岸法要のご案内"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">内容メモ</label>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="例: 3月20日の春彼岸法要の案内状を郵送しました"
          rows={2}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-700 text-white px-6 py-3 rounded-xl text-base font-bold hover:bg-gray-800 transition disabled:opacity-50"
        >
          {saving ? "記録中..." : "✉️ 記録する"}
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

/* ─── Household Edit Form ───────────────────────────── */

function HouseholdEditForm({
  household,
  onSaved,
  onCancel,
}: {
  household: HouseholdDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: household.name,
    postalCode: household.postalCode,
    prefecture: household.prefecture,
    city: household.city,
    addressLine1: household.addressLine1,
    addressLine2: household.addressLine2 || "",
    phoneNumber: household.phoneNumber || "",
    email: household.email || "",
    lineId: household.lineId || "",
    lineAvailable: household.lineAvailable,
    contactPriority: household.contactPriority,
    notes: household.notes || "",
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
        addressLine2: form.addressLine2 || undefined,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        lineId: form.lineId || undefined,
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
        <h2 className="font-bold text-lg">✏️ 世帯情報を編集</h2>
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
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">郵便番号 *</label>
          <input
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            placeholder="例: 123-4567"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">都道府県 *</label>
          <input
            value={form.prefecture}
            onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">市区町村 *</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">住所1 *</label>
          <input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
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
            placeholder="例: yamada@example.com"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">LINE ID</label>
          <input
            value={form.lineId}
            onChange={(e) => setForm({ ...form, lineId: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">LINE利用可能</label>
          <div className="flex gap-2 mt-1">
            {[
              { value: true, label: "✓ 利用可能" },
              { value: false, label: "✗ 利用不可" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setForm({ ...form, lineAvailable: opt.value })}
                className={`flex-1 py-3 rounded-xl text-base font-medium border-2 transition ${
                  form.lineAvailable === opt.value
                    ? opt.value
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-400 bg-gray-50 text-gray-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="例: 毎年お盆にお参りに来られる"
            rows={2}
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
          {saving ? "保存中..." : "✏️ 保存する"}
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

/* ─── Inline Deceased Form ──────────────────────────── */

function InlineDeceasedForm({
  householdId,
  onCreated,
  onCancel,
}: {
  householdId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    posthumousName: "",
    deathDate: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/deceased", {
        householdId,
        lastName: form.lastName,
        firstName: form.firstName,
        posthumousName: form.posthumousName || undefined,
        deathDate: form.deathDate,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-indigo-50 border-b space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">🙏 故人を登録</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">姓 *</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="例: 山田"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">名 *</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="例: 太郎"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">没年月日 *</label>
          <input
            type="date"
            value={form.deathDate}
            onChange={(e) => setForm({ ...form, deathDate: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
            required
          />
        </div>
        <div className="col-span-2 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">戒名</label>
          <input
            value={form.posthumousName}
            onChange={(e) => setForm({ ...form, posthumousName: e.target.value })}
            placeholder="例: 釋浄光居士"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">備考</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="メモ"
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
          {saving ? "登録中..." : "🙏 故人を登録"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

/* ─── Edit Deceased Form (household detail) ──────────── */

function EditDeceasedForm({
  deceased,
  onSaved,
  onCancel,
}: {
  deceased: { id: string; lastName: string; firstName: string; posthumousName: string | null; deathDate: string };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    lastName: deceased.lastName,
    firstName: deceased.firstName,
    posthumousName: deceased.posthumousName || "",
    deathDate: deceased.deathDate.slice(0, 10),
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
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-yellow-50 border-b border-yellow-300 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">✏️ 故人を編集</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded"><X size={18} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">姓 *</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">名 *</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">没年月日 *</label>
          <input type="date" value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">戒名</label>
          <input value={form.posthumousName} onChange={(e) => setForm({ ...form, posthumousName: e.target.value })} placeholder="釋浄光居士" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
      </div>
      {error && <p className="text-red-600 font-medium text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition">キャンセル</button>
      </div>
    </form>
  );
}

/* ─── Edit Transaction Inline (household detail) ─────── */

function EditTxInline({
  tx,
  onSaved,
  onCancel,
}: {
  tx: { id: string; type: string; amount: number; transactionDate: string; description: string | null };
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
    <form onSubmit={handleSubmit} className="p-4 bg-yellow-50 border-b border-yellow-300 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">✏️ 取引を編集</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded"><X size={18} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">種別</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base">
            <option value="ofuse">お布施</option>
            <option value="toba">塔婆料</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">金額 *</label>
          <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日付 *</label>
          <input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">説明</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
      </div>
      {error && <p className="text-red-600 font-medium text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition">キャンセル</button>
      </div>
    </form>
  );
}

/* ─── Edit Task Inline (household detail) ────────────── */

function EditTaskInline({
  task,
  onSaved,
  onCancel,
}: {
  task: { id: string; title: string; description: string | null; priority: string; dueDate: string | null };
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
    <form onSubmit={handleSubmit} className="p-4 bg-yellow-50 border-b border-yellow-300 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">✏️ タスクを編集</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white rounded"><X size={18} className="text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">タイトル *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">期限</label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">優先度</label>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition ${
                  form.priority === p
                    ? p === "high" ? "border-red-400 bg-red-50 text-red-700" : p === "medium" ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-green-400 bg-green-50 text-green-700"
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
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base" />
        </div>
      </div>
      {error && <p className="text-red-600 font-medium text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-base font-bold hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? "保存中..." : "✏️ 保存"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-base text-gray-600 hover:bg-gray-100 transition">キャンセル</button>
      </div>
    </form>
  );
}
