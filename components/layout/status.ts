export const SYNC_LABEL = { connecting: "연결하는 중", online: "실시간 연결됨", offline: "연결 끊김" } as const;
/** 아바타 오른쪽 아래 상태 점: 연결됨 초록, 연결 중 회색, 끊김 속 빈 동그라미 (색만으로 구분하지 않게 모양도 다르게) */
export const DOT_STATUS = {
  online: "bg-online",
  connecting: "bg-line-strong",
  offline: "border-2 border-line-strong bg-surface-raised",
} as const;
