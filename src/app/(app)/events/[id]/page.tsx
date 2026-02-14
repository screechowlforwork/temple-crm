"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Pencil, X } from "lucide-react";
import ComboBox from "@/components/ComboBox";
import { useHouseholdOptions, useDeceasedOptions } from "@/lib/use-options";

type Participation = {
  id: string;
  status: string;
  tobaCount: number;
  attendees: number;
  notes: string | null;
  household: { id: string; name: string };
};

type EventDetail = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  status: string;
  venue: string | null;
  description: string | null;
  eventTargets: {
    id: string;
    household: { id: string; name: string } | null;
    deceased: { id: string; lastName: string; firstName: string; posthumousName: string | null } | null;
  }[];
  eventParticipations: Participation[];
  transactions: {
    id: string;
    type: string;
    amount: number;
    transactionDate: string;
    household: { id: string; name: string } | null;
  }[];
  memorialInstances: {
    id: string;
    year: number;
    deceased: {
      id: string;
      lastName: string;
      firstName: string;
      posthumousName: string | null;
      household: { id: string; name: string };
    };
  }[];
  tobaSummary: {
    totalToba: number;
    totalAttendees: number;
    acceptedCount: number;
    declinedCount: number;
    pendingCount: number;
  };
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const householdOptions = useHouseholdOptions();
  const deceasedOptions = useDeceasedOptions();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [savingParticipationId, setSavingParticipationId] = useState<string | null>(null);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetType, setTargetType] = useState<"household" | "deceased">("household");
  const [targetId, setTargetId] = useState("");
  const [targetView, setTargetView] = useState<"all" | "household" | "deceased">("all");
  const [keepAddingTargets, setKeepAddingTargets] = useState(true);
  const [targetSaving, setTargetSaving] = useState(false);
  const [removingTargetId, setRemovingTargetId] = useState<string | null>(null);
  const [targetError, setTargetError] = useState("");
  const [targetSuccess, setTargetSuccess] = useState("");

  const load = useCallback(() => {
    api.get<EventDetail>(`/api/events/${id}`).then(setEvent).catch(console.error);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showTargetForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTargetForm(false);
        setTargetError("");
        setTargetSuccess("");
        setTargetId("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showTargetForm]);

  useEffect(() => {
    if (!targetSuccess) return;
    const timer = setTimeout(() => setTargetSuccess(""), 2500);
    return () => clearTimeout(timer);
  }, [targetSuccess]);

  const updateParticipation = async (householdId: string, data: Partial<Participation>) => {
    setSavingParticipationId(householdId);
    try {
      await api.patch(`/api/events/${id}/participations/${householdId}`, data);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingParticipationId(null);
    }
  };

  const removeTarget = async (targetIdToRemove: string) => {
    const ok = window.confirm("この対象をイベントから解除しますか？");
    if (!ok) return;

    setTargetError("");
    setRemovingTargetId(targetIdToRemove);
    try {
      await api.delete(`/api/events/${id}/targets?targetId=${targetIdToRemove}`);
      load();
    } catch (err) {
      setTargetError(err instanceof Error ? err.message : "対象の削除に失敗しました");
    } finally {
      setRemovingTargetId(null);
    }
  };

  const submitTarget = async () => {
    setTargetError("");
    if (!targetId) {
      setTargetError("対象を選択してください");
      return;
    }

    const alreadyExists = event?.eventTargets.some((t) =>
      targetType === "household" ? t.household?.id === targetId : t.deceased?.id === targetId
    );
    if (alreadyExists) {
      setTargetError("この対象は既に追加済みです");
      return;
    }

    setTargetSaving(true);
    try {
      const selectedOption = (targetType === "household" ? availableHouseholdOptions : availableDeceasedOptions).find(
        (o) => o.value === targetId
      );
      await api.post(
        `/api/events/${id}/targets`,
        targetType === "household" ? { householdId: targetId } : { deceasedId: targetId }
      );
      setTargetSuccess(
        `${targetType === "household" ? "世帯" : "故人"}を追加しました${selectedOption ? `: ${selectedOption.label}` : ""}`
      );
      setTargetId("");
      if (!keepAddingTargets) {
        setShowTargetForm(false);
      }
      load();
    } catch (err) {
      setTargetError(err instanceof Error ? err.message : "対象追加に失敗しました");
    } finally {
      setTargetSaving(false);
    }
  };

  const addTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTarget();
  };

  const handleTargetFormKeyDown = async (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      await submitTarget();
    }
  };

  if (!event) return <p className="text-gray-400">読み込み中...</p>;

  const filteredTargets = event.eventTargets.filter((t) => {
    if (targetView === "all") return true;
    if (targetView === "household") return Boolean(t.household);
    return Boolean(t.deceased);
  });

  const sortedTargets = [...filteredTargets].sort((a, b) => {
    const aLabel = a.household ? a.household.name : `${a.deceased?.lastName || ""} ${a.deceased?.firstName || ""}`.trim();
    const bLabel = b.household ? b.household.name : `${b.deceased?.lastName || ""} ${b.deceased?.firstName || ""}`.trim();
    return aLabel.localeCompare(bLabel, "ja");
  });

  const existingHouseholdIds = new Set(
    event.eventTargets.map((t) => t.household?.id).filter((v): v is string => Boolean(v))
  );
  const existingDeceasedIds = new Set(
    event.eventTargets.map((t) => t.deceased?.id).filter((v): v is string => Boolean(v))
  );
  const availableHouseholdOptions = householdOptions.filter((o) => !existingHouseholdIds.has(o.value));
  const availableDeceasedOptions = deceasedOptions.filter((o) => !existingDeceasedIds.has(o.value));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/events" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{event.eventType}</span>
        <span className="text-sm text-gray-500">{format(new Date(event.eventDate), "yyyy/M/d")}</span>
        <button
          onClick={() => setIsEditingEvent(!isEditingEvent)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition"
        >
          <Pencil size={14} /> 編集
        </button>
      </div>

      {isEditingEvent && (
        <EventCoreEditForm
          event={event}
          onSaved={() => {
            setIsEditingEvent(false);
            load();
          }}
          onCancel={() => setIsEditingEvent(false)}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{event.tobaSummary.totalToba}</div>
          <div className="text-xs text-gray-500">塔婆合計</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-2xl font-bold">{event.tobaSummary.totalAttendees}</div>
          <div className="text-xs text-gray-500">出席者数</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{event.tobaSummary.acceptedCount}</div>
          <div className="text-xs text-gray-500">出席</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{event.tobaSummary.declinedCount}</div>
          <div className="text-xs text-gray-500">欠席</div>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{event.tobaSummary.pendingCount}</div>
          <div className="text-xs text-gray-500">未回答</div>
        </div>
      </div>

      {/* Memorial instances linked */}
      {event.memorialInstances.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-medium">関連年忌</div>
          <div className="divide-y">
            {event.memorialInstances.map((m) => (
              <div key={m.id} className="p-3 text-sm flex justify-between items-center">
                <div>
                  <Link href={`/deceased/${m.deceased.id}`} className="text-indigo-600 hover:underline">
                    {m.deceased.lastName} {m.deceased.firstName}
                  </Link>
                  {m.deceased.posthumousName && (
                    <span className="ml-1 text-gray-500 text-xs">{m.deceased.posthumousName}</span>
                  )}
                  <span className="ml-2 text-orange-600 text-xs font-medium">{m.year}回忌</span>
                </div>
                <Link
                  href={`/households/${m.deceased.household.id}`}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {m.deceased.household.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targets management */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">対象者管理</div>
          <button
            onClick={() => {
              setTargetError("");
              setShowTargetForm(!showTargetForm);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition"
          >
            + 対象を追加
          </button>
        </div>

        {showTargetForm && (
          <form onSubmit={addTarget} onKeyDown={handleTargetFormKeyDown} className="p-4 border-b bg-indigo-50/40 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType("household");
                  setTargetId("");
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  targetType === "household"
                    ? "bg-white border-indigo-400 text-indigo-700"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                世帯
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType("deceased");
                  setTargetId("");
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  targetType === "deceased"
                    ? "bg-white border-indigo-400 text-indigo-700"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                故人
              </button>
            </div>

            <ComboBox
              label={targetType === "household" ? "世帯を選択" : "故人を選択"}
              options={targetType === "household" ? availableHouseholdOptions : availableDeceasedOptions}
              value={targetId}
              onChange={setTargetId}
              placeholder={targetType === "household" ? "世帯を検索..." : "故人を検索..."}
              disabled={targetSaving}
            />

            {(targetType === "household" ? availableHouseholdOptions.length === 0 : availableDeceasedOptions.length === 0) && (
              <p className="text-xs text-gray-500">追加可能な対象がありません</p>
            )}

            {targetError && <p className="text-sm text-red-600">{targetError}</p>}
            {targetSuccess && <p className="text-sm text-green-700">{targetSuccess}</p>}

            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={keepAddingTargets}
                onChange={(e) => setKeepAddingTargets(e.target.checked)}
              />
              続けて追加する
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={targetSaving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                title="Shift + Enter でも追加できます"
              >
                {targetSaving ? "追加中..." : "対象を追加"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTargetForm(false);
                  setTargetError("");
                  setTargetId("");
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        <div className="p-4">
          {targetError && <p className="text-sm text-red-600 mb-2">{targetError}</p>}
          <div className="flex items-center gap-2 mb-3">
            {([
              { key: "all", label: `すべて (${event.eventTargets.length})` },
              { key: "household", label: `世帯 (${event.eventTargets.filter((t) => t.household).length})` },
              { key: "deceased", label: `故人 (${event.eventTargets.filter((t) => t.deceased).length})` },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTargetView(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  targetView === f.key
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {filteredTargets.length === 0 ? (
            <p className="text-sm text-gray-400">対象が未設定です</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedTargets.map((t) => (
                <div
                  key={t.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    t.household ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  <span className="text-xs">
                    {t.household ? "世帯" : "故人"}
                  </span>
                  {t.household ? (
                    <Link href={`/households/${t.household.id}`} className="font-medium hover:underline">
                      {t.household.name}
                    </Link>
                  ) : t.deceased ? (
                    <Link href={`/deceased/${t.deceased.id}`} className="font-medium hover:underline">
                      {t.deceased.lastName} {t.deceased.firstName}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeTarget(t.id)}
                    disabled={removingTargetId === t.id}
                    className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/70 text-xs disabled:opacity-50"
                    title="対象を解除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Participations - editable */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b font-medium">出欠・塔婆管理</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">世帯</th>
                <th className="text-left px-4 py-2 font-medium">出欠</th>
                <th className="text-left px-4 py-2 font-medium">塔婆</th>
                <th className="text-left px-4 py-2 font-medium">出席者数</th>
                <th className="text-left px-4 py-2 font-medium">メモ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {event.eventParticipations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                    参加者なし
                  </td>
                </tr>
              )}
              {event.eventParticipations.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/households/${p.household.id}`} className="text-indigo-600 hover:underline">
                      {p.household.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.status}
                      onChange={(e) => updateParticipation(p.household.id, { status: e.target.value })}
                      disabled={savingParticipationId === p.household.id}
                      className={`border rounded px-2 py-1 text-xs ${
                        p.status === "accepted"
                          ? "bg-green-50 text-green-700"
                          : p.status === "declined"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50"
                      }`}
                    >
                      <option value="pending">未回答</option>
                      <option value="no_response">未連絡/不在</option>
                      <option value="accepted">出席</option>
                      <option value="declined">欠席</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={p.tobaCount}
                      onChange={(e) =>
                        updateParticipation(p.household.id, { tobaCount: parseInt(e.target.value) || 0 })
                      }
                      disabled={savingParticipationId === p.household.id}
                      className="border rounded px-2 py-1 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={p.attendees}
                      onChange={(e) =>
                        updateParticipation(p.household.id, { attendees: parseInt(e.target.value) || 0 })
                      }
                      disabled={savingParticipationId === p.household.id}
                      className="border rounded px-2 py-1 w-16 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <NotesInput
                      initialValue={p.notes || ""}
                      disabled={savingParticipationId === p.household.id}
                      onSave={(val) => updateParticipation(p.household.id, { notes: val })}
                    />
                    {savingParticipationId === p.household.id && (
                      <span className="ml-2 text-xs text-indigo-600">保存中...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b font-medium">関連取引</div>
        <div className="divide-y">
          {event.transactions.length === 0 && <p className="p-4 text-sm text-gray-400">なし</p>}
          {event.transactions.map((t) => (
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
                {t.household && (
                  <Link href={`/households/${t.household.id}`} className="text-indigo-600 hover:underline">
                    {t.household.name}
                  </Link>
                )}
              </div>
              <span className="font-medium">¥{t.amount.toLocaleString()}</span>
            </div>
          ))}
          {event.transactions.length > 0 && (
            <div className="p-3 text-sm flex justify-between items-center bg-gray-50 font-medium">
              <span>合計</span>
              <span>¥{event.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCoreEditForm({
  event,
  onSaved,
  onCancel,
}: {
  event: EventDetail;
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
        <h3 className="font-bold">✏️ イベント情報を編集</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-white">
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded px-3 py-2.5" placeholder="イベント名" required />
        <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className="border rounded px-3 py-2.5">
          <option value="memorial">🙏 年忌法要</option>
          <option value="obon">🏮 お盆</option>
          <option value="higan">🌸 お彼岸</option>
          <option value="new_year">🎍 正月</option>
          <option value="ceremony">⛩️ 法事</option>
          <option value="other">📋 その他</option>
        </select>
        <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="border rounded px-3 py-2.5" required />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border rounded px-3 py-2.5">
          <option value="draft">下書き</option>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">中止</option>
        </select>
        <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="border rounded px-3 py-2.5" placeholder="場所" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2.5" placeholder="説明" />
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

function NotesInput({
  initialValue,
  onSave,
  disabled = false,
}: {
  initialValue: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(v), 800);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className="border rounded px-2 py-1 text-sm w-full"
      placeholder="メモ"
    />
  );
}
