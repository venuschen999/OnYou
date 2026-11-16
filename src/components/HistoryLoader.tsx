"use client";

import type { ReactElement } from "react";
import { HistoryScreen } from "@/components/HistoryScreen";
import { useHistoryList } from "@/hooks/useHistoryList";

export function HistoryLoader(): ReactElement {
  const history = useHistoryList();
  return <HistoryScreen {...history} />;
}
