import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/actions/budget";
import { Button } from "@/components/ui/button";

export function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  return (
    <form action={deleteTransaction.bind(null, transactionId)}>
      <Button type="submit" variant="ghost" size="icon-sm" aria-label="거래 삭제">
        <Trash2 strokeWidth={1.5} />
      </Button>
    </form>
  );
}
