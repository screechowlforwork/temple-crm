"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertCircle, Calendar, ClipboardList, Banknote, Home, Plus, ArrowRight } from "lucide-react";

type DashboardData = {
  openTasks: number;
  dueSoonTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    household: { id: string; name: string } | null;
    assignee: { id: string; displayName: string } | null;
  }[];
  thisMonthMemorials: {
    id: string;
    year: number;
    dueDate: string;
    deceased: {
      id: string;
      lastName: string;
      firstName: string;
      posthumousName: string | null;
      household: { id: string; name: string };
    };
  }[];
  unlinkedTransactions: number;
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    transactionDate: string;
    description: string | null;
    household: { id: string; name: string } | null;
    event: { id: string; title: string } | null;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/api/dashboard").then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const txTotal = data.recentTransactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {today.getHours() < 12 ? "おはようございます" : today.getHours() < 18 ? "こんにちは" : "お疲れさまです"}
        </h1>
        <p className="text-gray-500 mt-0.5">
          {format(today, "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/tasks" className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition group">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <ClipboardList size={20} />
            <span className="text-sm font-medium">未完了タスク</span>
          </div>
          <p className="text-3xl font-bold">{data.openTasks}<span className="text-base font-normal text-gray-400 ml-1">件</span></p>
        </Link>
        <Link href="/deceased" className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition group">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Calendar size={20} />
            <span className="text-sm font-medium">今月の年忌</span>
          </div>
          <p className="text-3xl font-bold">{data.thisMonthMemorials.length}<span className="text-base font-normal text-gray-400 ml-1">件</span></p>
        </Link>
        <Link href="/transactions" className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition group">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Banknote size={20} />
            <span className="text-sm font-medium">最近の入金</span>
          </div>
          <p className="text-2xl font-bold">¥{txTotal.toLocaleString()}</p>
        </Link>
        {data.unlinkedTransactions > 0 ? (
          <Link href="/transactions" className="bg-red-50 rounded-xl p-4 border border-red-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">未紐付け取引</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{data.unlinkedTransactions}<span className="text-base font-normal ml-1">件</span></p>
          </Link>
        ) : (
          <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">未紐付け取引</span>
            </div>
            <p className="text-xl font-bold text-green-600">✓ なし</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/households" className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition">
          <Home size={16} /> 世帯一覧
        </Link>
        <Link href="/tasks" className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition">
          <Plus size={16} /> タスクを追加
        </Link>
        <Link href="/transactions" className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition">
          <Banknote size={16} /> 入金を記録
        </Link>
        <Link href="/events" className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition">
          <Calendar size={16} /> イベント一覧
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due soon tasks */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <ClipboardList size={18} className="text-indigo-600" />
              期限間近のタスク
            </div>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              すべて見る <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y">
            {data.dueSoonTasks.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-base">期限間近のタスクはありません</p>
            )}
            {data.dueSoonTasks.map((t) => {
              const daysLeft = t.dueDate ? differenceInDays(new Date(t.dueDate), today) : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              return (
                <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">{t.title}</span>
                      {t.priority === "high" && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">重要</span>
                      )}
                    </div>
                    {t.household && (
                      <Link href={`/households/${t.household.id}`} className="text-sm text-indigo-600 hover:underline">
                        {t.household.name}
                      </Link>
                    )}
                  </div>
                  {t.dueDate && (
                    <span className={`text-sm font-medium px-3 py-1 rounded-full shrink-0 ${
                      isOverdue
                        ? "bg-red-100 text-red-700"
                        : daysLeft === 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {isOverdue
                        ? `${Math.abs(daysLeft!)}日超過`
                        : daysLeft === 0
                        ? "本日"
                        : `あと${daysLeft}日`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* This month memorials */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Calendar size={18} className="text-orange-600" />
              今月の年忌
            </div>
            <Link href="/deceased" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              故人一覧 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y">
            {data.thisMonthMemorials.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-base">今月の年忌はありません</p>
            )}
            {data.thisMonthMemorials.map((m) => {
              const daysLeft = differenceInDays(new Date(m.dueDate), today);
              return (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/deceased/${m.deceased.id}`} className="font-medium text-base text-indigo-600 hover:underline">
                        {m.deceased.lastName} {m.deceased.firstName}
                      </Link>
                      <span className="bg-orange-100 text-orange-700 text-sm px-2.5 py-0.5 rounded-full font-medium">
                        {m.year}回忌
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      {m.deceased.posthumousName && <span>{m.deceased.posthumousName}</span>}
                      <Link href={`/households/${m.deceased.household.id}`} className="text-indigo-500 hover:underline">
                        {m.deceased.household.name}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-medium">{format(new Date(m.dueDate), "M月d日", { locale: ja })}</div>
                    <div className={`text-sm ${daysLeft < 0 ? "text-red-600 font-bold" : daysLeft <= 7 ? "text-orange-600" : "text-gray-400"}`}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}日超過` : daysLeft === 0 ? "本日" : `あと${daysLeft}日`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base">
              <Banknote size={18} className="text-green-600" />
              最近の取引
            </div>
            <Link href="/transactions" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              すべて見る <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y">
            {data.recentTransactions.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-base">取引がありません</p>
            )}
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    t.type === "ofuse" ? "bg-green-100 text-green-700" :
                    t.type === "toba" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {t.type === "ofuse" ? "お布施" : t.type === "toba" ? "塔婆料" : "その他"}
                  </span>
                  {t.household && (
                    <Link href={`/households/${t.household.id}`} className="text-indigo-600 hover:underline font-medium">
                      {t.household.name}
                    </Link>
                  )}
                  {t.description && <span className="text-gray-500 text-sm">{t.description}</span>}
                  {t.event && (
                    <Link href={`/events/${t.event.id}`} className="text-xs text-indigo-400 hover:underline">
                      📅 {t.event.title}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg font-bold">¥{t.amount.toLocaleString()}</span>
                  <span className="text-sm text-gray-400">{format(new Date(t.transactionDate), "M/d")}</span>
                </div>
              </div>
            ))}
            {data.recentTransactions.length > 0 && (
              <div className="p-4 bg-gray-50 flex justify-between items-center font-bold">
                <span>合計</span>
                <span className="text-lg text-green-700">¥{txTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
