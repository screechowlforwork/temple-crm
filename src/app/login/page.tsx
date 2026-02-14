"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function getAuthErrorMessage(errorCode: string | null): string {
  if (!errorCode) return "";

  switch (errorCode) {
    case "AccessDenied":
      return "このGoogleアカウントはログイン許可されていません";
    case "Configuration":
      return "認証設定に問題があります。管理者に連絡してください";
    default:
      return "認証に失敗しました。もう一度お試しください";
  }
}

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = getAuthErrorMessage(searchParams.get("error"));
  const showLegacyLogin = searchParams.get("legacy") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (ok) {
        router.push("/");
      } else {
        setError("ユーザー名またはパスワードが正しくありません");
      }
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setError("Googleログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">檀家CRM</h1>
        <p className="text-sm text-gray-500 text-center mb-6">お寺のお檀家管理システム</p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full border border-gray-300 bg-white text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition mb-4"
        >
          Googleでログイン
        </button>
        {(error || authError) && <p className="text-sm text-red-600 mb-3">{error || authError}</p>}

        {showLegacyLogin ? (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">管理者向け ID/パスワード</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ユーザー名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">移行期間中のみ利用（admin / admin123）</p>
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center mt-4">
            管理者のみ <Link href="/login?legacy=1" className="text-indigo-600 hover:underline">ID/パスワードログインを表示</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">読み込み中...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
