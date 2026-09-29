/**
 * 폼 입력·서버 액션 인자 검증 (Zod). 오류 문구는 해요체로 원인과 해결 방법을 말한다.
 */
import { z } from "zod";
import { ASSET_KINDS } from "./calc/assets";
import { CATEGORY_ICON_NAMES } from "./category-icons";
import { CATEGORY_TYPES, OWNERS, PAYMENT_KINDS, SCOPES, SLOTS } from "./domain";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "표시 이름을 입력해 주세요")
  .max(10, "표시 이름은 10자까지 쓸 수 있어요");

export const idSchema = z.uuid("잘못된 요청이에요. 새로고침 후 다시 시도해 주세요");

export const categoryInputSchema = z.object({
  type: z.enum(CATEGORY_TYPES),
  name: z
    .string()
    .trim()
    .min(1, "카테고리 이름을 입력해 주세요")
    .max(12, "카테고리 이름은 12자까지 쓸 수 있어요"),
  icon: z.enum(CATEGORY_ICON_NAMES, "아이콘을 골라 주세요"),
});

/** "신한, 삼성카드 ," → ["신한", "삼성카드"] */
const smsAliasesSchema = z
  .string()
  .transform((raw) =>
    raw
      .split(",")
      .map((alias) => alias.trim())
      .filter((alias) => alias !== ""),
  )
  .pipe(
    z
      .array(z.string().max(20, "별칭은 하나에 20자까지 쓸 수 있어요"))
      .max(10, "별칭은 10개까지 넣을 수 있어요"),
  );

export const paymentMethodInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요")
    .max(20, "이름은 20자까지 쓸 수 있어요"),
  kind: z.enum(PAYMENT_KINDS, "종류를 골라 주세요"),
  owner: z.enum(OWNERS, "소유를 골라 주세요"),
  smsAliases: smsAliasesSchema,
  /** 용돈 통장·카드 (F-21). 공동 소유면 항상 false */
  isAllowance: z.boolean(),
}).transform((v) => ({ ...v, isAllowance: v.owner !== "joint" && v.isAllowance }));

export const moveDirectionSchema = z.enum(["up", "down"]);

/** 빈 문자열은 null로 */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

/** "yyyy-MM-dd" 이고 실제로 있는 날짜 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 확인해 주세요")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "날짜를 확인해 주세요");

/** 내역 추가·수정 (F-10, F-11) */
export const transactionInputSchema = z.object({
  id: z.uuid().optional(),
  type: z.enum(CATEGORY_TYPES),
  amount: z
    .number("금액을 입력해 주세요")
    .int("금액은 원 단위로 입력해 주세요")
    .min(1, "금액을 입력해 주세요")
    .max(100_000_000_000, "금액이 너무 커요. 다시 확인해 주세요"),
  occurredOn: dateStringSchema,
  categoryId: z.uuid("카테고리를 골라 주세요"),
  merchant: optionalText(50, "가맹점·내용은 50자까지 쓸 수 있어요"),
  memo: optionalText(200, "메모는 200자까지 쓸 수 있어요"),
  paymentMethodId: z.uuid().nullable(),
  scope: z.enum(SCOPES),
  memberSlot: z.enum(SLOTS),
});

export type TransactionInput = z.input<typeof transactionInputSchema>;

/** 정기지출 등록·수정 (F-30) */
export const recurringInputSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요")
    .max(20, "이름은 20자까지 쓸 수 있어요"),
  amount: z
    .number("금액을 입력해 주세요")
    .int("금액은 원 단위로 입력해 주세요")
    .min(1, "금액을 입력해 주세요")
    .max(100_000_000_000, "금액이 너무 커요. 다시 확인해 주세요"),
  dayOfMonth: z
    .number("결제일을 입력해 주세요")
    .int("결제일은 1~31 사이 숫자로 입력해 주세요")
    .min(1, "결제일은 1~31 사이 숫자로 입력해 주세요")
    .max(31, "결제일은 1~31 사이 숫자로 입력해 주세요"),
  categoryId: z.uuid("카테고리를 골라 주세요"),
  paymentMethodId: z.uuid().nullable(),
  scope: z.enum(SCOPES),
  memberSlot: z.enum(SLOTS),
  isVariable: z.boolean(),
  hasVariableDate: z.boolean(),
});

export type RecurringInput = z.input<typeof recurringInputSchema>;

const moneySchema = (label: string) =>
  z
    .number(`${label}을 입력해 주세요`)
    .int(`${label}은 원 단위로 입력해 주세요`)
    .max(100_000_000_000_000, `${label}이 너무 커요. 다시 확인해 주세요`);

/** 자산·부채 항목 정보 (F-40). 금액은 따로 기록한다 */
export const assetInfoSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(30, "이름은 30자까지 쓸 수 있어요"),
  kind: z.enum(ASSET_KINDS, "종류를 골라 주세요"),
  owner: z.enum(OWNERS, "소유를 골라 주세요"),
  isLiability: z.boolean(),
  memo: z
    .string()
    .trim()
    .max(200, "메모는 200자까지 쓸 수 있어요")
    .transform((v) => (v === "" ? null : v)),
});
export type AssetInfoInput = z.input<typeof assetInfoSchema>;

/** 금액 기록: 언제 기준 얼마 */
export const assetValueSchema = z.object({
  amount: moneySchema("금액").min(0, "금액을 확인해 주세요"),
  asOf: dateStringSchema,
});
export type AssetValueInput = z.input<typeof assetValueSchema>;

/** 저축 목표 (F-42) */
export const goalInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "목표 이름을 입력해 주세요").max(30, "목표 이름은 30자까지 쓸 수 있어요"),
  targetAmount: moneySchema("목표액").min(1, "목표액을 입력해 주세요"),
  dueDate: dateStringSchema.nullable(),
});
export type GoalInput = z.input<typeof goalInputSchema>;

/** 적립 (F-42) */
export const contributionInputSchema = z.object({
  goalId: z.uuid(),
  amount: moneySchema("금액").min(1, "금액을 입력해 주세요"),
  contributedOn: dateStringSchema,
  memberSlot: z.enum(SLOTS),
});
export type ContributionInput = z.input<typeof contributionInputSchema>;

/** 공유 메모 (F-18). 빈 항목은 저장 전에 뺀다 */
export const noteInputSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(["text", "checklist"]),
    body: z.string().max(5000, "메모는 5,000자까지 쓸 수 있어요"),
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          text: z.string().trim().max(200, "항목 하나는 200자까지 쓸 수 있어요"),
          done: z.boolean(),
        }),
      )
      .max(100, "항목은 100개까지 넣을 수 있어요")
      .transform((items) => items.filter((item) => item.text !== "")),
  })
  .refine((note) => note.body.trim() !== "" || note.items.length > 0, "메모 내용을 입력해 주세요");
export type NoteInput = z.input<typeof noteInputSchema>;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시각을 다시 골라 주세요");

/** 공유 일정 (F-19) */
export const eventInputSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, "일정 이름을 입력해 주세요").max(50, "일정 이름은 50자까지 쓸 수 있어요"),
    memo: z.string().max(1000, "메모는 1,000자까지 쓸 수 있어요"),
    owner: z.enum(OWNERS),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    allDay: z.boolean(),
    startTime: timeSchema.nullable(),
    endTime: timeSchema.nullable(),
    repeat: z.enum(["none", "weekly", "monthly", "yearly"]),
    repeatUntil: dateStringSchema.nullable(),
  })
  .refine((e) => e.endDate >= e.startDate, { message: "끝나는 날은 시작하는 날과 같거나 뒤여야 해요" })
  .refine((e) => e.allDay || e.startTime !== null, { message: "시작 시각을 골라 주세요" })
  .refine((e) => e.allDay || !e.endTime || !e.startTime || e.endDate > e.startDate || e.endTime > e.startTime, {
    message: "끝나는 시각은 시작 시각보다 뒤여야 해요",
  })
  .refine((e) => !e.repeatUntil || e.repeatUntil >= e.startDate, { message: "반복 끝나는 날은 시작하는 날 뒤여야 해요" })
  .transform((e) => ({
    ...e,
    startTime: e.allDay ? null : e.startTime,
    endTime: e.allDay ? null : e.endTime,
    repeatUntil: e.repeat === "none" ? null : e.repeatUntil,
  }));
export type EventInput = z.input<typeof eventInputSchema>;

/** "yyyy-MM-01" */
export const monthFirstSchema = dateStringSchema.refine(
  (value) => value.endsWith("-01"),
  "잘못된 요청이에요. 새로고침해 주세요",
);

/** 첫 번째 오류 문구 */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "입력값을 확인해 주세요";
}
