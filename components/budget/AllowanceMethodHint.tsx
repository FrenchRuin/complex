import Link from "next/link";

/** 용돈 통장·카드를 아직 하나도 정하지 않았을 때: 어디서 정하는지 안내 */
export function AllowanceMethodHint() {
  return (
    <p className="mt-3 rounded-sm bg-primary-soft px-4 py-3 text-caption text-ink">
      용돈은 용돈 통장·카드로 쓴 금액만 세요.{" "}
      <Link href="/settings/payment-methods" className="font-semibold text-primary underline-offset-4 hover:underline">
        설정 → 계좌·카드에서 용돈 통장·카드를 표시해 주세요
      </Link>
    </p>
  );
}
