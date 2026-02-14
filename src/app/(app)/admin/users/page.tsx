"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type RoleName = "Admin" | "OfficeManager" | "Staff";

type UserItem = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: {
    name: RoleName;
  };
};

type AllowedEmailItem = {
  id: string;
  email: string;
  note: string | null;
  isActive: boolean;
  createdByUser: { id: string; displayName: string } | null;
};

const roleLabel: Record<RoleName, string> = {
  Admin: "Admin",
  OfficeManager: "OfficeManager",
  Staff: "Staff",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingAllowedEmailId, setSavingAllowedEmailId] = useState<string | null>(null);
  const [addingAllowedEmail, setAddingAllowedEmail] = useState(false);
  const [newAllowedEmail, setNewAllowedEmail] = useState("");
  const [newAllowedEmailNote, setNewAllowedEmailNote] = useState("");
  const [pendingRoles, setPendingRoles] = useState<Record<string, RoleName>>({});
  const [pendingActives, setPendingActives] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, allowlistRes] = await Promise.all([
        api.get<{ users: UserItem[] }>("/api/admin/users"),
        api.get<{ items: AllowedEmailItem[] }>("/api/admin/allowed-google-emails"),
      ]);

      setUsers(usersRes.users);
      setAllowedEmails(allowlistRes.items);
      setPendingRoles(
        Object.fromEntries(usersRes.users.map((u) => [u.id, u.role.name])) as Record<string, RoleName>
      );
      setPendingActives(
        Object.fromEntries(usersRes.users.map((u) => [u.id, u.isActive])) as Record<string, boolean>
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "管理データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  const updateRole = async (targetUser: UserItem) => {
    const nextRole = pendingRoles[targetUser.id];
    const nextIsActive = pendingActives[targetUser.id];
    const roleChanged = nextRole && nextRole !== targetUser.role.name;
    const activeChanged =
      nextIsActive !== undefined && nextIsActive !== targetUser.isActive;
    if (!roleChanged && !activeChanged) {
      return;
    }

    setSavingUserId(targetUser.id);
    setError("");
    try {
      const res = await api.patch<{ user: UserItem }>("/api/admin/users", {
        userId: targetUser.id,
        roleName: roleChanged ? nextRole : undefined,
        isActive: activeChanged ? nextIsActive : undefined,
      });

      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? res.user : u)));
      setPendingRoles((prev) => ({ ...prev, [targetUser.id]: res.user.role.name }));
      setPendingActives((prev) => ({ ...prev, [targetUser.id]: res.user.isActive }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ロール更新に失敗しました");
      setPendingRoles((prev) => ({ ...prev, [targetUser.id]: targetUser.role.name }));
      setPendingActives((prev) => ({ ...prev, [targetUser.id]: targetUser.isActive }));
    } finally {
      setSavingUserId(null);
    }
  };

  const addAllowedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAllowedEmail.trim().toLowerCase();
    if (!email) return;

    setAddingAllowedEmail(true);
    setError("");
    try {
      const res = await api.post<{ item: AllowedEmailItem }>("/api/admin/allowed-google-emails", {
        email,
        note: newAllowedEmailNote.trim() || undefined,
      });
      setAllowedEmails((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== res.item.id);
        return [res.item, ...withoutCurrent].sort(
          (a, b) => Number(b.isActive) - Number(a.isActive) || a.email.localeCompare(b.email)
        );
      });
      setNewAllowedEmail("");
      setNewAllowedEmailNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "許可メールの追加に失敗しました");
    } finally {
      setAddingAllowedEmail(false);
    }
  };

  const toggleAllowedEmail = async (item: AllowedEmailItem) => {
    setSavingAllowedEmailId(item.id);
    setError("");
    try {
      const res = await api.patch<{ item: AllowedEmailItem }>("/api/admin/allowed-google-emails", {
        id: item.id,
        isActive: !item.isActive,
      });
      setAllowedEmails((prev) =>
        prev
          .map((row) => (row.id === item.id ? res.item : row))
          .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.email.localeCompare(b.email))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "許可メールの更新に失敗しました");
    } finally {
      setSavingAllowedEmailId(null);
    }
  };

  const removeAllowedEmail = async (item: AllowedEmailItem) => {
    setSavingAllowedEmailId(item.id);
    setError("");
    try {
      await api.delete(`/api/admin/allowed-google-emails?id=${item.id}`);
      setAllowedEmails((prev) => prev.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "許可メールの削除に失敗しました");
    } finally {
      setSavingAllowedEmailId(null);
    }
  };

  if (user?.roleName !== "Admin") {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold text-red-600">権限がありません</h1>
        <p className="mt-2 text-gray-600">この画面はAdminのみ利用できます。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <p className="mt-1 text-sm text-gray-500">スタッフのロールを変更できます（Admin限定）。</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">表示名</th>
              <th className="px-4 py-3 font-medium">ユーザー名</th>
              <th className="px-4 py-3 font-medium">現在ロール</th>
              <th className="px-4 py-3 font-medium">新しいロール</th>
              <th className="px-4 py-3 font-medium">状態</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  読み込み中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  ユーザーがいません
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleChanged = pendingRoles[u.id] && pendingRoles[u.id] !== u.role.name;
                const activeChanged =
                  pendingActives[u.id] !== undefined && pendingActives[u.id] !== u.isActive;
                const changed = Boolean(roleChanged || activeChanged);
                const isSaving = savingUserId === u.id;

                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">{u.displayName}</td>
                    <td className="px-4 py-3 text-gray-600">{u.username}</td>
                    <td className="px-4 py-3">{roleLabel[u.role.name]}</td>
                    <td className="px-4 py-3">
                      <select
                        value={pendingRoles[u.id] ?? u.role.name}
                        onChange={(e) => {
                          setPendingRoles((prev) => ({
                            ...prev,
                            [u.id]: e.target.value as RoleName,
                          }));
                        }}
                        disabled={isSaving}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="Admin">Admin</option>
                        <option value="OfficeManager">OfficeManager</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {(pendingActives[u.id] ?? u.isActive) ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">有効</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">無効</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={(pendingActives[u.id] ?? u.isActive) ? "active" : "inactive"}
                          onChange={(e) => {
                            setPendingActives((prev) => ({
                              ...prev,
                              [u.id]: e.target.value === "active",
                            }));
                          }}
                          disabled={isSaving}
                          className="rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="active">有効</option>
                          <option value="inactive">無効</option>
                        </select>
                        <button
                          onClick={() => updateRole(u)}
                          disabled={!changed || isSaving}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">Googleログイン許可メール</h2>
          <p className="mt-1 text-sm text-gray-500">ここで追加したメールだけがGoogleログインできます。</p>
        </div>

        <form onSubmit={addAllowedEmail} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={newAllowedEmail}
            onChange={(e) => setNewAllowedEmail(e.target.value)}
            placeholder="user@example.com"
            type="email"
            required
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            value={newAllowedEmailNote}
            onChange={(e) => setNewAllowedEmailNote(e.target.value)}
            placeholder="備考（任意）"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={addingAllowedEmail}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {addingAllowedEmail ? "追加中..." : "許可メールを追加"}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">メールアドレス</th>
                <th className="px-3 py-2">状態</th>
                <th className="px-3 py-2">備考</th>
                <th className="px-3 py-2">追加者</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allowedEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    許可メールはまだありません
                  </td>
                </tr>
              ) : (
                allowedEmails.map((item) => {
                  const isSaving = savingAllowedEmailId === item.id;
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium">{item.email}</td>
                      <td className="px-3 py-2">
                        {item.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">有効</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">無効</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.note ?? "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{item.createdByUser?.displayName ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAllowedEmail(item)}
                            disabled={isSaving}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          >
                            {item.isActive ? "無効化" : "有効化"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAllowedEmail(item)}
                            disabled={isSaving}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
