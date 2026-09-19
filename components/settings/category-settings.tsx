"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { createCategory, deleteCategory, type ActionState } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string; type: "income" | "expense" };

const initialState: ActionState = {};

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "추가 중..." : "추가"}
    </Button>
  );
}

function AddCategoryForm() {
  const [state, formAction] = useActionState(createCategory, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="category-name">이름</Label>
        <Input id="category-name" name="name" placeholder="예: 데이트" />
      </div>
      <div className="flex flex-col gap-2 sm:w-32">
        <Label htmlFor="category-type">종류</Label>
        <Select
          name="type"
          defaultValue="expense"
          items={{ expense: "지출", income: "수입" }}
        >
          <SelectTrigger id="category-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">지출</SelectItem>
            <SelectItem value="income">수입</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AddSubmitButton />
      {state.error && <p className="text-sm text-destructive sm:basis-full">{state.error}</p>}
    </form>
  );
}

function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const [state, formAction] = useActionState(deleteCategory, initialState);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="categoryId" value={categoryId} />
      <Button type="submit" variant="ghost" size="icon-sm" aria-label="카테고리 삭제">
        <Trash2 strokeWidth={1.5} />
      </Button>
      {state.error && (
        <p className="max-w-40 text-right text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function CategorySettings({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            아직 카테고리가 없어요. 아래에서 추가해보세요.
          </p>
        )}
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{category.name}</span>
              <Badge variant={category.type === "income" ? "default" : "secondary"}>
                {category.type === "income" ? "수입" : "지출"}
              </Badge>
            </div>
            <DeleteCategoryButton categoryId={category.id} />
          </div>
        ))}
      </div>
      <AddCategoryForm />
    </div>
  );
}
