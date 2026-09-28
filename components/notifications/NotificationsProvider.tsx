"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NotificationItem } from "@/lib/calc/notifications";

type NotificationsData = {
  items: NotificationItem[];
  /** 구성원 id → 표시 이름 (알림 문장의 "○○님이") */
  names: Record<string, string>;
};

const Context = createContext<NotificationsData>({ items: [], names: {} });

export function useNotifications(): NotificationsData {
  return useContext(Context);
}

/** 레이아웃에서 한 번 불러온 알림을 사이드바·화면 헤더의 종 아이콘이 함께 쓴다 (F-17) */
export function NotificationsProvider({ value, children }: { value: NotificationsData; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
