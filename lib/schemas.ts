/**
 * 폼 입력·서버 액션 인자 검증 (Zod). 오류 문구는 해요체로 원인과 해결 방법을 말한다.
 */
import { z } from "zod";
import { CATEGORY_ICON_NAMES } from "./category-icons";
import { CATEGORY_TYPES, OWNERS, PAYMENT_KINDS } from "./domain";

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
});

export const moveDirectionSchema = z.enum(["up", "down"]);

/** 첫 번째 오류 문구 */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "입력값을 확인해 주세요";
}
