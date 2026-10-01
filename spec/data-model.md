# 데이터 구조 (§5)

> `SPEC.md`(목차)의 일부. 원래 절 번호를 그대로 둔다.

## 5. 데이터 구조 (Supabase Postgres)

공통: 모든 테이블 `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. 가구 소속 테이블은 `household_id uuid not null`.

### 5.1 MVP 테이블

**households**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| name | text | 가구 이름 (기본 "우리 둘 가계부") |

**members**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| user_id | uuid fk → auth.users | unique |
| slot | text | `'a'` 또는 `'b'`, (household_id, slot) unique |
| display_name | text | 표시 이름 |
| avatar_path | text null | 프로필 사진의 storage 경로 (2026-09-28 추가) |

**invites**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| token | text unique | 추측 불가능한 랜덤 문자열 |
| created_by | uuid fk → members | |
| expires_at | timestamptz | 생성 + 7일 |
| used_at | timestamptz null | |

**categories**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| type | text | `'expense'` / `'income'` |
| name | text | (household_id, type, name) unique |
| icon | text | Lucide 아이콘 이름 |
| sort_order | int | |
| is_hidden | bool | 기본 false |

**payment_methods**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| name | text | "가족카드", "생활비 통장" |
| kind | text | `'card'` / `'account'` / `'cash'` / `'other'` |
| owner | text | `'joint'` / `'a'` / `'b'` |
| sms_aliases | text[] | 문자 인식용 별칭 (2차) |
| sort_order | int | |
| is_hidden | bool | |

**transactions**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| type | text | `'expense'` / `'income'` |
| amount | bigint | 양수, 원 |
| occurred_on | date | 거래 날짜 (KST) |
| occurred_time | time null | 문자에서 인식한 시간 |
| category_id | uuid fk | |
| merchant | text null | 가맹점·내용 |
| memo | text null | |
| payment_method_id | uuid fk null | |
| scope | text | `'joint'` / `'personal'` |
| member_slot | text | `'a'` / `'b'` — 개인이면 누구의 지출, 공동이면 누가 결제 |
| source | text | `'manual'` / `'sms'` / `'recurring'` / `'import'` |
| recurring_item_id | uuid fk null | |
| recurring_month | date null | 해당 월 1일. (recurring_item_id, recurring_month) unique |
| import_batch_id | — | 가져오기 제외로 만들지 않음 |
| created_by / updated_by | uuid fk → members | |
| updated_at | timestamptz | |
| deleted_at | timestamptz null | 소프트 삭제 |

인덱스: `(household_id, occurred_on)`, `(household_id, deleted_at)`.

**recurring_items**
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| name | text | |
| amount | bigint | 기본 금액 |
| day_of_month | int | 1~31 |
| category_id | uuid fk | |
| scope / member_slot | text | transactions와 동일 |
| payment_method_id | uuid fk null | |
| is_variable | bool | 매달 금액이 다름 |
| has_variable_date | bool | 매달 결제일도 다름 (2026-09-28 추가) |
| start_month | date | 이 달부터 표시 (1일) |
| end_month | date null | 이 달까지 표시 (중지한 달, 1일). null이면 계속. (`is_active` 대신) |

### 5.2 2차 테이블

- **budgets**: `household_id`, `month date`(1일), `category_id`, `amount bigint`. (household_id, month, category_id) unique.
- **spend_budgets** (2026-09-29, 통장·카드 예산): `household_id`, `name`, `sort_order`, `deleted_at`. **spend_budget_methods**: `budget_id`, `payment_method_id` unique(한 결제수단은 한 예산). **spend_budget_amounts**: `budget_id`, `month date`(1일), `amount bigint`, (budget_id, month) unique. RLS는 같은 가구, `ensure_month_budgets()`가 지난달 금액도 복사한다.
- (없앰) `allowances`, `payment_methods.is_allowance`: 같은 날 통장·카드 예산으로 옮기고 지웠다.
- **merchant_rules**: `household_id`, `merchant_key text`(정규화된 가맹점), `category_id`, `updated_at`. (household_id, merchant_key) unique.
- ~~settlements~~: 정산 제거로 삭제 (2026-09-27).
- ~~import_batches~~: 가져오기 제외로 만들지 않음 (2026-09-27).

### 5.3 3차 테이블

- **assets**: `household_id`, `name`, `kind`, `owner`(`'joint'`/`'a'`/`'b'`), `amount bigint`, `is_liability bool`, `memo`, `updated_at`, `value_as_of date`. `amount`·`value_as_of`는 가장 최근 금액 기록을 DB가 복사해 둔다.
- **asset_values**: `household_id`, `asset_id`, `as_of date`, `amount bigint`, `created_by`, `deleted_at`. 지우지 않은 것 중 (asset_id, as_of) unique. 쓰기는 `set_asset_value()`, 지우기는 `delete_asset_value()`.
- ~~net_worth_snapshots~~: 금액 기록 방식으로 바꾸며 삭제 (2026-09-28).
- **goals**: `household_id`, `name`, `target_amount`, `due_date null`, `is_done`.
- **goal_contributions**: `goal_id`, `amount`, `contributed_on`, `member_slot`.

### 5.4 권한 (RLS)

- 헬퍼 함수 `my_household_id()`: 현재 `auth.uid()`의 members.household_id.
- 모든 가구 소속 테이블: `household_id = my_household_id()`인 행만 select/insert/update/delete.
- members: 같은 가구 구성원만 조회, 자기 행의 display_name만 수정.
- invites: 같은 가구만 생성·조회. 초대 수락은 서버 함수(RPC, security definer)로 처리: 토큰 유효성·만료·인원 확인 후 members에 추가.
- notifications: 받는 사람(`recipient_id`)만 조회하고, 바꿀 수 있는 칸은 `read_at`뿐. 만들기·지우기는 사용자에게 막혀 있다 (2026-09-28).
- 허용 이메일 확인은 서버(로그인 서버 액션과 미들웨어)에서 한다.

### 5.5 개선으로 추가한 테이블

**notifications** (F-17, 2026-09-28 추가)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| recipient_id | uuid fk → members | 받는 사람 |
| actor_id | uuid fk → members | 한 사람 |
| kind | text | `'created'` / `'updated'` / `'deleted'` / `'restored'` / `'recurring_paid'` / `'sms_batch'` |
| transaction_id | uuid fk null | 문자 묶음(`sms_batch`)은 null |
| occurred_on | date null | 알림을 만든 때의 거래 날짜 (문자 묶음은 가장 이른 날짜) |
| subject | text null | 가맹점, 없으면 카테고리 이름 |
| amount | bigint null | 금액 (문자 묶음은 지출 합계) |
| tx_type | text null | `'expense'` / `'income'` |
| count | int | 문자 묶음의 건수, 그 밖에는 1 |
| read_at | timestamptz null | 읽은 시각 |

인덱스: `(recipient_id, created_at desc)`. 행은 사용자가 직접 만들 수 없고 transactions의 트리거(`notify_transactions_inserted`, `notify_transaction_updated`)와 notes의 트리거(`notify_note_changed`)만 만든다. 메모 알림은 `kind`가 `'note_created'` / `'note_updated'` / `'note_deleted'` / `'note_restored'`이고 `note_id`(uuid fk null)를 채운다. 일정 알림은 `'event_created'` / `'event_updated'` / `'event_deleted'` / `'event_restored'`이고 `event_id`와 `occurred_on`(일정 시작일)을 채운다 (events의 트리거 `notify_event_changed`).

**notes** (F-18, 2026-09-28 추가)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| kind | text | `'text'` / `'checklist'` |
| body | text | 글 메모의 내용, 체크리스트의 제목 (5,000자까지) |
| items | jsonb | 체크리스트 항목 `[{id, text, done}]` (100개까지) |
| is_pinned | bool | 고정 |
| created_by / updated_by | uuid fk → members | DB가 로그인한 사람으로 채운다 |
| updated_at | timestamptz | 어떤 변경이든 (정렬용) |
| edited_at | timestamptz | 내용(글·형식·항목 글자)이 바뀐 때만. 알림 기준 |
| deleted_at | timestamptz null | 소프트 삭제 |

인덱스: `(household_id, deleted_at, updated_at desc)`. 같은 가구만 조회·추가·수정, 진짜 삭제 금지.

**moods** (F-04, 2026-10-01 추가)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| member_id | uuid fk → members | 기분의 주인 |
| mood_date | date | 한국 시각 날짜, (member_id, mood_date) unique |
| mood | text | 정해진 12개 키 중 하나 (check) |
| note | text null | 한 줄 메모, 20자까지 |
| updated_at | timestamptz | |

지우기는 행을 실제로 지운다(소프트 삭제 아님, 기록용 데이터가 아니라 그날 상태라서). RLS: 같은 가구 조회, 본인 행만 쓰기. 트리거 `notify_mood_changed`가 상대에게 `kind = 'mood_set'` 알림(`subject` = 이모지 + 이름 + 메모).

**events** (F-19, 2026-09-28 추가)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| household_id | uuid fk | |
| title | text | 1~50자 (앞뒤 공백은 DB가 뺀다) |
| memo | text | 1,000자까지 |
| owner | text | `joint` / `a` / `b` |
| start_date / end_date | date | 끝 ≥ 시작, 31일까지 |
| all_day | bool | 하루 종일이면 시각 없음 |
| start_time / end_time | time null | 하루 종일이 아니면 시작 시각 필수, 같은 날이면 끝 > 시작 |
| repeat | text | `none` / `weekly` / `monthly` / `yearly` |
| repeat_until | date null | 반복 끝나는 날 (반복일 때만) |
| created_by / updated_by | uuid fk → members | DB가 로그인한 사람으로 채운다 |
| updated_at | timestamptz | |
| deleted_at | timestamptz null | 소프트 삭제 |

인덱스: `(household_id, deleted_at, start_date)`. 같은 가구만 조회·추가·수정, 진짜 삭제 금지. 반복은 한 행으로 두고 화면에서 달마다 펼친다(`lib/calc/events.ts`).

