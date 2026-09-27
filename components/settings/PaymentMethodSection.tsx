"use client";

import { Banknote, CircleEllipsis, CreditCard, Landmark, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  movePaymentMethod,
  setPaymentMethodHidden,
} from "@/app/(app)/settings/payment-method-actions";
import { Button } from "@/components/ui/Button";
import { PersonChip } from "@/components/ui/PersonChip";
import { PAYMENT_KIND_LABEL, ownerLabel, type MemberNames, type PaymentKind } from "@/lib/domain";
import { PaymentMethodEditor, type PaymentMethodItem } from "./PaymentMethodEditor";
import { RowActions } from "./RowActions";
import { SettingsSection } from "./SettingsSection";
import { useActionRunner } from "./useActionRunner";

const KIND_ICONS: Record<PaymentKind, LucideIcon> = {
  card: CreditCard,
  account: Landmark,
  cash: Banknote,
  other: CircleEllipsis,
};

type Props = { methods: PaymentMethodItem[]; names: MemberNames };

/** 계좌·카드 관리 (F-51) */
export function PaymentMethodSection({ methods, names }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useActionRunner();
  const list = [...methods].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SettingsSection
      title="계좌·카드"
      description="소유가 공동이면 내역의 기본 구분이 공동, 아니면 그 사람의 개인이 돼요."
    >
      <ul>
        {list.map((method, index) => {
          if (editing === method.id) {
            return (
              <li key={method.id} className="py-2">
                <PaymentMethodEditor names={names} method={method} onDone={() => setEditing(null)} />
              </li>
            );
          }
          const Icon = KIND_ICONS[method.kind];
          const details = [
            PAYMENT_KIND_LABEL[method.kind],
            method.sms_aliases.length > 0 ? `별칭 ${method.sms_aliases.join(", ")}` : null,
            method.is_hidden ? "숨김" : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={method.id}
              className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
            >
              <span
                aria-hidden
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink ${method.is_hidden ? "opacity-50" : ""}`}
              >
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-body ${method.is_hidden ? "text-ink-muted" : "text-ink"}`}
                >
                  {method.name}
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-2">
                  <PersonChip owner={method.owner} label={ownerLabel(method.owner, names)} />
                  <span className="truncate text-caption text-ink-muted">{details}</span>
                </span>
              </span>
              <RowActions
                itemName={method.name}
                isFirst={index === 0}
                isLast={index === list.length - 1}
                hidden={method.is_hidden}
                disabled={pending}
                onMove={(direction) => run(() => movePaymentMethod(method.id, direction))}
                onEdit={() => setEditing(method.id)}
                onToggleHidden={() => run(() => setPaymentMethodHidden(method.id, !method.is_hidden))}
              />
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        {editing === "new" ? (
          <PaymentMethodEditor names={names} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="secondary" onClick={() => setEditing("new")} className="w-full">
            계좌·카드 추가
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
