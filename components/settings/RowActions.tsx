"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { MoveDirection } from "@/lib/order";

type Props = {
  /** 버튼 이름에 붙일 항목 이름. 예: "식비 위로" */
  itemName: string;
  isFirst: boolean;
  isLast: boolean;
  hidden: boolean;
  disabled: boolean;
  onMove: (direction: MoveDirection) => void;
  onEdit: () => void;
  onToggleHidden: () => void;
};

/** 목록 행 오른쪽 버튼들: 위로, 아래로, 수정, 숨기기/보이기 */
export function RowActions({
  itemName,
  isFirst,
  isLast,
  hidden,
  disabled,
  onMove,
  onEdit,
  onToggleHidden,
}: Props) {
  // 좁은 화면에서 이름 자리를 남기려고 36px 버튼을 쓴다 (최소 터치 영역 24px 이상)
  return (
    <div className="-mr-2 flex shrink-0 items-center">
      <IconButton
        icon={ChevronUp}
        label={`${itemName} 위로`}
        disabled={disabled || isFirst}
        onClick={() => onMove("up")}
        size="sm"
      />
      <IconButton
        icon={ChevronDown}
        label={`${itemName} 아래로`}
        disabled={disabled || isLast}
        onClick={() => onMove("down")}
        size="sm"
      />
      <IconButton
        icon={Pencil}
        label={`${itemName} 수정`}
        disabled={disabled}
        onClick={onEdit}
        size="sm"
      />
      <IconButton
        icon={hidden ? Eye : EyeOff}
        label={hidden ? `${itemName} 다시 보이기` : `${itemName} 숨기기`}
        disabled={disabled}
        onClick={onToggleHidden}
        size="sm"
      />
    </div>
  );
}
