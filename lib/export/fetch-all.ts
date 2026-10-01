/** Supabase는 한 번에 최대 1000줄까지 준다. 내보내기(F-52)는 전체가 필요해 1000줄씩 이어서 읽는다 */
export const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/** page(from, to)는 `.order(…).range(from, to)`를 붙인 쿼리. 순서가 고정돼야 쪽이 겹치거나 빠지지 않는다 */
export async function fetchAll<T>(what: string, page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
