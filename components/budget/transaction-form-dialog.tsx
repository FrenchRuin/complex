"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTransaction,
  updateTransaction,
  type ActionState,
} from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Category = { id: string; name: string; type: "income" | "expense" };

type TransactionInput = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string; // yyyy-mm-dd
  categoryId: string;
  memo: string | null;
};

const initialState: ActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "저장 중..." : label}
    </Button>
  );
}

export function TransactionFormDialog({
  categories,
  transaction,
  trigger,
}: {
  categories: Category[];
  transaction?: TransactionInput;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">(
    transaction?.type ?? "expense",
  );
  const action = transaction
    ? updateTransaction.bind(null, transaction.id)
    : createTransaction;
  const [state, formAction] = useActionState(action, initialState);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (!state.error) {
      setOpen(false);
    }
  }

  const categoriesForType = categories.filter((c) => c.type === type);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setType(transaction?.type ?? "expense");
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent key={open ? "open" : "closed"}>
        <DialogHeader>
          <DialogTitle>{transaction ? "거래 수정" : "거래 추가"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">수입/지출</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(value) => setType(value as "income" | "expense")}
              items={{ expense: "지출", income: "수입" }}
              required
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">지출</SelectItem>
                <SelectItem value="income">수입</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">카테고리</Label>
            {categoriesForType.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                이 종류의 카테고리가 없어요. 먼저 카테고리 관리에서 추가해주세요.
              </p>
            ) : (
              <Select
                key={type}
                name="categoryId"
                defaultValue={
                  transaction?.type === type ? transaction.categoryId : undefined
                }
                items={Object.fromEntries(
                  categoriesForType.map((category) => [category.id, category.name]),
                )}
                required
              >
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesForType.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">금액 (원)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={1}
              defaultValue={transaction?.amount}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transaction?.date}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="memo">메모</Label>
            <Input id="memo" name="memo" defaultValue={transaction?.memo ?? ""} />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <SubmitButton label={transaction ? "수정" : "추가"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
