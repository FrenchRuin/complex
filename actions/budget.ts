"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return amount;
}

function parseType(value: FormDataEntryValue | null): "income" | "expense" | null {
  return value === "income" || value === "expense" ? value : null;
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const name = formData.get("name");
  const type = parseType(formData.get("type"));

  if (typeof name !== "string" || !name.trim()) {
    return { error: "카테고리 이름을 입력해주세요." };
  }
  if (!type) {
    return { error: "카테고리 종류를 선택해주세요." };
  }

  await prisma.category.create({
    data: { coupleId: profile.coupleId, name: name.trim(), type },
  });

  revalidatePath("/budget");
  return {};
}

export async function deleteCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();
  const categoryId = formData.get("categoryId");
  if (typeof categoryId !== "string") {
    return { error: "잘못된 요청입니다." };
  }

  try {
    await prisma.category.delete({ where: { id: categoryId } });
  } catch {
    return { error: "이 카테고리를 사용하는 거래가 있어 삭제할 수 없습니다." };
  }

  revalidatePath("/budget");
  return {};
}

export async function createTransaction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();
  const type = parseType(formData.get("type"));
  const amount = parseAmount(formData.get("amount"));
  const date = parseDate(formData.get("date"));
  const categoryId = formData.get("categoryId");
  const memo = formData.get("memo");

  if (!type) return { error: "수입/지출을 선택해주세요." };
  if (!amount) return { error: "금액을 올바르게 입력해주세요." };
  if (!date) return { error: "날짜를 올바르게 선택해주세요." };
  if (typeof categoryId !== "string" || !categoryId) return { error: "카테고리를 선택해주세요." };

  await prisma.transaction.create({
    data: {
      coupleId: profile.coupleId,
      categoryId,
      type,
      amount,
      date,
      memo: typeof memo === "string" && memo.trim() ? memo.trim() : null,
      createdById: profile.id,
    },
  });

  revalidatePath("/budget");
  return {};
}

export async function updateTransaction(
  transactionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();
  const type = parseType(formData.get("type"));
  const amount = parseAmount(formData.get("amount"));
  const date = parseDate(formData.get("date"));
  const categoryId = formData.get("categoryId");
  const memo = formData.get("memo");

  if (!type) return { error: "수입/지출을 선택해주세요." };
  if (!amount) return { error: "금액을 올바르게 입력해주세요." };
  if (!date) return { error: "날짜를 올바르게 선택해주세요." };
  if (typeof categoryId !== "string" || !categoryId) return { error: "카테고리를 선택해주세요." };

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId,
      type,
      amount,
      date,
      memo: typeof memo === "string" && memo.trim() ? memo.trim() : null,
    },
  });

  revalidatePath("/budget");
  return {};
}

export async function deleteTransaction(transactionId: string) {
  await requireProfile();
  await prisma.transaction.delete({ where: { id: transactionId } });
  revalidatePath("/budget");
}
