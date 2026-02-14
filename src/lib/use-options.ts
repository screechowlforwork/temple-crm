"use client";

import { useEffect, useState } from "react";
import { api } from "./api-client";
import { ComboOption } from "@/components/ComboBox";

type HouseholdItem = { id: string; name: string; prefecture: string; city: string };
type EventItem = { id: string; title: string; eventDate: string; eventType: string };
type DeceasedItem = { id: string; lastName: string; firstName: string; posthumousName: string | null; household: { name: string } | null };

export function useHouseholdOptions() {
  const [options, setOptions] = useState<ComboOption[]>([]);
  useEffect(() => {
    api.get<HouseholdItem[]>("/api/households").then((data) =>
      setOptions(
        data.map((h) => ({
          value: h.id,
          label: h.name,
          sub: `${h.prefecture}${h.city}`,
        }))
      )
    ).catch(console.error);
  }, []);
  return options;
}

export function useEventOptions() {
  const [options, setOptions] = useState<ComboOption[]>([]);
  useEffect(() => {
    api.get<EventItem[]>("/api/events").then((data) =>
      setOptions(
        data.map((e) => ({
          value: e.id,
          label: e.title,
          sub: e.eventDate ? new Date(e.eventDate).toLocaleDateString("ja-JP") : "",
        }))
      )
    ).catch(console.error);
  }, []);
  return options;
}

export function useDeceasedOptions() {
  const [options, setOptions] = useState<ComboOption[]>([]);
  useEffect(() => {
    api.get<DeceasedItem[]>("/api/deceased").then((data) =>
      setOptions(
        data.map((d) => ({
          value: d.id,
          label: `${d.lastName} ${d.firstName}`,
          sub: [d.posthumousName, d.household?.name].filter(Boolean).join(" / "),
        }))
      )
    ).catch(console.error);
  }, []);
  return options;
}
