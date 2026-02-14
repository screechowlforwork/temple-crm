"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

export type ComboOption = {
  value: string;
  label: string;
  sub?: string;
};

type Props = {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  allowFreeText?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function ComboBox({
  options,
  value,
  onChange,
  placeholder = "選択してください",
  label,
  allowFreeText = false,
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label || "";

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sub && o.sub.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        onClick={handleOpen}
        className={`flex items-center justify-between border rounded-xl px-4 py-3 text-base cursor-pointer transition
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-indigo-400"}
          ${open ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-300"}`}
      >
        <span className={displayText ? "text-gray-900" : "text-gray-400"}>
          {displayText || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
          <ChevronDown size={18} className="text-gray-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 検索..."
              className="w-full px-3 py-2 text-base border rounded-lg outline-none focus:border-indigo-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowFreeText && search && filtered.length === 0) {
                  e.preventDefault();
                  handleSelect(search);
                }
              }}
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 && !allowFreeText && (
              <div className="px-4 py-3 text-sm text-gray-400">
                該当なし
              </div>
            )}
            {filtered.length === 0 && allowFreeText && search && (
              <button
                type="button"
                onClick={() => handleSelect(search)}
                className="w-full text-left px-4 py-3 text-base hover:bg-indigo-50 text-indigo-600 font-medium"
              >
                「{search}」を新規追加
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-4 py-3 text-base hover:bg-indigo-50 transition
                  ${o.value === value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-800"}`}
              >
                <div>{o.label}</div>
                {o.sub && (
                  <div className="text-xs text-gray-400 mt-0.5">{o.sub}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
