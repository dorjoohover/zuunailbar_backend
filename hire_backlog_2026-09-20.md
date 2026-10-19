# Hire — 15 асуудлын нэгдсэн шинжилгээ ба roadmap

Огноо: 2026-09-20 (3-р шинэчлэл: №14, №15 нэмэв). Төлөв: зөвхөн шинжилгээ — код, DB, repo-н файл огт өөрчлөөгүй (hire_report-ийн туршилтын merge-г түр хуулбар дээр хийж устгасан). Дараагийн сессүүд энэ жагсаалтаар ажиллана.

Дугаарлалт: №1–№8 = эхний жагсаалт; №9–№13 = хоёр дахь жагсаалт (1→№9 автомат тест, 2→№10 ачааллын тест, 3→№11 admin-аас хяналт, 4→№12 documentation, 5→№13 performance / DB / flow өөрчлөх боломж); №14–№15 = гурав дахь жагсаалт (1→№14 recalculate / regenerate / upload endpoint, 2→№15 API-г report / web / admin VPS ба цөөн IP-аас л хандах болгох).

Хэмжээ: S = хагас өдрөөс бага, M = ~1 өдөр, L = 2+ өдөр.

Код лавлагаа (2026-09-20, шалгасан): core `feature/v1.2.0` (0642641, origin-той ижил, цэвэр), web `feature/v1.1.0` (d83ad00), admin `feature/v1.1.0` (62dac57), studio `dev` (8d5585f), hire_report `main` (d5d06b7) БА `feature/v1.2.0` (38cb574) — хоёр нь салсан, доорх A1-ийг үз. Мөрийн дугаар ойролцоо — ажил эхлэхэд дахин шалга.

## Нэгдсэн roadmap

Гол санаа: эхлээд "аюулгүй ажиллах суурь" (аюулгүй орчин, тест, migration, хяналт, doc) тавьж, дараа нь бүтээгдэхүүний засваруудыг тестээр нь, doc-той нь хийнэ. Багц 1-ээс эхлээд PR бүр = тест + feature doc (№12 загвар) + DDL байвал migration (№13) + харах metric (№11).

| Багц | Ажил | Хэмжээ | Яагаад энэ байрлалд |
|------|------|--------|---------------------|
| 0. Deploy-ын долоо хоног | A1–A7 pre-flight / post-deploy; 0.3 + 0.4 нээлттэй endpoint-ын нүхнүүдийг хаах (`checkPayment`, `userAnswer/report/*`, файл уншихын path traversal, `POST /report`, `POST /qpay`, hire_report `GET /check`); `recalculate` / `regenerate`-г `@Public`-с `@ADMINS()` болгох (УСТГАХГҮЙ — №14); №15-P0 (Traefik access log + ops path-ийг IP allowlist-д); `reportPrice` = 0 хэвээр; core/report CI-д `:<sha>` tag; `ops`-г git болгох | S–M | Prod-д одоо нээлттэй эсвэл эрсдэлтэй зүйлс; бусад бүх ажил үүн дээр тулна |
| 1. Суурь | №1 local-prod + SAFE_MODE; №9-L0 (jest засвар + CI test gate); №13-A (migrations, индекс, pg_stat_statements); №12 (docs repo, загвар, PR template, v1.1.0 / v1.2.0 release note); №11-P1 (унших-л monitor, super_admin); №7-P1 + 0.2 (гацалтын хамгийн бага засвар + N+1); №10 скрипт + baseline; №14 (OpsModule: recalculate / regenerate / upload / retry + audit); №15-P1 → P2 (browser-оос API-г шууд дуудахыг зогсоох, дотоод URL, дараа нь IP allowlist идэвхжүүлэх) | ~9M | Хэмжилт + аюулгүй орчин + тест + migration нь дараагийн бүх ажлыг аюулгүй болгоно; №7-P1 / 0.2 нь prod-д өнөөдөр алдагдал үүсгэж байна; №14 / №15 нь prod-ын гараар засах хэрэгсэл ба сүлжээний хамгаалалт |
| 2. Бүтээгдэхүүн A | №2 (finish endpoint, дүрмийн шалгалт) → №3 (үргэлжлүүлэх: тогтвортой shuffle, `examDetail` unique, серверийн цаг) | M + L | №3 нь №2-ын finish endpoint болон migration-д тулна |
| 3. Бүтээгдэхүүн B | №4 + №6 (төлбөр / үнэгүй үр дүн / жишээ тайлан) → №5 (/result товч) → №8 (эрх нэмэх) | M + S + M | 0.3 хаагдсаны дараа л paywall-ыг бодитоор асаана |
| 4. Масштаб | №10 бүрэн ачаалал (baseline-тэй харьцуулна) → №7-P2 (reconciler, retry, calc / PDF салгалт, API / worker салгалт) → №13-B (баримтад суурилсан оновчлол) → №11-P2 / P3 (flow_event, алерт) → №9 L2–L4; №15-P3 (VPS хоорондын private network / TLS, service-to-service key) | L | Хэмжилтгүйгээр оновчлол хийхгүй |

Хамаарал:

- №1 → №9, №10 (орчин, fake provider, seed).
- №13-A (migration) → №2 (`questionRule` DDL), №3 (`examDetail` unique, цаг), №4/№6 (`userService.showResult`), №11-P2 (`flow_event`), шинэ индексүүд.
- 0.3 (+ 0.4) → №4/№6 (paywall-ыг асаахаас өмнө).
- №2 (finish endpoint) → №3 → №5.
- №7-P1 + 0.2 → №10 (хэмжилт) → №7-P2, №13-B.
- №11-P1 ба №12 нь бусдаас хамаарахгүй — эхлээд хийнэ (№12-ын загварыг бусад бүх ажил ашиглана).
- №15-P0 (access log-ийн өгөгдөл) + №15-P1 (web / admin-ийн код) → №15-P2 (allowlist идэвхжүүлэх). P0 нь өөр юунаас ч хамаарахгүй, өнөөдөр эхэлж болно.
- №14 ↔ №15: ops path-уудыг (`recalculate` / `regenerate`, дараа нь `/ops/*`) эхлээд IP-ээр хааж (№15-P0-b), дараа нь №14-ийн auth-тай endpoint болгоно. №14-ийн upload endpoint нь 0.4(a)-ийн файлын нэр цэвэрлэх засварыг ашиглана.
- №14 → №7-P2 (retry endpoint нэг), №11 (audit, админ UI-ийн товч); №9 (ops endpoint-ийн эрхийн тест).

## A. Deploy хийх багц — pre-flight ба post-deploy (2026-09-20)

Deploy багц (хэрэглэгчийн өгсөн): core `feature/v1.2.0`, web `feature/v1.1.0`, admin `feature/v1.1.0`, studio `dev`, report "хамгийн сүүлийн update". Энэ нь өмнөх 0.1 (branch / deploy зөрүү)-г шийдэж байна: core v1.2.0 нь web-ийн paywall UI (`ReportPaywall.js`, `api/reportAccess.js`, `Completion.js`) ба admin-ийн `Settings.js` (paywall тохиргоо)-той нийцтэй. Үлдсэн эрсдэлүүд доор — git, файл, `git merge` туршилтаар баталгаажуулсан; prod-ын бодит `.env` / image-г харж чадаагүй тул "prod дээр шалга" гэсэн зүйлсийг хэрэглэгч өөрөө шалгана.

### A1. hire_report: `main` ба `feature/v1.2.0` салсан, нэг нь нөгөөгөө агуулаагүй (Өндөр)

Олдвор (git):

- Хоёр branch `eabe84c` (2026-03-24)-с салсан. `main` дээр 67 commit (сүүлийнх 08/20), `feature/v1.2.0` дээр 12 commit (сүүлийнх 09/03).
- Зөвхөн `feature/v1.2.0` дээр: `PdfTemplate` / `AssessmentVariable` entity + DAO, `src/pdf/dynamic-template.renderer.ts`, `pdf.services.ts` дахь "тухайн assessment дээр идэвхтэй Studio загвар байвал түүгээр зурна, үгүй бол hardcoded renderer" логик (~L425–460), `showResultOnComplete` / `blockNavigation` entity талбар.
- Зөвхөн `main` дээр: 08/08 `eee309b` (worker алдааг rethrow → retry дуусахад FAILED тэмдэглэнэ), `2c7df73` (S3 creds шалгалт), AI тайлан (`pdf/reports/ai.ts`), `worker.ts`, 08/12–08/20-ын `update`-үүд (semut, visualization, constants, entity).
- Үр дагавар: `main`-г deploy хийвэл Studio-оор "Ашиглах" (isActive) хийсэн загвар үл тоогдож хуучин hardcoded PDF гарна (`main` дээр `pdf_template`-г огт уншдаггүй — `git grep`-ээр шалгасан). Зөвхөн одоо байгаа тайлангуудаа хэвээр гаргах бол `main` хангалттай; Studio загварыг prod-д ашиглах бол v1.2.0-ийн report код заавал хэрэгтэй. Харин `feature/v1.2.0`-г шууд deploy хийвэл `eee309b` (FAILED тэмдэглэх) алдагдаж №7-ын гацалт дахин гүнзгийрнэ.
- Туршилт (түр хуулбар дээр, repo-д хүрээгүй): `main` дотор `feature/v1.2.0`-г merge хийхэд 5 файл conflict: `.github/workflows/docker-dev.yml` (2 hunk), `src/app.service.ts` (1), `src/file.service.ts` (1), `src/pdf.services.ts` (1, report-type dispatch), `src/pdf/reports/semut.ts` (14). Бусад нь автоматаар нэгдсэн.
- Env нэр зөрнө: `main` нь `AWS_ACCESS_KEY` / `AWS_SECRET_KEY`, `feature/v1.2.0` нь `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (06/17 commit `4cd0996`) уншина. Local `hire_report/.env` `main`-ийн нэрийг ашиглаж байна. Merge хийхдээ хоёр нэрийг хоёуланг нь дэмжих, эсвэл report VPS-ийн `.env`-г шинэчил.
- CI: `main` → `:main`, `feature/v1.2.0` → `:feature-v1.2.0`; `ops/report-vps/docker-compose.yml` `:main`-г заана.

Хийх:

- [ ] Шийд: (санал) `main`-с `release/v1.2.0` салгаж `feature/v1.2.0`-г merge хий, conflict-ыг гараар шийд (`semut.ts`-д хоёр талын өөрчлөлтийг хар), CI-д тэр branch-ийн tag нэм, compose-д тэрийг зааж deploy, дараа нь `main` руу буцаа.
- [ ] Яаралтай бол түр: `main`-г deploy хийж, Studio загварыг prod-д идэвхжүүлэхгүй (isActive хийхгүй).
- [ ] Merge-ийн дараа SEMUT, CORRECT, HADS тайлан тус бүрийг гараар нэг нэгээр шалга (`formule-parity` тест — 0.2).

### A2. core-ийн image tag (Өндөр, S)

`ops/core-vps/docker-compose.yml` `core` нь `hire_backend_core:feature-v1.1.0`-г заана, харин CI зөвхөн `:feature-v1.2.0` build хийнэ. Compose-оо солихгүй бол v1.1.0 үлдэнэ (web-ийн `exam/access` ба paywall-ын backend байхгүй). web / admin-ийн tag (`feature-v1.1.0`) CI-тэй таарна.

- [ ] compose-д `feature-v1.2.0` болгож `docker compose pull core && docker compose up -d core`; `docker ps --format '{{.Names}}  {{.Image}}'`-ээр бодит tag-г баталгаажуул.

### A3. `JWT_SECRET` (Өндөр, S)

- v1.2.0 `src/auth/constants.ts`: `JWT_SECRET` env байхгүй ба `NODE_ENV === 'production'` бол process эхлэхдээ throw хийнэ (crash-loop). `NODE_ENV` production биш эсвэл тохируулаагүй бол зөвхөн `console.warn` хийж хуучин hard-coded default secret-ээр ажиллана (репо унших хэн ч JWT хуурамчаар үүсгэж болох хуучин нүх).
- core `Dockerfile` `NODE_ENV`-г тохируулдаггүй (зөвхөн `CMD ["node","dist/main.js"]`) → prod-ын `.env`-д байгаа эсэхээс хамаарна.
- Deploy-оос өмнө prod `.env`-д `JWT_SECRET`, `NODE_ENV` байгааг шалга (утгыг хэвлэхгүй, жишээ нь `grep -c '^JWT_SECRET=' .env`). Байхгүй бол: (i) шууд шинэ секрет тавибал БҮХ token хүчингүй болно (шалгалт өгч буй хүмүүсийн exam-token унана) → ачаалал багатай цагт хий, эсвэл (ii) одоо ажиллаж байгаа утгыг тавьж deploy хийгээд, secret-ийг дараа нь тусад нь rotate хий.
- Шинэ env: `AI_AGENT_KEY` (Studio-ийн AI endpoint-ууд; байхгүй бол тэдгээр 401 өгнө, deploy-г эвдэхгүй), `QPAY_REPORT_CALLBACK` (байхгүй бол зөвхөн polling-оор төлбөр шалгана), `REPORT_VIEW_GRACE_MINUTES` (default 30).

### A4. studio (Дунд, S)

- `ops/core-vps/docker-compose.yml`-д studio service БАЙХГҮЙ (traefik, pgbouncer, postgres, redis, core, web, admin, pgbackup). CI `dev` → `ghcr.io/dorjoohover/hire_studio:dev`. Studio-г хаана ажиллуулж байгаа нь repo-с харагдахгүй (Vercel эсвэл өөр VPS байж болно).
- `NEXT_PUBLIC_API_URL` нь Next.js-д build үед код руу шингэдэг ба studio-д 15 газар `process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/"` гэж ашиглагддаг. Dockerfile-д `ARG` байхгүй, CI-д `build-args` байхгүй → CI-д build хийсэн image `localhost:5050` руу залгана. Vercel бол env-г build-ээс өмнө тохируул; Docker бол `ARG NEXT_PUBLIC_API_URL` + `build-args` нэм.
- Бусад env: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AI_API_URL` (AI generate route). Studio-д нэвтрэх role: 10, 40, 50 (`middleware.ts`).

### A5. DDL — автоматаар ба гараар (Дунд)

- core эхлэхэд `src/database/sql/perf-bootstrap.ts` идемпотент DDL-ийг (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TYPE … ADD VALUE IF NOT EXISTS 'FAILED'`) ажиллуулна. v1.2.0-д нэмэгдсэн: `assessment.reportFreeViews / reportPdfPaid / reportPrice`, `exam.reportViewCount / reportViewedAt`, `report_access` (+ 3 индекс), `idx_resultdetail_resultid`. `pdf_template`, `assessment_ai_data`, `assessment_variable` DDL нь өмнөх хувилбараас бий. Бүгд нэмэгдэх (additive) → core-г буцаахад (rollback) хуучин код ажиллана.
- Алдаа гарвал app унахгүй: зөвхөн `⚠️  perf-bootstrap statement failed:` гэж лог хийж, `✅ Perf bootstrap … checked`-г үргэлж хэвлэнэ → deploy-ын дараа энэ мөрийг ЗААВАЛ grep хий.
- 2026-06-17 prod dump-д `questionRule` хүснэгт ба `report_logs.error` багана БАЙСАН → эдгээр deploy-д эрсдэл биш (§2 (5) нь зөвхөн шинэ хоосон DB-д хамаарна).
- Repo-д DDL-гүй, гараар хийгдсэн байж болзошгүй өөрчлөлтүүд: FK `ON DELETE` (CASCADE / SET NULL) — entity-д (`assessment.formule`, `transaction`, `question.answer*`) бий, харин v1.2.0-д `fix_assessment_delete_fk_2.sql`, `fix_answer_category_fk.sql` скриптүүд устгагдсан. Prod-д хэрэглэгдсэн эсэхийг доорх "Хэрэгтэй шалгалтууд"-ын SQL-ээр шалга (assessment устгахад алдаа гарахгүй байх нөхцөл).

### A6. Paywall-ыг асаахгүй (Өндөр)

`assessment.reportPrice` default 0 → paywall идэвхгүй, deploy өөрөө төлбөр асаахгүй. Гэхдээ 0.3-ын нүхнүүд (доор) хаагдтал ямар ч assessment дээр `reportPrice > 0` тавихгүй.

### A7. Дараалал, rollback, баталгаажуулалт

Дараалал: (1) core (DDL + FAILED enum бэлэн болно) → (2) report (worker FAILED бичихийн тулд) → (3) web / admin (paywall UI нь core-ийн `report-access`-ыг шаардана) → (4) studio.

Rollback: web / admin image-д `:<sha>` tag бий (CI). core ба report-д БАЙХГҮЙ (зөвхөн mutable tag) → deploy-оос өмнө одоогийн digest-г тэмдэглэ (`docker inspect --format '{{.Image}} {{.Config.Image}}' <container>`). Урт хугацаанд core / report CI-д `${{ github.sha }}` tag нэм (нэг мөр). DDL нэмэгдэх төрлийн тул core-г хуучин image руу буцаахад DB-г буцаах шаардлагагүй.

Smoke (deploy-н дараа ~10 минут):

1. core лог: `Database Connected Successfully`, `Perf bootstrap … checked` байна, `perf-bootstrap statement failed` ГАРААГҮЙ.
2. `\dT+ report_logs_status_enum`-д `FAILED`; `\d report_access`; `\d assessment`-д `reportPrice`.
3. `GET https://api.hire.mn/api/v1` → 200.
4. Public QR-аар туршилтын шалгалт өг → дуусга → `report_logs` COMPLETED → PDF нээгдэнэ (report-ийн сонгосон branch-аар; Studio загвартай assessment дээр мөн шалга).
5. Studio нээгдэж загварын жагсаалт ачаалагдана (API URL зөв).
6. 30 минут `error_logs`-г, мөн `report_logs`-д `STARTED / WRITING / CALCULATING` төлөвт 10+ минут гацсан мөр байгаа эсэхийг хар.

## 0. Хамгийн түрүүнд засах зүйлс

### 0.1 Branch ба deploy зөрүү — ШИЙДЭГДСЭН

Хэрэглэгч deploy багцыг тодорхойлсон (core v1.2.0, web / admin v1.1.0, studio dev, report latest). Үлдсэн эрсдэлүүд A хэсэгт (A1 hire_report branch, A2 image tag, A3 JWT_SECRET, A4 studio env).

### 0.2 hire_report-ийн гүйцэтгэлийн засвар git-ээс алдагдсан (Өндөр, M — дахин хийх)

Олдвор:
- Memory-д (`report_calc_performance`) 2026-09-06-нд N+1 засвар (`loadFormulas`, `buildCategoryCache`, `shapeRows`, chunk INSERT) хийсэн гэж бичигдсэн. Одоогийн repo-д ЭНЭ БАЙХГҮЙ: `git grep shapeRows` ямар ч branch-д олдохгүй; `src/daos/formule.dao.ts` мөр бүрд `answerCategoryDao.findOne`/`questionCategoryDao.findOne` дуудсан хэвээр; `src/daos/result.dao.ts` detail-ыг нэг нэгээр `save` хийсэн хэвээр.
- `git reflog`: 2026-09-13 02:09 (+08) `reset: moving to HEAD`, дараа нь `checkout: feature/v1.2.0 → main` — commit хийгээгүй өөрчлөлт устсан. Зөвхөн untracked `test/formule-parity.ts` үлдсэн.

Хийх:
- [ ] Memory-н дизайнаар дахин хэрэгжүүл: formula-г нэг `In()` query-ээр, ангиллыг 2 batch query-ээр (cache), `shapeRows()` санах ойд, `ResultDao.create`-д `save(entities, {chunk: 200})`. `test/formule-parity.ts`-ээр parity шалгаад COMMIT хий.
- (Үргэлжлэл: #7)

### 0.3 Paywall-ийн нүхнүүд (Өндөр, S–M)

Paywall (`report-access.service.ts`) зөвхөн 2 хаалгыг хамгаалдаг: `GET exam/exam/:code` (`locked`) ба `GET exam/pdf/:code` (402). Доорх нүхнүүд нь №4 / №6-д төлдөг хүний тоог нэмэхээс ӨМНӨ хаагдах ёстой.

**a) `checkPayment` invoice replay.** `core/src/app/report-access/report-access.service.ts` `checkPayment()` (L234–257). `invoiceId` нь URL-аас ирдэг public endpoint (`GET /report-access/:code/check/:invoiceId`). QPay `payment/check`-ээр `paid_amount >= pending.price` бол `markPaid(pending.id)` хийнэ, гэхдээ `pending.invoiceId === invoiceId` эсэхийг ШАЛГАХГҮЙ. Нэг удаа төлсөн ямар ч invoice (өөр тайлан, өөр бүтээгдэхүүний) дурын `code` дээр дахин ашиглагдаж тайлан үнэгүй нээгдэнэ.

**b) Нээлттэй хаалгууд (шинээр олдсон; core v1.2.0 дээр баталгаажуулсан).** Ижил агуулгыг paywall-гүйгээр өгдөг `@Public()` endpoint-ууд:

- `GET /exam/regenerate/:code` (`exam.controller.ts` L191–210): hire_report-ийн `GET test/:code`-г шууд stream хийнэ → PDF үнэгүй. Мөн hire_report `test/:code` нь PDFKit-ээр тэр даруй зурдаг (queue-гүй, API процесс дотор, CPU-г бүрэн ашиглана) → хэн ч давтан дуудаж report VPS-ийг (ба нэг процесс дахь BullMQ worker-ыг) удаашруулж чадна (№7, №10-т хамаарна). web / admin аль нь ч дууддаггүй (`grep` хоосон); хэрэглэгч эдгээрийг гацсан / эвдэрсэн тайланг гараар засах ажиллагааны хэрэгсэл болгон ашигладаг (2026-09-20) → үлдэгдэл биш, харин хамгаалалтгүй ops endpoint — №14.
- `GET /exam/recalculate/:code` (L183–189): `deleteResult(code)` + hire_report `calculate/:code` → код мэддэг хэн ч үр дүнг устгаж дахин бодуулж чадна (№7 (d)-ийн давхар `result` мөрийн эх үүсвэр байж болно).
- `GET /userAnswer/report/:code/full` (exam + assessment + result(parent, children) + answers), `/userAnswer/report/:code`, `.../category/:id`, `.../question/:id`, `/userAnswer/code/code/:code`, `/userAnswer/:code/:id` (`user.answer.controller.ts` L60–116): тайлангийн өгөгдөл paywall-гүй. Repo дотор дуудагч олдсонгүй (studio-д зөвхөн коммент; controller-ийн коммент "studio placeholder" гэнэ) → гаднах AI agent-д зориулагдсан байх магадлалтай.
- `POST /report-access/:code/invoice` (`report-access.controller.ts` L35–36) `@Public()`: дуудах бүрд QPay invoice + `report_access` мөр үүсгэнэ, rate limit байхгүй.
- Зориудаар нээлттэй, зөв: `GET /exam/share/:code` — зөвхөн нэр, оноо, `result`, `value` (OG зураг). Энэ нь №6 (үр дүн үнэгүй)-ийн санаатай нийцнэ.

**c) `exam code` = bearer.** Код нь `Math.random()` + `Date.now()`-оос (`exam.service.ts` L184–190), `Number(BigInt(...))`-ээр float болгодог тул 17 оронтой кодын сүүлийн цифрүүд бөөрөнхийлөгддөг. Таахад хэцүү боловч линк / лог / screenshot-оор түгэх боломжтой. Paywall-ийг "код мэддэг хүн" гэдэгт тулгуурлуулахаас өмнө дээрх хаалгуудыг хаах.

Хийх:

- [ ] `regenerate` ба `recalculate`-г УСТГАХГҮЙ (ажиллагааны хэрэгсэл — №14). Өнөөдөр: (i) Traefik дээр эдгээр path-г ажилтны IP-д хязгаарла (код өөрчлөхгүй — №15-P0-b); (ii) дараагийн deploy-д `@Public()`-г `@ADMINS()` (эсвэл `@SUPER()`) болго — нэг мөр, web / admin эвдрэхгүй; browser-ээр шууд GET хийдэг бол Bearer token хэрэгтэй болно; (iii) №14-т POST + queue + audit болгож шинэчил.
- [ ] Нэмэлт нүхнүүд (файл уншихын path traversal, `POST /report`, `POST /qpay`, hire_report `GET /check`, и-мэйл баталгаажуулалт) — доорх 0.4.
- [ ] `userAnswer/report/*`-г `AiAgentGuard` (`AI_AGENT_KEY`)-д эсвэл `@SUPER()`-д шилжүүл; Studio preview ашигладаг эсэхийг эхлээд шалга.
- [ ] `checkPayment`: `pending.invoiceId`-г ашигла (URL param-г үл тооно, эсвэл тэнцүү эсэхийг шалга); QPay-д зөвхөн тэр invoice-аар асуу. Нэг invoice нэг л `report_access` мөрөнд холбогдоно (unique `idx_report_access_invoice` DB түвшинд хамгаална).
- [ ] `POST :code/invoice`-д rate limit (код + IP), нээлттэй pending мөр байвал шинийг үүсгэхгүй, байгааг буцаа.
- [ ] `QPAY_REPORT_CALLBACK` тохируулаагүй бол зөвхөн polling-оор ажиллана — тодорхой болго.
- [ ] Тест (№9): "paywall-тай assessment дээр код мэддэг нэргүй хүн ямар ч endpoint-оор PDF / дэлгэрэнгүй өгөгдөл авч чадахгүй" + `@Public` route бүрийн жагсаалтын snapshot (шинэ public route нэмэхэд тест унаж, шалгуулна) + "өөр кодод өмнө төлсөн invoice ашиглах" кейс.

### 0.4 Paywall-той холбоогүй, нээлттэй endpoint-уудын бусад нүх (Өндөр–Дунд, S)

Шалгасан: core v1.2.0 ба hire_report `main` (код уншсан). "⚠" тэмдэгтэй зүйлийг prod дээр баталгаажуулна.

**a) [Өндөр ⚠] Файл уншихад path traversal.** `GET /api/v1/file/:file` (`core/src/app.controller.ts` L140–145) ба `GET /api/v1/pdf-template/image/:key` нь `@Public()` бөгөөд `FileService.getFile(filename)` (`core/src/file.service.ts`) нэрийг цэвэрлэхгүйгээр `join('./uploads', filename)` → `existsSync` → `createReadStream` хийдэг. Express 4.22 (core-ийн хувилбар) нь route param дахь `%2F`-ийг `/` болгож decode хийдэг (тусдаа орчинд туршиж шалгасан) тул `..%2F..%2F` хэлбэрийн нэр `uploads/`-с гадуурх файл заах магадлалтай. Traefik / Cloudflare `%2F`-ийг дамжуулдаг эсэхийг prod дээр аюулгүй файлаар шалга ("Хэрэгтэй шалгалтууд"): 200 бол эмзэг, 404 бол одоохондоо хамгаалагдсан. Эмзэг бол процессын орчны хувьсагч (DB, JWT, QPay, AWS-ийн нууц) уншигдах эрсдэлтэй тул нууцуудыг солихыг бодолц. hire_report-ийн `GET /file/:file` (`file.service.ts` `getFile` / `getFileBuf`) ижил `join` ашигладаг (Traefik IP whitelist-ийн ард). web-ийн `/api/file/[id]` proxy нь `fileId`-г цэвэрлэлгүй `${api}file/${fileId}` болгодог тул IP allowlist (№15) байсан ч core талд засах ёстой.

**b) [Өндөр] `ReportController` бүхэлдээ `@Public()`** (class-level, `report.controller.ts` L5):

- `POST /report` — дурын body-г report VPS руу дамжуулна → хэн ч queue руу ажил оруулж чадна (CPU / DoS, №7).
- `GET /report/mail/:code` — зөвхөн hire_report дууддаг боловч public. `sendMail` нь `report_logs.status`-ыг `SENT` болгодог тул хэн ч бэлэн болоогүй тайланг ч "SENT" болгож төлөв эвдэж чадна.
- `GET /report/:id/status` — web-д хэрэгтэй, public байх нь зөв.

web / admin / studio-д `POST /report`, `report/mail`-г дуудсан газар олдсонгүй; core дотор `ReportService.createReport()`-г шууд (service түвшинд) дууддаг.

**c) [Дунд] `QpayController` бүхэлдээ `@Public()`.** `POST /qpay` нь body-г үл тоомсорлож `createInvoice(10, 89, 5000)` дууддаг — дуудах бүрд QPay-д 5000₮-ийн жинхэнэ invoice үүсгэнэ (debug-ийн үлдэгдэл). `GET /qpay/check/:id` дурын invoice-ийн төлбөрийн төлвийг харуулна. web / admin / studio дуудахгүй.

**d) [Дунд] И-мэйл баталгаажуулалт token-гүй.** `GET /user/email/confirm/:email` (`user.controller.ts` L70–80, `@Public()`): и-мэйл хаяг мэддэг хэн ч тухайн хаягийг баталгаажуулж чадна; `verifyMail` нь `await`-гүй тул алдаа `try/catch`-д баригдахгүй. Имэйлд явдаг холбоос API-г ШУУД заана: `https://api.hire.mn/api/v1/user/email/confirm/${email}` (`email.service.ts` L732) → №15-д browser-оос шууд дуудагддаг хамаарал болно.

**e) [Өндөр, whitelist-ийн ард] hire_report `GET /check`** нь `userDao.findAll()` (`repository.find()`, select-гүй) → бүх хэрэглэгчийн БҮХ багана (и-мэйл, утас, `password` hash) буцаана (`app.controller.ts` L22–26). hire_report-д auth байхгүй тул зөвхөн Traefik IP whitelist хамгаална.

Хийх:

- [ ] (a) core-ийн `getFile` / `getFileBuf`, `pdf-template/image/:key`, hire_report-ийн `getFile` / `getFileBuf`: нэрийг `^[A-Za-z0-9._-]+$`-аар шалга (эсвэл `path.basename(name) === name`), эцсийн зам `resolve(localPath)` дотор эсэхийг шалга; `..` / `/` бол 400. web `/api/file/[id]`-д `fileId` regex шалгалт. Тест (№9): `..%2F` нэртэй хүсэлт 400 / 404 өгнө.
- [ ] (b) `POST /report` ба `GET /report/mail/:code`-г internal болго (`X-Internal-Key` header — `INTERNAL_API_KEY` env, hire_report илгээнэ; эсвэл №15-ийн IP allowlist). Class-level `@Public()`-г method-level болгож зөвхөн `status`-г public үлдээ. `sendMail`: `COMPLETED` биш төлөвт `SENT` болгохгүй.
- [ ] (c) `QpayController`-г устга (эсвэл `@SUPER()`).
- [ ] (d) Гарын үсэгтэй, 24 цагийн token-той баталгаажуулалт (HMAC / JWT); холбоос `https://hire.mn/auth/confirm?token=…` (web route → server-side API дуудлага); `await` хий.
- [ ] (e) `check()`-ийг `SELECT 1` эсвэл `{ ok: true }` болго.

## 1. Local дээр prod data-гаар тест хийх

Одоогийн байдал:
- `scripts/start-local.sh` core(5050) + hire_report(4001) + web + admin + studio-г local Postgres `hp` (user `dorjoo`) ба Redis-тэй асаана. `.env` дахь `DATABASE_URL` нь localhost.
- `backups/`-д хамгийн сүүлийн prod dump 2026-06-17 (`hire_prod.dump`, ~4.6MB) — 3 сарын өмнөх. Paywall хүснэгт/баганууд (`report_access`, `assessment.reportPrice` …) тэр үед байгаагүй. core эхлэхэд `perf-bootstrap.ts` идемпотент DDL-ээр нөхдөг ч `synchronize:false` тул бусад шинэ багана/хүснэгтийг гараар нөхөх хэрэг гарч болно.
- Prod DB нэр/эзэмшигч `hire`/`hire`, local `hp`/`dorjoo` → restore-д `--no-owner --no-acl` хэрэгтэй.
- ЭРСДЭЛ: local `core/.env` дотор бодит Resend, QPay (`QPAY_CALLBACK` нь prod `api.hire.mn`-ийг заана), e-barimt, AWS (`hire.mn` bucket) түлхүүрүүд байна. Prod дата local-д ачаалсны дараа тест дуусгах/төлбөр хийх үед бодит хэрэглэгч рүү и-мэйл, төлбөрийн invoice, татварын баримт явах боломжтой (invite/OTP мэйл идэвхтэй).
- Prod-ын өдөр тутмын backup нь core VPS дээрх `pgbackup` (prodrigestivill/postgres-backup-local, 7 хоног) — файлын формат (`.sql.gz` plain эсвэл custom) шалгах.

Хийх:
- [ ] `scripts/prod-data/pull.sh`: core VPS-ийн хамгийн сүүлийн backup-г scp-ээр татах (prod DB-д ачаалалгүй), `backups/`-д огноотой хадгалах.
- [ ] `scripts/prod-data/restore-local.sh`: тусдаа DB `hp_prod` үүсгээд restore (`--no-owner --no-acl`), дараа нь `sanitize.sql`, дараа нь core-г нэг удаа асаан `perf-bootstrap` DDL-г ажиллуулах.
- [ ] `sanitize.sql`: `user.email/phone/password`, `exam.email/phone/firstname/lastname`-г нэргүй болгох; `transaction`, `report_access`, `user.wallet` цэвэрлэх; admin/org/tester/client туршилтын аккаунтыг тогтмол нууц үгтэй нэмэх.
- [ ] `SAFE_MODE=1` (core + hire_report): Resend → зөвхөн лог, QPay → mock invoice + автоматаар төлөгдсөн, e-barimt → идэвхгүй, S3 → no-op. Эхлэхдээ `DATABASE_URL`-ийн host localhost биш бол ЗОГСДОГ guard.
- [ ] `.env.local-prod` загвар (gitignore-д): бодит түлхүүргүй.
- [ ] `scripts/local-prod.sh [--refresh]`: Postgres/Redis шалгах → (restore) → SAFE_MODE-оор `start-local.sh` → нэвтрэх аккаунтуудыг хэвлэх.
- [ ] `scripts/print-branches.sh`: 5 repo-ийн branch хэвлэж, `ops/*/docker-compose.yml`-ийн tag-тай зөрвөл сануулах (A2).
- [ ] `scripts/load-test-reports.sh N`: prod data-ийн N exam-ийг queue-д зэрэг оруулж хугацаа/гацсан тоог хэмжих (№7-г шалгахад; №10-ын ачааллын тестийн эхлэл).
- [ ] Docker байгаа бол `ops/local/docker-compose.yml` (postgres:16 + redis:7, healthcheck) — Mac дээр гараар асаахын оронд; №9-ийн integration тест, №10-ын ачааллын орчинд дахин ашиглана.

Эрсдэл: PII local-д (anonymize хийсний дараа л ажиллуул); хуучин dump бол schema зөрнө. Хэмжээ: M.

## 2. Алгасах дүрэм (skip rule)

Хэрхэн ажилладаг:
- Admin `admin/components/modals/BranchingRules.js` → `POST /question/rule` → `questionRule` хүснэгт (target, dependsOnQuestion, dependsOnAnswer|null, action, active).
- Server: `exam.service.getQuestions` (L532–620) хэсэг ачаалах үед өмнө өгсөн хариултаар (`userAnswer.findExistingByCode`) шүүнэ; тухайн хуудсан доторх дүрмийг `rules`-аар client-д өгнө.
- Client: `web/app/exam/[id]/page.js` `hiddenQuestionIds` (L303–327) live нууна; `publish()` (L337) нууцлагдсан асуултын хариултыг илгээхгүй (L339–343).

Олдсон асуудлууд:
1. [Өндөр] Сүүлийн хэсэгт илгээх хариулт 0 байвал (бүх асуулт skip-ээр нуугдсан, эсвэл зөвхөн заавал биш асуулт байгаад хариулаагүй) шалгалт ХЭЗЭЭ Ч дуусахгүй, тайлан үүсэхгүй. `publish()` (L386–393) `{success:true, skipped:true}` буцаагаад `end` флагтай POST илгээхгүй; auto-advance effect (L232–255) зөвхөн FinishModal нээнэ; сервер `userAnswer.create` хоосон `data`-д 'Асуултууд ирсэнгүй' гэж алдаа өгдөг (L56) ба `end`-г зөвхөн `create` дотор боловсруулдаг (L337–352). Үр дүн: `exam.userEndDate = null`, `report_logs` мөр байхгүй, Completion спиннер → 5 минутын дараа алдаа.
2. [Дунд] Client/server харьцуулалт зөрнө. Client `Object.values(answer)`-г `dependsOnAnswerId`-тэй жишдэг (MATRIX/SLIDER-т answer id биш багана/утга байна), TRUE_FALSE нь boolean, TEXT нь string → таарахгүй. Server `answerId` хосоор шалгадаг. Admin UI аль ч төрлийн асуултыг нөхцөл болгож болно.
3. [Дунд] `POST /question/rule` шалгалтгүй: өөрөө өөр рүүгээ, цикл, өөр асуултын `dependsOnAnswerId`, ДАРААГИЙН блокийн асуултаас хамаарах, давхардсан дүрэм бүгд зөвшөөрөгдөнө. `action:'show'` хадгалагдах боловч client/server хоёул үл тоомсорлоно. Засах (PATCH) ба active toggle endpoint байхгүй (create/delete л).
4. [Дунд] Оноо/тайлан: skip хийсэн асуултад `userAnswer` мөр байхгүй тул SUM-д ордоггүй, харин `total` нь статик (`assessment.totalPoint` / `question_category.totalPoint`, hire_report `app.service.ts` L303) ба зарим тайланд тогтмол хуваагч (жишээ `/34`) → skip-тэй тест дээр хувь/дундаж буруу гарч болно. Аль тест дүрэмтэй болохыг доорх SQL-ээр гаргаад тайлангийн загвар тус бүрийг шалга.
5. [Дунд] `questionRule` хүснэгтийн DDL repo-д байхгүй (perf-bootstrap-д ороогүй, `synchronize:false`), мөн `findByTargetQuestionIds` try/catch-гүй → хүснэгт байхгүй орчинд (шинэ local DB) шалгалт бүр эхлэхгүй. 2026-06-17 prod dump-д хүснэгт байгаа.
6. [Бага] `findForExam` санамсаргүй сонголтыг (questionCount + shuffle) skip-ээс ӨМНӨ хийдэг → skip болсон асуултыг орлуулахгүй, тоо цөөрнө (зорилготой байж болно).
7. [Бага] `dependsOnAnswerId = null` дүрэм "ямар нэг хариулт" гэж тооцно; цаг дуусаад `null` хариулт (`handleTimeUp`) ч тооцогдоно.
8. [Бага] `GET /question/rule` @Public — дүрмийн жагсаалт нээлттэй.

Хийх:
- [ ] (1) Шалгалтыг албан ёсоор дуусгах: `POST /userAnswer/finish {code}` (эсвэл `create()`-д `end:true` + хоосон data зөвшөөр) → `endExam` + `createReport`. Front `publish()`-д (`categories.length===0 && body.length===0`) болон auto-advance effect-д дуудна. Идемпотент байх (№7).
- [ ] (2) Нөхцөл асуултыг SINGLE/MULTIPLE (type 10/20)-д хязгаарла (admin picker + сервер validate); client харьцуулалтыг answer id-аар тодорхой болго.
- [ ] (3) Rule validation (өөртэйгөө, цикл, answer тухайн асуултынх, зөвхөн ӨМНӨХ/ижил блок), PATCH/active toggle; `show`-г хэрэгжүүл эсвэл UI/enum-с хас.
- [ ] (4) Skip-тэй тестүүдийн `total`-г хэрэглэгчид үзүүлсэн асуултаар бод (`examDetail`-ээс) — эхлээд SQL-ээр хамрах хүрээг хар.
- [ ] (5) `questionRule` DDL-г perf-bootstrap-д `CREATE TABLE IF NOT EXISTS`-ээр нэм.
- [ ] Тест: SINGLE/MULTIPLE дүрэм, хэсэг хоорондын дүрэм, бүх хэсэг skip, сүүлийн хэсэг skip, цаг дуусах, refresh.

Хэмжээ: M.

## 3. Public QR-аар эхэлж дундаас гарсныг үргэлжлүүлэх

Одоогийн байдал:
- `createPublicExam` (`user.service.service.ts` L550–653): ижил утас/и-мэйл + service-ээр сүүлийн 24 цагт (`createdAt`-аар) бүртгүүлсэн exam байвал шинийг үүсгэхгүй, өмнөх `code`-ыг буцаана (`ExamDao.findByServiceAndContact`). Утас заавал, и-мэйл заавал биш.
- `/exam/[code]` нээхэд `bootstrap()` (`web/app/exam/[id]/page.js` L126–218): `getExamAccess` → signOut → `getExamQuestions(code)` → signIn → `getExamQuestions(code, undefined, true)`. Нэг нээлт = `updateByCode` ХОЁР удаа.
- `/me`, `/test/*`-д "Үргэлжлүүлэх" товч бий (`userStartDate && !userEndDate`), гэхдээ QR-ийн хэрэглэгчид нууц үг/нэвтрэх зам байхгүй.

Дутагдал:
1. [Өндөр] `updateByCode` `con` салбар (`exam.service.ts` L378–391) эхний бөглөгдөөгүй хэсгийг `categoryIndex`-д тооцоод ашигладаггүй (dead code; `currentCategory` нь L372-т `category ?? allCategories[0]` хэвээр) → үргэлж 1-р хэсгээс эхэлнэ.
2. [Өндөр] Асуултын сонголт тогтвортой биш: `getQuestions` бүрд `ORDER BY RANDOM()` (shuffle + questionCount) → буцаж ороход өөр асуулт. `createDetail` (L510–530) unique/dedupe-гүй → нээлт бүрд `examDetail` давхардана (нэг нээлт = 2×). `examDetail` зөвхөн бичигддэг (уншдаг код алга). Тогтвортой shuffle: №13-B (5).
3. [Дунд] Цаг: `setExamStartTime(Date.now())` (page.js L208) нээлт бүрд тэглэгдэнэ → дундаас ороход бүтэн хугацаа дахин эхэлнэ. Хэсгийн эхэлсэн цаг серверт хадгалагдахгүй; `examDetail`-д `createdAt` байхгүй.
4. [Дунд] Хариулт зөвхөн хэсэг солих/`navigateToCategory` үед хадгалагдана → хэсгийн дундаас гарвал тэр хэсгийн хариулт алга. (`userAnswer.create` идемпотент — key-ээр давхардлыг устгаж дахин оруулдаг, тиймээс дахин илгээх аюулгүй.)
5. [Дунд] Дахин орох зам: QR-ыг дахин уншиж ЯГ ИЖИЛ утас/и-мэйлээ бичих л боломж; 24 цагаас хойш шинэ exam (квот дахин зарцуулна). Төхөөрөмж дээр сануулга (localStorage) ба и-мэйлээр холбоос байхгүй.
6. [Аюулгүй байдал] Утас/и-мэйл баталгаажаагүй: бусдын утсыг бичвэл тэр хүний exam `code`-ыг авч (24 цаг), `/exam/access/:code` 30 хоногийн JWT олгоно (audit-д бүртгэсэн "code = bearer"). Үргэлжлүүлэх боломжийг өргөтгөхдөө үүнийг дордуулахгүй.

Хийх (сервер):
- [ ] `updateByCode(con=true)`: хариулаагүй эхний хэсгийг сонгож буцаа (`currentCategory`-г `categoryIndex`-ээр тохируул), `categories` (үлдсэн) зөв болго.
- [ ] Асуултыг хэсэг тутам НЭГ удаа тогтоо: `examDetail`-д (exam, category) мөр байвал тэр id-уудаар ачаал; `createDetail`-д unique `(examId, questionId)` + `ON CONFLICT DO NOTHING` (DDL-г perf-bootstrap-д).
- [ ] Цагийг серверт: `examDetail.createdAt` (эсвэл `exam`-д `categoryStartedAt`) нэм; response-д `serverNow`, `categoryStartedAt`; client үлдсэн хугацааг тэрнээс бод.
- [ ] `findByServiceAndContact`: 24 цаг → "дуусаагүй байгаа хүртэл (эсвэл 7 хоног)"; дууссан бол `{code, finished:true}`.
- [ ] Бүртгэлийн үед и-мэйл өгсөн бол "Тестээ үргэлжлүүлэх" холбоосыг имэйлээр илгээх.

Хийх (front):
- [ ] Public register амжилттай бол `localStorage['hire.public.<serviceId>'] = {code}`; дараа энэ QR-ыг нээхэд "Үргэлжлүүлэх / Үр дүн харах" карт.
- [ ] Хариултыг debounce-оор (3–5 с) + `visibilitychange`/`pagehide` үед `fetch(keepalive)`-ээр auto-save (сервер идемпотент; ачаалал шалгах).
- [ ] bootstrap-ийн 2 дуудлагыг нэгтгэх (нэг `updateByCode`).
- [ ] Тест: 2-р хэсэгт гараад дахин орох (2-р хэсэг, ижил асуулт, үлдсэн хугацаа), 1-р хэсгийн дундаас гарах, дууссан exam, өөр төхөөрөмж, 24 цагийн дараа.

Хэмжээ: L (сервер + front + DDL).

## 4 + 6 (хамт). Тайлангийн төлбөр ба үнэгүй үр дүн / төлбөртэй дэлгэрэнгүй тайлан

Одоогийн байдал:
- Paywall (`report-access.service.ts` L109–183): `enabled = reportPrice>0 && (reportFreeViews>0 || reportPdfPaid)`. Хоёр горим: (A) N удаа үнэгүй харах (30 минутын session), (B) `reportPdfPaid` — дэлгэц үнэгүй, PDF төлбөртэй.
- Чөлөөлөлт `isExempt()` (L80–106): admin/tester/super_admin/organization → `staff`; `exam.service.user.role === ORGANIZATION` → `organization-paid` (оролцогч ТӨЛӨХГҮЙ) ← №4-тэй ЗӨРЧИЛДӨНӨ; `service.price>0 && SUCCESS` → `test-purchased` (өөрөө төлж авсан тест дээр дахин нэхэхгүй) — байгууллагын wallet-ээр төлсөн service мөн үүнд орно.
- `GET exam/exam/:code` (`exam.controller.ts` L267–297): `canView=false` бол ДАТА огт буцаахгүй `{locked:true, access}` → (A) горимд үр дүн ч түгжигдэнэ. `GET pdf/:code` `canDownload=false` бол 402. `getExamInfoByCode` (exam.service.ts L229–313) `assessment`-г (`exampleReport`-той) буцаадаг, харин `locked` payload-д `assessment` байхгүй.
- web: `ReportPaywall` (full/download), `/api/report/[id]` 402-ийг HTML хуудсаар харуулна. `/result/[id]`-д "жишээ тайлан" товч байхгүй; `Test.js` L471–483, L542–554-д байгаа (`assessment.exampleReport` → `${api}file/${name}`).
- `Invite.js` QR үүсгэхэд `updateAssessmentShowResult()` (`web/app/api/main.js` L620) дуудна: `PATCH assessment/:id` нь admin/tester/super_admin-д л → байгууллагад 403 (үр дүн нь үл тоомсорлогдоно); admin хийвэл тухайн assessment-ийн БҮХ хэрэглэгчид глобал өөрчлөгдөнө.
- Тайлангийн мэйл идэвхгүй (`user.answer.service.ts` L389–396 коммент) тул PDF имэйлээр үнэгүй гарах эрсдэлгүй.

Санал болгож буй загвар:
- Үр дүн (оноо/түвшин/товч тайлбар) ХЭЗЭЭ Ч үнэгүй, хязгааргүй → `getExamInfo` `locked` буцаахгүй.
- Дэлгэрэнгүй тайлан (PDF + дэлгэрэнгүй хэсэг) төлбөртэй: оролцогч төлнө; байгууллага (эзэмшигч) үнэгүй; admin/tester үнэгүй. Энэ нь одоогийн (B) горим (`reportPdfPaid=true, reportFreeViews=0, reportPrice>0`)-той бараг ижил → (A) горимыг ашиглахаа больж тохиргоо/UI-г (B)-д төвлөрүүлнэ.

Хийх (№4):
- [ ] 0.3 (a, b)-г эхэлж засах (`checkPayment` + нээлттэй хаалгууд: `regenerate`, `userAnswer/report/*`). Тэдгээрийг хаахаас өмнө ямар ч assessment дээр `reportPrice > 0` тавихгүй.
- [ ] `isExempt`: `organization-paid`-г хас (эсвэл `userService.candidatePays` флагаар), `test-purchased`-г "төлсөн хүн = оролцогч (`service.user.role !== ORGANIZATION`)"-д хязгаарла.
- [ ] Байгууллага өөрийн service-ийн оролцогчийн тайланг үнэгүй харна/татна: `staff` чөлөөлөлт хэвээр; эзэмшигч мөн эсэхийг `getExamInfoByCode` шалгадаг — `pdf/:code` дээр ч баталгаажуул. `registerView` байгууллагыг тоолохгүй (одоо exempt → freeState → тоолохгүй).
- [ ] Оролцогчийн талд `Completion`/`/result` дээр төлбөрийн CTA (үнэ, "Дэлгэрэнгүй тайлан авах") ба QPay урсгал public QR оролцогч (утас-only, `${phone}@hire.mn`) дээр ажиллахыг шалга.
- [ ] Тохиргоо: холбогдох assessment-үүд дээр `reportPrice`, `reportPdfPaid` (admin `Report.js`).

Хийх (№6):
- [ ] `getExamInfo`: үнэгүй үр дүнг үргэлж буцаа; `access` мэдээлэл хэвээр; `locked` зөвхөн (A) горим үлдсэн бол.
- [ ] `/result/[id]`: "Жишээ тайлан үзэх" товч — `assessment.exampleReport`. `locked` payload-д `assessmentName`, `exampleReport` нэм. `Test.js`-ийн логикийг нэг shared `SampleReportButton` болгох.
- [ ] `showResultOnComplete`-г assessment-ийн глобал утга биш, service (QR) бүрд хадгал (`userService.showResult`).
- [ ] Тест: (байгууллагын урилга, public QR, өөрөө худалдан авсан, admin) × (`reportPrice` 0/>0, `pdfPaid` true/false) матриц.

Хэмжээ: M.

## 5. /test/* ба /me-с /result руу товч

Одоогийн байдал: дууссан exam-ийн мөр бүрт зөвхөн "Татах" (`/api/report/${code}?display=inline`) + Facebook share байна; `/result/${code}` руу зөвхөн `Completion.js` оруулдаг.

Байршил (finished салбар, хүснэгт + карт, 2 tab):
- `web/components/Profile.js`: L575, L731, L1192, L1372
- `web/components/Test.js`: L725, L934, L1122, L1330

Хийх:
- [ ] Нэг `ExamActions` (эсвэл `ResultButton`) компонент: `Link href=/result/${code}` "Үр дүн харах" — зөвхөн дууссан, `visible !== false`, `code` байгаа үед; 8 газарт орлуул.
- [ ] `isExpired`, `visible=false` (байгууллага нууцалсан) төлөвт нууна эсвэл "Нууцалсан" гэж заана.
- [ ] Товч paywall-д нөлөөлөхгүй (үр дүн үнэгүй болсны дараа — №6).

Хэмжээ: S. Хамаарал: №6-ын дараа.

## 7. Олон тайлан зэрэг бодогдоход гацдаг

(hire_report-ийн мөрийн лавлагаа `main` branch-ийнх; `feature/v1.2.0` дээр `eee309b` (rethrow → FAILED) байхгүй — A1.)

Урсгал: `userAnswer.create(end)` → `endExam` (await) → `createReport` (background, `.catch(console.error)`) → axios POST (timeout байхгүй) → hire_report `createReport`: `queue.add` → `reportDao.create` → BullMQ `report` queue (concurrency 1, attempts 3, `removeOnComplete/Fail: true`) → `AppProcessor.process`: `endExam`(тооцоо) → `getDoc`(PDF) → `generateAndUpload` (`uploads/` дискэнд) → COMPLETED → core `/report/mail/:code`. API ба worker НЭГ процесс (`start:prod` = `node dist/src/main.js`; `worker.ts` ашиглагддаггүй), нэг container.

Баталгаатай гацах цэгүүд:
- a. [Өндөр] core → report POST-д retry/timeout/outbox байхгүй (`core/.../report.service.ts` L26–52): алдвал `report_logs` мөр огт үүсэхгүй → `getStatus` мөнхөд PENDING (Pattern A).
- b. [Өндөр] `AppProcessor.updateProgress` (`app.processer.ts` L118) `dao.updateById`-г await/catch-гүй. `updateById` мөр олдохгүй бол throw хийдэг (`affected===0`). Мөн `queue.add` → `reportDao.create` дараалал (`app.service.ts` L55–72) тул worker эхлэхэд мөр байхгүй байж болно. hire_report-д global `unhandledRejection` handler байхгүй (Node 20 дээр default нь процессыг унагана) → унасан процесс дундах job "stalled" болно.
- c. [Өндөр] Restart/deploy үед идэвхтэй job алдагдана: Watchtower `--rolling-restart` (5 минут тутам polling) + `enableShutdownHooks` байхгүй + `lockDuration` 5 минут. Job "stalled" болж `maxStalledCount` (default 1)-ийг хэтэрвэл BullMQ 5.58 (`moveStalledJobsToWait-8` script, `worker.js` L493) дараагийн pickup дээр `UnrecoverableError('job stalled more than allowable limit')`-оор attempts үлдсэн ч шууд FAILED болгодог. Энэ үед `onFailed` (`app.processer.ts` L38–39) `attemptsMade < attempts` гэж эрт буцаад DB-г FAILED болгохгүй, `removeOnFail: true` тул job Redis-с устна → `report_logs` мөр WRITING/CALCULATING-д мөнхөд үлдэнэ. (node_modules дахь BullMQ эх кодоор баталгаажуулсан; prod-д логоор давхар шалга.)
- d. [Өндөр] `generateAndUpload` (L172–199) алдааг залгина → PDF бичигдээгүй ч COMPLETED. `calculateExamById` (L201–262) алдааг залгина; `ResultDao.create` (`result.dao.ts` L16–32) transaction-гүй → дунд нь тасарвал хагас `result` үлдэж, дараагийн оролдлого "result байна" гэж эрт буцаад хагас өгөгдлөөр PDF үүсгэнэ. `result.code` unique биш, давхар бодолт (double `end`, `recalculate`) давхар мөр үүсгэж болно.
- e. [Дунд] Mail алхам (L93–95) унавал job унасан гэж тооцогдож, PDF бэлэн байсан ч 3 удаа дахин бодоод FAILED болно (COMPLETED-г дарна). (Мэйл нь бодит илгээхгүй — `sendEmail` идэвхгүй, тиймээс `SENT` төлөв утгагүй.)
- f. [Дунд] hire_report `getStatus` (`app.service.ts` L107–127) await/catch-гүй `sendMail` → core унтарсан үед unhandled rejection.
- g. [Дунд] Хурд: 0.2-ын N+1 (мөр тутам query, detail тус бүр INSERT, сүлжээгээр 5–20ms) + concurrency 1 + нэг процесс → 50 хүн зэрэг дуусгахад дараалал минутаар. PDFKit sync CPU нь event loop-г түгжиж API (`/file/:name`, status)-г удаашруулна; core-ийн `getReport` timeout 30 с → PDF байгаа ч "File not found" харагдана.
- h. [Таамаг — баталгаажуулах] ops target compose-д `mem_limit: 2g`, `NODE_OPTIONS`-гүй (хуучин compose 7g / heap 6144) — том PDF дээр OOM kill → restart → (c).
- i. [Анхаар] PDF зөвхөн report VPS-ийн `uploads/` дискэнд (S3 идэвхгүй); цэвэрлэлт/диск хяналтгүй. `scripts/upload-report-files.sh` (local-д үүсгэсэн PDF-г prod руу гараар тавих) нь энэ гацалтыг гараар арилгаж ирсний ул мөр — P2-ийн дараа хэрэггүй болох ёстой.
- j. [Өндөр] Нээлттэй `GET /exam/regenerate/:code` (0.3 b) queue-гүйгээр report процесс дотор PDF-ийг шууд зурна → давтан дуудахад CPU-г эзэлж нэг процесс дахь worker-ыг удаашруулна / stall хийнэ. Нийтэд нээлттэй байхыг зогсоох (`@ADMINS()` + IP allowlist, дараа нь №14-ийн queue-тэй endpoint) нь хамгийн хямд "гацалт"-ын засвар.
- k. [Дунд] `report_logs.code`-д индекс байхгүй, `getOne(id)` нь `WHERE id = $1 OR code = $1` (`report.log.dao.ts` L30–38) → status polling / paywall / PDF бүрд хүснэгт өсөхөд seq scan (№13-B (3)).

Хийх — P1 (хамгийн бага, хамгийн их үр дүн):
- [ ] `updateProgress`: await + try/catch (progress бичихэд алдаа job-г унагаахгүй); process-level `unhandledRejection` лог.
- [ ] 0.3 (b): `GET /exam/regenerate/:code`, `/exam/recalculate/:code`-г нийтэд нээлттэй байлгахгүй (`@ADMINS()` + Traefik IP allowlist; queue-гүй PDF render нь worker-ыг удаашруулдаг) — устгахгүй, №14-т queue-тэй ops endpoint болгоно.
- [ ] hire_report `createReport`: `report_logs` мөрийг ЭХЛЭЭД upsert (`jobId` = `code`-оос гаргасан тогтмол), дараа нь `queue.add(..., {jobId})` → идемпотент; enqueue алдвал мөрийг FAILED болго.
- [ ] `generateAndUpload`: алдааг шид; файл байгаа/хэмжээ>0 эсэхийг шалгаад л COMPLETED; түр файлаар бичээд rename.
- [ ] Mail алхмыг try/catch-д (алдаа ажлыг унагаахгүй); `getStatus`-ийн `sendMail`-д `.catch`.
- [ ] `ResultDao.create` + `calculateExamById`: нэг transaction (result + details chunk insert); `code` бүрд `pg_advisory_xact_lock`; "result байна" шалгалтыг "details бүрэн" гэж баталгаажуул.
- [ ] Worker: `maxStalledCount: 3`, `removeOnFail: {age: 7 хоног}`; `onFailed`-д "эцсийн алдаа" нөхцлийг `UnrecoverableError` (stalled limit)-ийг мөн тооц (эсвэл `failed` бүрд DB-д `error`/`RETRYING` бич, эцсийн үед FAILED); `stalled` event-г лог хий.
- [ ] Graceful shutdown: `app.enableShutdownHooks()` + worker.close() (идэвхтэй job дуустал хүлээх), compose-д `stop_grace_period: 120s`.
- [ ] Шалга: prod DB-д `\dT+ report_logs_status_enum` дотор `FAILED` байгаа эсэх (core perf-bootstrap `ADD VALUE IF NOT EXISTS 'FAILED'` нэмдэг).

Хийх — P2:
- [ ] 0.2-ын N+1 засварыг дахин хийх (хамгийн том хурдны ашиг).
- [ ] Reconciler (core cron, 5 минут тутам; `report_logs`, `exam` нэг DB): (A) `userEndDate` өнгөрсөн 3+ минут, `report_logs` мөргүй → дахин enqueue; (B) `STARTED/WRITING/CALCULATING` ба `updatedAt` 10+ минут → дахин enqueue (max 3), дараа нь FAILED + алерт.
- [ ] core `createReport`: axios `timeout: 15s`, 3 оролдлого (backoff), эцэст нь `report_logs`-д PENDING/FAILED мөр бич.
- [ ] Хэрэглэгч/админ retrigger: №14-ийн `POST /ops/report/:code/retry` (нэг endpoint, `@SUPER()`, rate-limit) + admin-д "Дахин боловсруулах" товч; шалгуулагчид зориулсан нээлттэй retry (rate-limit-тэй, өөрийн `code`-оор) хэрэгтэй бол тусад нь; `Completion.js` polling хязгаар хэтэрвэл идэвхтэй "Дахин оролдох" (одоо зөвхөн дахин polling хийдэг).
- [ ] Calc ба PDF-ийг салгах (үр дүн үнэгүй, тэр даруй харагдах ёстой — №6): `report-calc` queue (concurrency 3, хурдан) ба `report-pdf` queue (concurrency 1–2); эсвэл PDF-ийг lazy (төлсөн/татахаар хүссэн үед).
- [ ] API ба worker-ийг салгах: `worker.ts` бэлэн; `AppProcessor`-г `RUN_WORKER` env-ээр нөхцөлт болгоод 2 container.

Хийх — P3:
- [ ] Ажиглалт: `ops/shared/find-stuck-reports.sh` (толгойн тайлбар хуучирсан — rethrow засвар орсон) өдөр тутмын cron + мэдэгдэл; Bull Board (admin-д); queue depth healthcheck; `docker inspect` `RestartCount`.
- [ ] Диск: `uploads/` хэмжээ хяналт/цэвэрлэлт.

Баталгаажуулах (prod дээр): `find-stuck-reports.sh 720`; report VPS `/var/log/hire/report/errors-*.jsonl`-д `ReportLog with id`, `stalled`, `unhandled`; container restart тоо.

Хэмжээ: P1 M, P2 L.

## 8. Public QR-ийн userService-ийн `count`-г байгууллага нэмэх

Одоогийн байдал:
- `count` нь худалдан авалтын үед тогтоогдоно (`user.service.service.ts` `create` L58–115: `price = assessment.price × count`, байгууллага wallet-аар төлнө). Нэмэх endpoint байхгүй; `updateCount(service, count, used)` (dao L72–78) дотоод, `createExam`/`createPublicExam` зөвхөн `used` нэмнэ.
- QR нь `.../exam/public/${serviceId}` — НЭГ userService-д уяатай; UI `Invite.js` L703 `testData?.[0]?.id` (эхний service). Квот дуусахад (`createPublicExam` L592: `count - usedUserCount <= 0 && price != 0` → 402) хэвлэсэн QR-ыг шинээр хэвлэх хэрэг гарна; өөр service (шинэ худалдан авалт) нэмсэн ч QR тэр service-д шилжихгүй.
- `updateCount` уншаад-нэмээд-хадгалдаг (атомик биш) → зэрэг бүртгэлд `usedUserCount` хасагдана; квот шалгалт (L592) ба нэмэлт (L650) хооронд race.
- QR-ийн `?expires=` (Invite.js) ямар ч талд шалгагддаггүй (сервер, public хуудас хоёул).
- Үнэгүй (`price==0`) service-д квот public-д үйлчилдэггүй, харин invite (`createExam` L354) үйлчилдэг — зөрүү.
- `create()` wallet-ийг JWT-н `user['wallet']`-ээс шалгадаг (хуучирсан токен/зэрэг хүсэлтээр давхар зарцуулах боломж).

Санал болгож буй шийдэл (A — эхний алхам): "Эрх нэмэх" (top-up):
- [ ] `POST /userService/:id/topup {count}` (Roles: organization = эзэмшигч, admin, super_admin): `service.user.id === user.id` шалга; `price = assessment.price × count`; wallet-ийг DB-ээс (JWT-ээс биш) атомик хас (`UPDATE … WHERE wallet >= price`); `transaction` бич; `count += n`, `price += …` — нэг transaction-д.
- [ ] Атомик хэрэглээ: `UPDATE "userService" SET "usedUserCount"="usedUserCount"+1 WHERE id=$1 AND ("count"-"usedUserCount")>0 RETURNING *` (public-register + createExam) — race арилна; `updateCount`-г ингэж солино.
- [ ] Admin: гараар нэмэх (үнэ 0) боломж.
- [ ] UI (`Invite.js` QR modal + `/test/details`): үлдэгдэл `count-usedUserCount` харуулж, "Эрх нэмэх" товч; wallet хүрэлцэхгүй бол цэнэглэх зам.
- [ ] (Сонголт B) QR нь (байгууллага + assessment)-аар шийдэгддэг: service дуусахад ижил байгууллагын үлдэгдэлтэй өөр service руу шилжинэ — хэвлэсэн QR хэвээр.
- [ ] `?expires=`-ийг сервер дээр хэрэгжүүл эсвэл UI-с хас.

Хэмжээ: M.

## 9. Автомат тест хийх боломж (шинэ жагсаалтын №1)

Одоогийн байдал (шалгасан):

- core: jest (ts-jest) тохируулагдсан, `npm test` / `test:e2e` script бий. Гэвч `npx jest` ажиллуулахад 11 / 11 suite FAIL, 0 тест ажилласан: Nest CLI-ийн scaffold `*.spec.ts` (`should be defined`) ба jest `rootDir: src`-д `src/...` absolute import-ын `moduleNameMapper` байхгүй тул `Cannot find module 'src/app/...'`. `test/app.e2e-spec.ts` мөн scaffold (`GET / → Hello World!`).
- Гэхдээ `core/test/`-д jest-д холбогдоогүй 3 ажилладаг script-style тест бий: `report-access.spec-lite.ts` (paywall логик, DB-гүй mock DAO; `ts-node`-оор ажиллуулж шалгасан — A–E бүх кейс ✅), `di-smoke.ts` (AppModule-ийн DI graph-ийг DataSource mock-оор шалгана), `env-order.ts` (`.env` ачаалах дараалал).
- hire_report: scaffold e2e + untracked `test/formule-parity.ts` (алдагдсан `shapeRows`-г дууддаг — 0.2).
- web / admin / studio: тест tooling огт байхгүй (`test` script, jest / vitest / playwright байхгүй).
- CI: `.github/workflows/docker-dev.yml` зөвхөн Docker image build + push. lint / tsc / test алхам байхгүй → branch руу push хийхэд image шууд mutable tag (`:feature-v1.2.0`)-оор гарна.
- Commit-ийн ихэнх нь "update" (core 1079 / 1188, hire_report 191 / 318, web 200 / 348, admin 54 / 113 нь ≤ 8 тэмдэгт) → regression олоход түүх туслахгүй.

Яагаад хэцүү байна:

1. Логик нь service дотор DB / HTTP-тэй нийлсэн (`getQuestions` дотор skip-rule шүүлт, `createPublicExam` дотор квот, `AppProcessor` дотор calc / PDF / mail) → цэвэр функц болгон салгаагүй тул unit тест бичихэд mock их.
2. Гадаад хамаарал: QPay, Resend, S3 / hire_report HTTP, Redis (BullMQ), Postgres-ийн materialized view + индекс (perf-bootstrap) — тест орчин хэрэгтэй.
3. Prod-той адил дата (тест, асуулт, томьёо, загвар) байхгүй → томьёо / тайлангийн parity шалгах "golden" өгөгдөл байхгүй.
4. Шалгалтын front (`web/app/exam/[id]/page.js`) нарийн state machine (skip, timer, publish, hidden) — зөвхөн browser-т шалгагдана.

Санал болгож буй давхаргууд (right-sized — жижиг эхэлж өсгөнө):

- L0 (S–M): jest-г ажиллуул — `moduleNameMapper: {'^src/(.*)$': '<rootDir>/$1'}`; 11 scaffold-г устга; `report-access.spec-lite.ts`-г jest `report-access.service.spec.ts` болго; `di-smoke`-г `test:smoke` script болго. `npm run test:ci` = lint + `tsc --noEmit` + jest. CI-д `test` job нэмээд `docker` job-д `needs: test`. Үр дүн: "build ногоон" = хамгийн багадаа DI зөв, paywall логик зөв.
- L1 Unit (цэвэр логик, DB-гүй): paywall `isExempt` / `resolve` матриц (бий) + №4 / №6-ын шинэ дүрэм; skip-rule үнэлгээ (`evaluateRules(rules, answers)` цэвэр функцыг `getQuestions`-с салгаж, client-ийн `hiddenQuestionIds`-той ижил жишээгээр шалгана — №2-ын "нэг эх сурвалж"); квот (`canRegister(service, used)`); public register dedupe / resume шийдвэр (№3); report pipeline-ийн төлвийн машин (stalled / timeout → FAILED, №7); томьёо parity (hire_report — 0.2-ын `test/formule-parity.ts` эндээс үргэлжилнэ).
- L2 Integration (жинхэнэ Postgres 16 + Redis 7 — docker compose эсвэл CI service container): DAO SQL (`findByServiceAndContact`, атомик `updateCount`, `bulkInsert`), perf-bootstrap / migration нь хоосон DB дээр 2 удаа ажиллаад алдаагүй (идемпотент), `mv_question_answer_full` refresh, BullMQ worker (PDF алхмыг fake-ээр: амжилт / алдаа / timeout / stalled → `report_logs` төлөв).
- L3 API e2e (supertest, AppModule + тест DB, гадаад provider-ыг `overrideProvider`-аар fake): бүртгэл → эхлэх → хариулт → дуусгах → үр дүн → paywall (invoice → callback) → тайлан. Мөн "`@Public` route бүр" contract тест (0.3 дахин орохгүй).
- L4 Browser e2e (Playwright, web-д зөвхөн 3–4 урсгал): public QR happy path; дундаас гарч үргэлжлүүлэх (№3); skip дүрэмтэй шалгалт (сүүлийн хэсэг skip → дуусна, №2); paywall CTA (№4 / №6). local-prod орчинд + nightly CI.
- Fake provider: `SAFE_MODE` / `APP_ENV=test` үед QPay (invoice автоматаар төлөгдсөн), Resend (зөвхөн лог), S3 (no-op) — №1-ийн `SAFE_MODE`-той ЯГ ИЖИЛ mechanism (нэг удаа хийнэ).
- Тест дата: `test/fixtures/seed.ts` — төрөл бүрийн (SINGLE / MULTIPLE / MATRIX / SLIDER / TEXT …) асуулт, skip дүрэм, томьёо, нэг Studio загвартай жижиг seed + prod dump-с нэргүйжүүлсэн 10–20 exam ("golden": оноо / тайлангийн хүлээгдэж буй утгатай).
- Дүрэм: prod-ын бодит алдаа бүр regression тест болно (жишээ: "сүүлийн хэсэг хоосон → end илгээгдэнэ").

Зорилтот хэмжээ (эхний 2–3 долоо хоног): ~30–40 тест, L0–L3 нь 5 минутаас бага, 3–4 Playwright. Coverage хувь тавихгүй.

Хийх:

- [ ] L0: jest засвар, scaffold устгал, CI `test` job (`needs`).
- [ ] `docker-compose.test.yml` (postgres:16 + redis:7, healthcheck) + `npm run test:int`.
- [ ] Цэвэр функц салгалт (skip-rule, quota, resume decision) — №2, №3, №8-ын PR-уудтай хамт (тест эхэлж бичигдэнэ).
- [ ] Fake provider-ууд + `SAFE_MODE` (№1).
- [ ] Contract тест: `@Public` route-уудын snapshot.
- [ ] Playwright (web): 3 урсгал; шаардлагатай газарт `data-testid`.
- [ ] hire_report: jest + parity тест; PDF-д snapshot биш, "үүссэн, хэмжээ > 0, N хуудастай" (жишээ `pdf-parse`) гэх мэт.
- [ ] PR дүрэм: bug засвар = regression тесттэй.

Хэмжээ: L0 S–M, L1–L3 M–L (үргэлжилнэ), L4 M. Хамаарал: №1 (орчин, fake, seed), №13-A (migration нь хоосон DB дээр ажиллах).

## 10. Ачааллын тест хийх боломж (шинэ жагсаалтын №2)

Одоогийн байдал (шалгасан):

- Ачааллын тест / хэмжилт огт байхгүй (k6 / Artillery / autocannon байхгүй). Rate limit, throttler, helmet, compression байхгүй; CORS `origin: '*'`; JSON body limit 100mb.
- core: 1 container (`mem_limit: 3g`, `cpus` хязгааргүй), нэг Node процесс (cluster байхгүй); DB pool `DB_POOL_MAX` (default 10, env-ээр тохируулна), pgbouncer `POOL_MODE: transaction`, `MAX_CLIENT_CONN: 1000`, `DEFAULT_POOL_SIZE: 100`, Postgres `max_connections=200`.
- hire_report: BullMQ concurrency 1, API + worker нэг процесс, report VPS `cpus: 1.5`, `mem_limit: 2g` (ops compose).
- `LoggingInterceptor` зөвхөн `console.log("[method] url - ms")`.
- Ачааллын өөр нэг эх үүсвэр: web-ийн polling — `Completion.js` тайлангийн status-г 2 сек тутам (150 удаа ≈ 5 минут), `QPay.js` төлбөрийг 5 сек тутам (10 удаа).
- Answer хадгалах зам (`userAnswer.create`) аль хэдийн batch: нэг exam lookup + `Promise.all` мета + `deleteByIds` / `bulkInsert` / `bulkUpdatePoints` (нэг дуудлагад тогтмол ~9–10 query, хариултын тооноос үл хамаарна). Харин `updateByCode` (шалгалт эхлэх / асуулт авах) 8–11 дараалсан await (замаас хамаарна) + `getQuestions`, мөн bootstrap үүнийг 2 удаа дууддаг — хамгийн олон query-тэй унших зам. `findByAdmin` мөр бүрд 1–2 query (N+1).

Ачааллын бодит хэлбэр (Hire-ийн онцлог — burst): байгууллага / сургууль олон хүнийг нэг цагт шалгалтад оруулна; public QR-г нэг ангид уншуулна → 100–500 хүн 1–2 минутад бүртгүүлж, нэгэн зэрэг эхэлж, ойролцоо цагт дуусгана (end burst) → тайлангийн queue-д 100+ ажил нэг дор → concurrency 1 тул дараалал (N × T), мөн status polling. Хамгийн эмзэг нь тайлангийн pipeline (№7).

Хэмжих сценари (k6):

1. `qr-burst`: N хэрэглэгч `GET /userService/:id/public-info` → `POST :id/public-register` (утас давхардахгүй; 1–2 хувийг давхардуулж dedupe шалгана) — квот / `usedUserCount` race (№8).
2. `exam-start`: `GET /exam/access/:code` + `POST /exam/code/:continue` (bootstrap) — хамгийн олон query-тэй унших зам.
3. `answer-save`: хэсэг тутам `POST /userAnswer`.
4. `end-burst`: N хэрэглэгч ойролцоо цагт `end:true` илгээнэ → `report_logs` мөр үүссэн үү, queue depth, бүх тайлан COMPLETED болох хугацааны хуваарилалт (p50 / p95 / max), гацсан тоо (Pattern A / B).
5. `poll`: `GET /report/:id/status` 2 сек тутам (web-тэй ижил) — polling ачаалал ба `report_logs`-ийн `id OR code` query.
6. `paywall`: `GET /report-access/:code`, `/exam/exam/:code`, `/exam/pdf/:code` (SAFE_MODE-д QPay mock).
7. `admin-read`: results / users жагсаалт (`findByAdmin` N+1).

Профайл: smoke (5 VU × 1 мин) → load (зорилтот VU) → stress (эвдэрч буй цэг хүртэл өсгөнө) → spike (0 → N шууд) → soak (30–60 мин; санах ой / холболтын алдагдал).

Pass / fail (k6 `thresholds`; эхний таамаг — baseline-аар тааруулна): `http_req_failed < 1%`; p95 register < 800 ms, bootstrap < 1.5 s, answer-save < 500 ms, status < 300 ms; end-burst-ийн 95% тайлан ≤ X минутад COMPLETED (X-г бизнесээр тогтооно, default 5 минут); гацсан тайлан = 0. Хажуугийн хяналт: `pg_stat_activity` (холболт), pgbouncer `SHOW POOLS`, Node event-loop lag (`perf_hooks.monitorEventLoopDelay`), `docker stats`, OOMKilled / RestartCount, BullMQ `getJobCounts`, `error_logs` тоо.

Хаана ажиллуулах: prod биш. Prod-той адил stack-г (postgres + pgbouncer + redis + core + report) local эсвэл түр VPS дээр босго (№1-ийн local-prod + SAFE_MODE), `mem_limit`, `cpus`, `DB_POOL_MAX`, pgbouncer тохиргоог prod-той ижил болго. k6-г тусдаа машинаас (Mac эсвэл түр VM) ажиллуул — load generator өөрөө хэмжилтийг мушгихгүй. Prod дээр зөвхөн smoke (5 VU). Report VPS-ийн Traefik IP whitelist-д generator-ийн IP-г нэм эсвэл сүлжээ дотроос ажиллуул; №15-ийн allowlist идэвхжсэн бол тест хийх stack-ийн (staging) allowlist-д мөн нэм (prod-д ачааллын тест хийхгүй).

Аюулгүй байдал: Resend / QPay / e-barimt / S3 fake; тест өгөгдлийг `loadtest_` prefix-тэй assessment / service-д үүсгэж дараа нь цэвэрлэ (`loadtest/cleanup.sql`); DB dump нэргүйжүүлсэн.

Хийх:

- [ ] `loadtest/` (k6 скриптүүд + README): `lib/client.js`, 7 сценари, `thresholds.json`, тест дата бэлтгэгч (N exam code эсвэл `count` их public QR service үүсгэнэ).
- [ ] Baseline хэмжилт — №7-P1 ба 0.2-ын ӨМНӨ ба ДАРАА хоёр удаа (өөрчлөлтийн үр дүнг тоогоор харуулна).
- [ ] Хэмжилтийн endpoint: hire_report-д `GET /queue/stats` (`getJobCounts` + хамгийн хуучин хүлээгдэж буй job-н нас) — №11-ийн Phase 3-тай нэг.
- [ ] Ачааллын тайлан (№12-ын загвар): багтаамж (хамгийн их зэрэг шалгуулагч, тайлан / минут), bottleneck, өөрчлөх тохиргоо.
- [ ] (Сонголт) nightly smoke load (30 VU × 2 мин) — threshold нь regression шалгана.

Хэмжээ: M (скрипт + орчин) + шинжилгээ үргэлжилнэ. Хамаарал: №1, (№7-P1, 0.2).

## 11. Гол flow-уудыг admin-аас хянах, эхний шатанд system role-той хүн л харна (шинэ жагсаалтын №3)

Одоогийн байдал (шалгасан):

- Infra түвшин байгаа: `ops/shared/healthcheck.sh` (uptime), `error-monitor.sh` (app-level `errors-YYYY-MM-DD.jsonl`-ийн огцом өсөлт → `ALERT_WEBHOOK`), `find-stuck-reports.sh` / `check-report-status.sh` (гацсан тайлан, `psql`-ээр гараар), `ops/monitoring-logging-report.md`.
- Бүтээгдэхүүний flow түвшний харагдац БАЙХГҮЙ. `error_logs` хүснэгт prod-д бий (`AllExceptionsFilter`, `unhandledRejection` handler бичнэ) боловч уншдаг endpoint / admin хуудас байхгүй (`error-logs` модуль зөвхөн entity + module + service).
- Admin: Next.js 15 + antd 5 (chart сан байхгүй), menu нь статик массив (`components/Menu.js`), хуудас `app/(main)/<route>/page.js` + `components/<Name>.js`, core-той server action (`"use server"`, Bearer token)-оор ярина. `middleware.js` role 10 / 40 / 50-г нэвтрүүлнэ; `Header.js` role-ийн шошго харуулна.
- Role: `Role` enum — 10 super_admin, 20 client, 30 organization, 40 admin, 50 tester. Core-д `@SUPER()` (зөвхөн super_admin) decorator бэлэн (`role.decorator.ts`). Тоон харьцуулалт `role <= 40` зөвхөн нэг газар (`assessment.service.ts` L107) — шинэ role нэмэх аюулгүй боловч шаардлагагүй.

"System role" — санал: эхний шатанд `SUPER_ADMIN` (role 10) ганцаараа:

1. core `@SUPER()` (жинхэнэ хаалт);
2. admin Menu-д "Хяналт" зөвхөн `session.user.role === 10`-д харагдана, хуудас дээр ч шалгаж redirect хийнэ;
3. `MONITOR_ROLES=10` env (core) — ирээдүйд admin (40) / tester (50)-д нээхэд код өөрчлөхгүй.

Тусдаа "system" аккаунт хэрэгтэй болбол шинэ role тоо нэмэхээс илүү `user.permissions` (эсвэл `isSystem` boolean) — шаардлагатай болсон үедээ.

Хянах гол flow-ууд (6):

1. Шалгалтын funnel: бүртгэгдсэн (`exam` үүссэн) → эхэлсэн (`userStartDate`) → дуусгасан (`userEndDate`) → тайлан бэлэн (`report_logs` COMPLETED / SENT) → үр дүн үзсэн (`reportViewedAt`) → PDF татсан / төлсөн (`report_access` PAID). Assessment / байгууллага / огноогоор; drop-off харагдана.
2. Public QR: бүртгэл, квот (`count`, `usedUserCount`), 402 татгалзсан, dedupe, дуусаагүй үлдсэн.
3. Тайлангийн pipeline: `report_logs.status`-аар тоо, гацсан (Pattern A: мөргүй; Pattern B: non-terminal ба `updatedAt` > 10 мин), FAILED + `error`, дуусах хугацааны p50 / p95, сүүлд COMPLETED болсон цаг (report VPS амьд эсэх).
4. Төлбөр: pending / paid / failed invoice (`report_access`, `transaction`, `payment`), QPay callback ирээгүй pending > 15 мин, wallet цэнэглэлт.
5. Алдаа: `error_logs` сүүлийн 24 цаг — статус / URL / message-ээр бүлэглэсэн top 20, 5xx хувь.
6. Систем эрүүл мэнд: DB latency, materialized view-ийн шинэлэг байдал, report VPS-ийн `GET /check` (hire_report-д бий), хамгийн хуучин хүлээгдэж буй тайлан.

Phase 1 (M) — шинэ хүснэгтгүй, унших-л:

- Core `MonitorModule` (`@SUPER()`): `GET /monitor/overview?range=24h|7d`, `/monitor/funnel`, `/monitor/reports?state=stuck|failed`, `/monitor/payments`, `/monitor/errors`, `/monitor/services` (квот дуусах дөхсөн), `/monitor/health`. Бүгд time-bounded (`createdAt >= now() - range`), 30–60 с in-memory cache (polling-ийг үржүүлэхгүй), `SET LOCAL statement_timeout`, индекс (`report_logs(code)`, `report_logs(status, "updatedAt")`, `exam("userEndDate")`, `error_logs(timestamp)`) — №13-ын migration-оор.
- Admin: `app/(main)/monitor/page.js` + `components/Monitor.js`: KPI карт (antd `Statistic`), funnel (antd `Progress` / хүснэгт), гацсан тайлангийн хүснэгт (код, нас, төлөв, error), алдааны хүснэгт; 60 с auto-refresh; range сонголт. Chart сан нэмэхгүй.
- `ops/shared/find-stuck-reports.sh`-ийн Pattern A / B SQL-ийг эх сурвалж болго — нэг л тодорхойлолт.
- Тест: endpoint бүрд role тест (super_admin OK; admin / tester / client / organization 403) + seed дата дээр үр дүнгийн snapshot.
- PII-г хамгийн бага харуул (код, assessment, огноо); нэр / имэйл / утас хэрэгтэй бол зөвхөн super_admin-д, дарж нээсэн үед.

Phase 2 (M–L): `flow_event` хүснэгт (`ts, flow, step, exam_code, service_id, assessment_id, ok, duration_ms, meta jsonb`) + fire-and-forget emitter (`try/catch`, batch; гол flow-г хэзээ ч эвдэхгүй) — `exam.created`, `exam.started`, `section.saved`, `exam.ended`, `report.enqueued / started / completed / failed`, `payment.invoice / paid`, `qr.register / denied`. Дараа нь алхам хоорондын хугацаа, хаагдсан шалтгаан; 90 хоногоос хуучныг цэвэрлэнэ; Phase 1-ийн тоог SQL-ээс тооцсонтой харьцуулж баталгаажуулна; хэн хараа audit.

Phase 3 (M): алерт (`error-monitor.sh`-ийн `ALERT_WEBHOOK` механизм эсвэл core-оос шууд): гацсан тайлан > N, FAILED > N / цаг, 5xx > X%, квот < 5, QPay pending > 15 мин; hire_report `GET /queue/stats`; admin-д "Дахин боловсруулах" (№7 retrigger, №14 ops endpoint) товч; №14-ийн ops үйлдлүүд (хэн, хэзээ, аль код) энд audit-аар харагдана.

Хамаарал: Phase 1 нь өөр юунаас ч хамаарахгүй, deploy-ын дараах эхний ажил байж болно (индексүүд нь №13-A-тай хамт). Phase 3-ийн retry товч нь №7-P2-той хамт.

## 12. Feature deploy бүрд documentation бичих дадал (шинэ жагсаалтын №4)

Одоогийн байдал (шалгасан):

- 5 repo бүр зөвхөн default `README.md`-тэй; `docs/`, CHANGELOG, CONTRIBUTING, PR template байхгүй. studio-д `AGENTS.md` / `CLAUDE.md` бий.
- Commit-ийн ихэнх нь "update" (core 1079 / 1188 нь ≤ 8 тэмдэгт; conventional-commit core 15, hire_report 2, web 5, admin 3) → түүхээс "юу, яагаад" уншигдахгүй, release notes автоматаар гарахгүй.
- Сайн баримтууд байгаа боловч repo-оос ГАДНА: Hire root дахь `hire_audit_2026-09-06.md`, `hire_monetization_implementation.md`, `hire_monetization_summary.md`, `vps-migration-runbook.md`; `ops/` (compose, скриптүүд, `monitoring-logging-report.md`). `ops` ба Hire root git repo БИШ → түүх, review, rollback байхгүй; compose дахь image tag нь prod-ын бодит "deploy бүртгэл" боловч хувилбарлагдаагүй.
- Claude Project ("Hire")-д баримтууд хадгалагдаж эхэлсэн — унших зорилгоор сайн, гэхдээ эх сурвалж (source of truth) биш.

Санал (хөнгөн, дадал болохоор): нэг `hire-docs` repo (эсвэл `ops`-г git болгож дотор нь `docs/`); markdown + YAML front-matter:

```
docs/
  roadmap.md                  # Now / Next / Later — features/*-с script-ээр үүснэ
  features/2026-09-report-paywall.md   # 1 feature = 1 файл (загвар доор)
  releases/v1.2.0.md          # release notes
  runbooks/                   # vps-migration, stuck-reports, restore, rollback
  decisions/                  # 5–10 мөр (яагаад X-г сонгосон)
  reports/                    # audit, backlog, ачааллын тайлан
```

Feature doc загвар (`docs/features/_template.md`):

- Front-matter: `title`, `status` (idea | planned | in-progress | shipped), `owner`, `created`, `shipped_in` (v1.2.0), `repos` [core, web], `prs` [url], `flags_env`, `db_changes` (yes / no), `roadmap_area`.
- Хэсгүүд: (1) Асуудал / зорилго (1–3 мөр); (2) Шийдэл ба шийдвэр (юу сонгосон, яагаад, юуг сонгоогүй); (3) Өөрчлөгдсөн зүйл (repo / branch / PR, endpoint, UI); (4) DB өөрчлөлт (DDL, migration id, rollback); (5) Env / тохиргоо / flag; (6) Deploy дараалал ба rollback; (7) Тест (юу нэмсэн, гараар яаж шалгах); (8) Хэмжих үзүүлэлт (№11-д харагдах metric); (9) Мэдэгдэж буй хязгаарлалт / дараагийн алхам.

Release note загвар: Highlights (хэрэглэгчид харагдах өөрчлөлт); repo тус бүрийн SHA / tag; migration; env шинэ / өөрчлөгдсөн; deploy дараалал; smoke шалгалт; rollback; мэдэгдэж буй асуудал. (Энэ doc-ийн A хэсэг нь v1.2.0-ийн эхний release note-ын түүхий эд болно.)

Дадал болгох механизм:

1. Definition of Done: feature-ийн PR = (a) feature doc холбоос / шинэчлэл, (b) тест, (c) DDL нь migration-д, (d) харах metric / лог.
2. Repo бүрд `.github/pull_request_template.md` — дээрх checklist (10 орчим мөр).
3. Squash-merge + PR гарчиг conventional (`feat:` / `fix:` / `perf:` / `docs:`): түүхийг дахин бичихгүйгээр зөвхөн PR title-аар changelog гарна. `scripts/release-notes.sh v1.1.0..v1.2.0` нь commit / PR гарчгийг prefix-ээр бүлэглэж repo бүрээр хэвлэнэ; "Highlights"-ыг гараар нэмнэ.
4. `roadmap.md`-г feature front-matter-с `scripts/roadmap.sh`-ээр үүсгэнэ → нэг эх сурвалж; сарын тайланд дахин ашиглана ("энэ сард shipped: …, metric: …").
5. Claude-тай ажиллах урсгал: feature-ийн session дуусахад feature doc + release note-ын ноорог энэ загвараар үүсгэнэ (хүсвэл skill болгож өгнө).
6. `ops`-г private git repo болго: compose / скриптүүдийн өөрчлөлт review-тэй, rollback-тэй; нууц утга `.env` (gitignore)-д — compose дахь plaintext нууц үгийг (pgbackup) гарга.
7. Хуучин 4 md-г `docs/reports/`, `docs/runbooks/` руу зөө; v1.1.0 / v1.2.0-ийн release note-ыг ЭНЭ deploy-ын үеэр эхний баримт болгож бич.

Хэмжээ: S (загвар, PR template, repo) + үргэлжлэх дадал. Хамаарал: байхгүй — ЭХЛЭЭД хийнэ; бусад ажил бүр энэ загварыг ашиглана.

## 13. Performance сайжруулахын тулд DB ба flow дээр өөрчлөлт хийх боломж (шинэ жагсаалтын №5)

Хоёр тал: (A) өөрчлөлтийг АЮУЛГҮЙ хийх механизм (суурь); (B) хийх бодит сайжруулалтууд (measurement-first).

### 13-A. Өөрчлөх боломжийн суурь (аливаа perf ажлын өмнө)

Одоогийн байдал (шалгасан):

- `synchronize: false`, migration runner БАЙХГҮЙ. DDL 3 газар: (1) `perf-bootstrap.ts` (boot бүрд идемпотент, алдааг залгина — зөвхөн `⚠️ perf-bootstrap statement failed` лог), (2) repo-д commit хийсэн ганц удаагийн `.sql` (v1.2.0-д `fix_answer_category_fk.sql`, `fix_assessment_delete_fk_2.sql` устгагдаж `_to_delete/backfill_assessment_formulas_224.sql` нэмэгдсэн) — prod-д хэрэглэгдсэн эсэх repo-с харагдахгүй, (3) prod дээр гараар. `questionRule`-ийн DDL repo-д огт байхгүй (prod dump-д бий).
- Схем drift-ийг илрүүлэх арга байхгүй; hire_report ижил DB-г өөрийн entity-тэй уншдаг (drift 2 талтай).
- Postgres: `pg_stat_statements` идэвхгүй (compose `command`-д `shared_preload_libraries` алга) → аль query удаан байгааг хэмжих боломжгүй; `log_min_duration_statement` тохируулаагүй.
- `statement_timeout`: app `extra.statement_timeout` (30 с) тавьдаг ч pgbouncer-ийн `IGNORE_STARTUP_PARAMETERS`-д `statement_timeout` бий → pgbouncer-ээр дамжихад DB талд үйлчилдэггүй байж болзошгүй (`SHOW statement_timeout`-аар шалга); `query_timeout` (35 с) нь зөвхөн клиент талд.
- Индекс: 2026-06-17 prod dump-д зөвхөн 10 индекс (perf-bootstrap-ийнх + `questionRule`). `report_logs.code`-д индекс БАЙХГҮЙ, гэтэл status polling / paywall / PDF бүр `WHERE id = $1 OR code = $1` (`report.log.dao.ts` L30–38) хийнэ → хүснэгт өсөхөд seq scan. `exam("userEndDate")`, `exam.email / phone` индексгүй.

Санал:

- [ ] TypeORM-ийн өөрийн migration ашигла (шинэ tool хэрэггүй): `migrations: ['dist/migrations/*.js']`, `migrationsRun: true` (эсвэл deploy алхмаар `migration:run`); нэг core container учир advisory lock шаардлагагүй. Migration 0001 = одоогийн `perf-bootstrap` (идемпотент тул prod-д аюулгүй), 0002 = `questionRule` + FK cascade-ууд (алдагдсан скриптүүд) + `report_logs(code)` гэх мэт шинэ индекс. `CREATE INDEX CONCURRENTLY` нь transaction-гүй migration (`transaction: false`) шаардана.
- [ ] CI-д drift шалгалт: хоосон Postgres дээр migration-уудыг ажиллуул → `typeorm schema:log` (entity-г DB-тэй харьцуулж SQL хэвлэдэг, DB өөрчлөхгүй) хоосон биш бол fail.
- [ ] Дүрэм: DDL зөвхөн migration-оор; core DDL-г эзэмшинэ, hire_report DDL хийхгүй (өөрийн entity-г core-той тааруулах тест).
- [ ] Хоёр үе шаттай (expand / contract) өөрчлөлт: багана нэмэх → код хоёр талыг дэмжих → өгөгдөл шилжүүлэх → хуучныг хасах. Том хүснэгтэд backfill-ийг багцаар.
- [ ] Deploy-оос өмнө backup (pgbackup бий) + `pg_dump -s` схем snapshot-ыг release note-д хавсарга.
- [ ] Flow toggle (feature flag), хөнгөн: env (`SAFE_MODE`, `RUN_WORKER`, `REPORT_PDF_LAZY`, `MONITOR_ROLES`) + ганц `system_setting(key, value jsonb)` хүснэгт (admin Monitor-оос super_admin өөрчилнө, 60 с cache). Зорилго: код deploy хийхгүйгээр flow-г асаах / унтраах / буцаах.
- [ ] Хэмжилт: `pg_stat_statements` идэвхжүүл (`shared_preload_libraries='pg_stat_statements'` + restart + `CREATE EXTENSION`), `log_min_duration_statement = 500ms`; `LoggingInterceptor`-ыг JSON (route pattern, status, ms) болгож route-оор p95 гаргана (№11 health-д).

### 13-B. Гүйцэтгэлийн сайжруулалт (ач холбогдол / эрсдэлээр; бүгд №10-ын хэмжилтээр баталгаажна)

1. [Өндөр, M] hire_report N+1 (0.2): мөр бүрд query + detail тус бүр INSERT. Хамгийн том, эрсдэл багатай (parity тесттэй).
2. [Өндөр, L] Report pipeline бүтэц (№7-P2): calc ба PDF салгах, API ба worker салгах, PDF-ийг lazy (татахад), concurrency тааруулах; `regenerate/:code`-г нийтэд хаах (0.3), №14-т queue-тэй болгох.
3. [Өндөр, S] Индекс: `report_logs(code)`, `report_logs(status, "updatedAt")`, `exam("userEndDate")`, `error_logs(timestamp)`; `exam(phone)` / `exam(email)`-ийг `findByServiceAndContact`-ийн EXPLAIN-оор шийд.
4. [Дунд, M] Шалгалт эхлэх зам: bootstrap-ийн `updateByCode` 2 удаа (№3-т нэгтгэнэ); `updateByCode` 8–11 дараалсан await (замаас хамаарна) + `getQuestions` (category, `findForExam`, rules, prior answers, MV) — parallel / ганц query, статик хэсгийг кэшлэ (тестийн сангийн агуулга ховор өөрчлөгддөг; `mv_question_answer_full` refresh хийгдэх үед кэшийг хүчингүй болго; Redis эсвэл in-memory LRU).
5. [Дунд, S] `ORDER BY RANDOM()` (`question.dao.ts` L80): `questionShuffle` үед хүсэлт бүрд шинэ дараалал → буцаж ороход өөр асуулт (№3), DB талд илүү ажил. Шийд: шалгалт (exam)-ийн seed-ээр тогтвортой (жишээ `ORDER BY md5(id::text || :code)`) эсвэл эхний сонголтыг `examDetail`-д хадгалж дахин ашиглах.
6. [Дунд, S] `examDetail`: зөвхөн бичигддэг + дахин нээлт бүрд давхардана (№3) → unique `(examId, questionId)` + `ON CONFLICT DO NOTHING`, эсвэл бичихээ болих; №3-т "үзүүлсэн асуултын эх сурвалж" болгох бол хадгална.
7. [Дунд, S] Polling: `Completion.js` 2 с × 150 → backoff (2 → 3 → 5 → 10 с) эсвэл SSE; QPay 5 с × 10 (зохистой).
8. [Дунд, M] Admin жагсаалтын N+1: `findByAdmin` мөр бүрд `getByEmail` + `resultDao.findOne` (+ мөр бүрд `console.log`) → нэг JOIN / `IN()`; шинэ `findAllNew`-ыг ашигла.
9. [Дунд, S] Тохиргоо: `DB_POOL_MAX` (default 10)-ийг pgbouncer (`DEFAULT_POOL_SIZE` 100, Postgres `max_connections` 200)-той харьцуулж №10-аар тааруул; report VPS ↔ DB сүлжээ (Postgres host-д `6432:5432`-оор publish хийгдсэн, pgbouncer-ийг тойрсон шууд зам — UFW / IP whitelist-ээс хамаарна; latency хэмж, боломжтой бол private network / IP whitelist); report `cpus: 1.5`, `mem_limit: 2g`.
10. [Бага] `console.log` их (`findByAdmin` мөр бүр, `exam create dto`) → prod-д log volume / PII; structured logger.

Хамаарал: 13-A нь DDL-тэй бүх ажлын (№2, №3, №4 / №6, №11 Phase 2) шаардлага. 13-B-г №10-ын baseline-аар эрэмбэл. Эрсдэл: том хүснэгтэд индекс үүсгэх (`CONCURRENTLY`), materialized view refresh, drift.

## 14. Ops endpoint-ууд: recalculate / regenerate / upload (гурав дахь жагсаалтын №1)

Хэрэглэгчийн хэлсэн: "recalculate, regenerate-ээс гадна uploads хийдэг endpoint хэрэгтэй". Би ингэж ойлгосон: гацсан / эвдэрсэн тайланг гараар засах 3 үйлдэл — (1) үр дүнг дахин бодох, (2) PDF-г дахин үүсгэх, (3) өөр газар (жишээ нь local) үүсгэсэн PDF-г prod-ын report серверт тавих — endpoint хэлбэрээр хэрэгтэй, гэхдээ аюулгүй байх ёстой. "Upload" нь өөр зүйл (зураг / файл) бол Q13-ыг үз.

Одоогийн байдал (шалгасан):

- `GET /exam/recalculate/:code` (core, `@Public()`, `exam.controller.ts` L183–189): `resultDao.delete(code)` (result мөрийг устгана) → hire_report `GET /calculate/:code`. Transaction, queue, `report_logs` шинэчлэлт байхгүй. hire_report-ийн `calculateExamById` алдааг залгидаг (`catch → console.log`) тул бодолт унасан ч үр дүн устсан хэвээр, хариу 200.
- `GET /exam/regenerate/:code` (core, `@Public()`, L191–210): hire_report `GET /test/:code`-г шууд stream хийнэ. PDF-г API процесс дотор PDFKit-ээр зурж хариу болгон илгээнэ, `uploads/`-д ХАДГАЛАХГҮЙ (`getPdf` нь зөвхөн `doc` буцаана; `uploads/report-<code>.pdf`-г зөвхөн queue-ийн `generateAndUpload` бичдэг). Иймд `regenerate` нь prod дээр хадгалагдсан PDF-г засаж чадахгүй — зөвхөн шинэ хуулбар татна.
- Upload endpoint БАЙХГҮЙ. PDF нь зөвхөн report VPS-ийн диск (`/var/lib/hire/uploads` → container `/app/uploads`)-д байдаг (core VPS-ийн ижил нэртэй хавтас нь зураг агуулдаг — өөр машин). Иймд local-д үүсгэсэн PDF-г `scripts/upload-report-files.sh`-ээр (SSH / scp, root эрх) тавьдаг. Скрипт нь сайн хамгаалалттай: PDF header / `%%EOF` шалгалт, sha256 тулгалт, `.part` → атомик `mv`, дарж бичихдээ `.bak`, disk зайн шалгалт, `--dry-run`. Эдгээр шалгалтыг endpoint руу шилжүүлэх нь зөв.
- core-ийн одоо байгаа upload endpoint-ууд зурагт зориулагдсан: `POST /upload` (`@ADMINS()`, ≤ 8 файл, S3 + core-ийн local `uploads/`) ба `POST /pdf-template/upload-image` (Studio). Report PDF-д хэрэглэгдэхгүй.
- hire_report-д auth огт байхгүй (audit 2.4): `POST /`, `GET /calculate/:code`, `GET /test/:code`, `GET /file/:file`, `GET /check` — зөвхөн Traefik IP whitelist хамгаална.

Асуудал:

1. Public GET-ээр өгөгдөл өөрчлөх: `recalculate` устгана, гэвч GET — link prefetch, crawler, `<img>` tag-аар ч ажиллана (CSRF).
2. Delete-then-compute, transaction-гүй → унасан үед үр дүн алдагдана (№7 (d)).
3. `regenerate` нь queue-гүй, API процессийн CPU-г эзэлнэ (№7 (j)) ба paywall-ийг тойрсон PDF өгнө (0.3 b).
4. Гараар зассан ч `report_logs` төлөв өөрчлөгдөхгүй → тайлан "гацсан"-аар үлдэж №11-ийн тоолуур / `find-stuck-reports.sh`-д дахин харагдана.
5. Upload-г SSH-аар хийх нь root эрх шаардана, хэн хийснийг бүртгэхгүй.
6. Шинэ upload endpoint-ийн өөрийн эрсдэл: файлын нэрийг клиентээс авбал path traversal (0.4 a), том файл (core body limit 100mb), MIME хуурамч, дарж бичих.

Санал: нэг `OpsModule` (core) — бүх үйлдэл нэг газар, нэг эрх, нэг audit.

| Endpoint | Үүрэг | Тэмдэглэл |
|----------|-------|-----------|
| `POST /ops/report/:code/recalculate` | Үр дүнг дахин бодно | Шинийг нь бодоод дараа нь хуучныг нь солино (нэг transaction, №7-P1); `pg_advisory_xact_lock(code)` |
| `POST /ops/report/:code/regenerate` | PDF-г дахин үүсгээд `uploads/`-д ХАДГАЛНА | Queue-ээр (result байвал зөвхөн PDF алхам); `.part` → rename; `report_logs` → COMPLETED |
| `PUT /ops/report/:code/pdf` | Гаднаас PDF оруулна (multipart `file`, `sha256` заавал биш) | Доорх дүрмүүд |
| `POST /ops/report/:code/retry` | Queue-д дахин оруулна (№7-P2-ын retrigger) | Нэг code-д нэг л идэвхтэй ажил |
| `GET /ops/report/:code` | Оношлогоо: `report_logs`, файл байгаа эсэх / хэмжээ / sha256, result мөрийн тоо | Унших-л |

Эрх ба хамгаалалт (давхар):

1. Аппликейшн: `@SUPER()` (default; `OPS_ROLES` env-ээр admin(40)-д нээж болно) + Bearer JWT.
2. Сүлжээ: Traefik дээр `PathPrefix(/api/v1/ops/)` → IP allowlist (№15). admin UI-аас дуудвал admin server-side дотоод URL-аар ирэх тул allowlist-д нөлөөлөхгүй.
3. core ↔ hire_report: hire_report-д auth байхгүй тул Traefik whitelist дээр нэмж `X-Internal-Key` (`INTERNAL_API_KEY` env). Core `PUT /ops/report/:code/pdf` нь файлыг hire_report-ийн `PUT /internal/files/report-<code>.pdf` руу шууд stream хийнэ.
4. Audit: хэн, хэзээ, аль код, ямар үйлдэл, үр дүн — шинэ `ops_action_log` хүснэгт (эсвэл №11 Phase 2-ын `flow_event`, `flow='ops'`); admin "Хяналт" хуудсанд харагдана.
5. Rate limit: код тутамд нэг идэвхтэй ажил, нийт минутанд ≤ 10.

Upload-ын дүрэм (скриптийн шалгалтуудыг хэвээр хадгал):

- Нэрийг клиентээс авахгүй: `report-<code>.pdf`, `code` нь `^\d{6,20}$`, мөн тухайн code-той `exam` бодитоор байх ёстой.
- `%PDF-` header, төгсгөлд `%%EOF`, хэмжээ ≤ 20 MB (тохируулж болно); `Content-Type`-д итгэхгүй, magic byte шалга.
- `sha256` өгвөл тулгана; `.part` руу бичээд `rename` (service хагас файл уншихгүй); дарж бичихийн өмнө `.bak-<огноо>` хадгал; disk-ийн сул зайг шалга.
- Амжилттай бол `report_logs` → COMPLETED (progress 100) — тэгэхгүй бол "гацсан"-аар үлдэнэ.
- Хариу: `{ code, size, sha256, replaced, backup? }`.
- `scripts/upload-report-files.sh` нь endpoint-ийг curl-ээр дуудах жижиг wrapper (`scripts/ops-report.sh recalc | regen | upload <code>`) болно — SSH, root эрх хэрэггүй.

Admin UI (№11-ийн хуудастай нэг): үр дүнгийн хүснэгтэд (super_admin-д) "Дахин бодох", "PDF дахин үүсгэх", "PDF оруулах" үйлдэл, идэвхтэй ажлын төлөв.

Хуучин route-ууд: `GET /exam/recalculate|regenerate/:code`-г шилжилтийн хугацаанд `@ADMINS()`-тэй үлдээж, deprecation лог бичээд ~2 долоо хоногийн дараа устга.

Урт хугацаанд: PDF-г report VPS-ийн ганц дискэнд хадгалахаа болиод object storage (S3 — AWS түлхүүр бэлэн)-д хадгалбал upload нь presigned PUT болж, backup / олон instance-ийн асуудал шийдэгдэнэ (№7 (i)).

Хийх:

- [ ] (Өнөөдөр, код өөрчлөхгүй) Traefik дээр `/api/v1/exam/recalculate/`, `/api/v1/exam/regenerate/` path-ыг IP allowlist-д (№15-P0-b).
- [ ] (Өнөөдөр / дараагийн deploy) `@Public()` → `@ADMINS()` (0.3 b).
- [ ] `OpsModule` + 5 endpoint + guard + audit + rate limit; `OPS_ROLES`, `INTERNAL_API_KEY` env.
- [ ] hire_report: `PUT /internal/files/:name` (`X-Internal-Key`, нэрийн regex, атомик rename, `.bak`); `calculateExamById` алдааг шид; `regenerate` → queue + `generateAndUpload` (атомик).
- [ ] `scripts/ops-report.sh`; `upload-report-files.sh`-ийг deprecated тэмдэглэ.
- [ ] Admin UI-ийн товчнууд (super_admin).
- [ ] Тест (№9): эрхгүй хэрэглэгч 403; `../`, буруу нэр, PDF биш файл 400; давхар upload идемпотент; `report_logs` COMPLETED болно.
- [ ] Runbook (№12): "Гацсан тайланг яаж засах вэ" (`docs/runbooks/stuck-report.md`).

Хэмжээ: M (backend + script) + S (admin UI). Хамаарал: 0.3 / 0.4 (эхний алхам), №15 (сүлжээний хамгаалалт), №7-P2 (retry), №11 (audit / UI).

## 15. API-г report / web / admin VPS ба цөөн IP-аас л хандах болгох (гурав дахь жагсаалтын №2)

Зорилго: `api.hire.mn`-ийг интернэтэд нээлттэй байлгахгүй, зөвхөн (1) report VPS, (2) web / admin (server-side), (3) тоотой хэдэн IP (хөгжүүлэгч / ажилтан), (4) заавал нээлттэй байх цөөн path (жишээ нь QPay callback)-аас хандах боломжтой болгох. Энэ нь 0.3 / 0.4 / №14-ийн нээлттэй endpoint-уудын ихэнхийг код засахаас өмнө интернэтээс хааж өгнө (defense-in-depth). Гэхдээ логикийн нүхийг засахыг орлохгүй (доорх "Хязгаарлалт").

Одоогийн байдал (шалгасан — `vps-migration-runbook.md`, ops compose, код):

- Топологи: core VPS-д Traefik v3.6 (80 / 443, Let's Encrypt), core, web, admin, pgbouncer, Postgres, Redis, pgbackup нэг `appnet` сүлжээнд. Router: `api.hire.mn` → core:5000, `hire.mn` → web:3000, `admin.hire.mn` → admin:3001. Report VPS тусдаа: Traefik (порт 4000, TLS-гүй HTTP) + hire_report.
- Загвар бэлэн: report VPS-ийн Traefik нь `ipwhitelist` middleware (`traefik.http.middlewares.report-ip.ipwhitelist.sourcerange`, 3 IP)-ээр hire_report-ийг хамгаалдаг. Core-ийн Traefik нь repo-д байгаа compose-оор IP хязгаарлалтгүй (`api` router-т middleware алга). Гэхдээ file provider (`/etc/traefik/dynamic.yml` ← host-ын `/home/dorjoo/api/dynamic.yml`, repo-д БАЙХГҮЙ) бий — allowlist-г тэнд тодорхойлбол container restart-гүйгээр hot-reload хийнэ.
- web ба admin нь core-той ЯГ НЭГ VPS, нэг docker сүлжээнд → тэдгээрийн server-side дуудлагыг дотоод `http://core:5000/api/v1/`-ээр хийж болно (Traefik / IP огт оролцохгүй). Одоогийн код: web `app/utils/routes.js` = `NEXT_PUBLIC_API_URL || API_URL || "https://api.hire.mn/api/v1/"`; admin = `NEXT_PUBLIC_API_URL || "https://api.hire.mn/api/v1/"`; CI-д `NEXT_PUBLIC_API_URL` build-arg байхгүй → prod-д server-side аль URL-аар дууддаг нь `.env`-ээс хамаарна (Q16). Public URL-аар дуудвал өөрийн VPS-ийн hairpin болно (Traefik-д эх IP нь Docker gateway / VPS-ийн IP, Cloudflare-ийн IP байж болно) тул IP-д тулгуурлах нь найдваргүй.

API-г дуудагчид (кодоос) ба allowlist-д хэрхэн нөлөөлөх:

| # | Дуудагч | Юуг дууддаг | Allowlist-д |
|---|---------|-------------|-------------|
| 1 | web (server action, route handler, next-auth) — core VPS | бараг бүх route | Дотоод URL (IP хэрэггүй) |
| 2 | admin (server action) — core VPS | admin route-ууд | Дотоод URL |
| 3 | hire_report → core — report VPS | `GET /report/mail/:code`; `feature/v1.2.0`-д Studio-ийн зураг `GET /pdf-template/image/:key` (загварт бүтэн URL-аар хадгалагдсан) | Report VPS-ийн IP |
| 4 | Шалгуулагчийн browser → core (ШУУД) | `file/:file` (зураг, асуултын зураг, icon, blog, sample report PDF — `getFileUrl()` нь `/api/file/` proxy-г биш API-г шууд заадаг); `userService/:id/public-info`, `public-register` (`web/app/exam/public/[id]/page.js` — `"use client"`, axios) | ⚠ БЛОКЛОГДОНО — P1-ээр засна |
| 5 | И-мэйлийн холбоос → browser → core | `user/email/confirm/:email` (`email.service.ts` L732 API-г хатуу заана) | ⚠ БЛОКЛОГДОНО — P1 |
| 6 | Admin ажилтны browser → core (ШУУД) | `file/:file` (BlogEditor, Preview, Settings, Report … `${api}file/`) | Ажилтны IP (эсвэл `file/*` exception) |
| 7 | Studio | 13 route handler (server-side); `RightPanel.tsx` нь зураг upload-ийн дараа `${API}pdf-template/image/<key>` бүтэн URL-ыг загварт хадгалж, canvas preview-д browser татна | Studio server-ийн IP, ажилтны IP (D2) |
| 8 | QPay (гадаад) | `GET userService/callback/:invoice/:user`; `QPAY_REPORT_CALLBACK` тохируулсан бол мөн | Path exception (QPay-ийн IP тодорхойгүй) |
| 9 | AI agent (гадаад) | `AI_AGENT_KEY`-тэй route-ууд (жишээ `pdf-template/ai-export/:assessmentId`) | Агентын IP эсвэл path exception (Q18) |
| 10 | Хөгжүүлэгч: Postman, Swagger `/docs`, ops скрипт, ачааллын тест | бүгд | "Цөөн IP" |

Хэрэв "web / admin VPS" нь бодит байдал дээр тусдаа VPS бол тэдгээрийн IP-г мөн нэм — ops compose-д тэд core-той нэг VPS-д байна.

Docker ба UFW (Postgres-д хамаатай):

- `ops/core-vps/docker-compose.yml` нь Postgres-ийг `6432:5432` гэж host-д publish хийсэн (report VPS DB-д шууд холбогддог). Docker нь publish хийсэн портыг өөрийн iptables дүрмээр UFW-ийг тойруулан нээдэг (мэдэгдэж буй зан төлөв; `daemon.json`-д `"iptables": false` алга) → `ops/README.md`-ийн "UFW-ээр хязгаарла" зөвлөгөө найдваргүй байж болзошгүй. Баталгаажуулах: `sudo iptables -S DOCKER` ба гаднаас `nc -vz <core-vps-ip> 6432`. Найдвартай сонголт: `DOCKER-USER` chain-д зөвхөн report VPS-ийн IP-г зөвшөөрөх, эсвэл private network (WireGuard) руу шилжүүлж private IP-д bind хийх.
- Traefik-ийн 80 / 443 нээлттэй байх ёстой тул API-ийн IP хязгаарлалт UFW-д биш Traefik middleware дээр хийгдэнэ.

Хязгаарлалт (юуг хамгаалж, юуг хамгаалахгүй):

- Хамгаална: интернэтээс `api.hire.mn` руу шууд хүрэх ~100 route (admin CRUD, `report/*`, `qpay/*`, `exam/recalculate|regenerate`, `userAnswer/report/*`, `/docs` …) — код засагдтал хамгаалалтын нэмэлт давхарга.
- Хамгаалахгүй: web-ийн server action-аар дамжсан хүсэлт. web нь дотоод URL-аар (эсвэл allowlist-д) байдаг тул нээлттэй хэрэглэгч web-ийн нээж өгсөн үйлдлээр (жишээ нь `checkPayment` invoice replay — 0.3 a, `/api/file/[id]` proxy-оор файл traversal — 0.4 a) core-д хүрсээр байна. Иймд 0.3 / 0.4-ийн код засвар заавал хэрэгтэй.
- Allowlist-д байгаа IP-г эзэмшсэн этгээд (алдагдсан laptop, хуваалцсан сүлжээ) бүх route-д хүрнэ → auth (JWT / role) хэвээр хэрэгтэй.
- Rate limit-ийг орлохгүй: web-ээр дамжсан хүсэлт core-д web container-ийн IP-ээр ирэх тул core талд IP-аар rate limit хийх боломжгүй → `hire.mn` router дээр (Traefik) хий, эсвэл web `X-Forwarded-For` дамжуулна.

Санал (right-sized, 4 үе шат):

**P0 — Ажиглалт (эрсдэлгүй, өнөөдөр эхэлж болно)**

- Traefik-д JSON access log нэм: `--accesslog=true --accesslog.format=json --accesslog.filepath=/var/log/traefik/access.log` (+ host volume, `logrotate`; User-Agent харах бол `--accesslog.fields.headers.names.User-Agent=keep`). Талбар: `ClientHost`, `RouterName`, `RequestMethod`, `RequestPath`, `DownstreamStatus`. 3–7 өдөр цуглуулаад (a) давтагддаг эх IP-үүд, (b) browser-оос шууд ирж буй path-уудыг гарга — allowlist-г таамгаар биш өгөгдлөөр бүрдүүл.
- Cloudflare proxy асаалттай эсэх (Q15): асаалттай бол Traefik CF-ийн IP-г `ClientHost` болгон харна → бодит IP-г авахын тулд `--entrypoints.websecure.forwardedHeaders.trustedIPs=<CF ranges>` + middleware-д `ipStrategy.depth: 1` (эсвэл allowlist-г CF-ийн WAF дүрэм болгон). Access log-ийн `ClientHost`-оос танина.
- **P0-b (код өөрчлөхгүй):** ops path-уудыг тусдаа router-оор allowlist-д хий: `Host(api.hire.mn) && (PathPrefix(/api/v1/exam/recalculate/) || PathPrefix(/api/v1/exam/regenerate/) || PathPrefix(/docs))` → `api-allow`. web / admin эдгээрийг дууддаггүй тул хэрэглэгчид нөлөөлөхгүй; та (ops хэрэглэгч) allowlist-д байгаа IP-ээсээ л дуудна. Хамгийн бага эрсдэлтэй эхний ялалт.

**P1 — Browser-оос API-г шууд дуудахыг зогсоох (код)**

1. И-мэйлийн баталгаажуулах холбоос → `https://hire.mn/auth/confirm?token=…` (web route → server-side дуудлага; 0.4 d-тэй хамт).
2. `getFileUrl()` (`web/app/utils/fileUrl.js`) ба `${api}file/…` (Test.js, Assessment.js, Question.js, Blog.js, news, test/details) → `/api/file/<id>` (proxy аль хэдийн бий; `getFileUrl`-ийн коммент "proxy" гэж бичсэн ч хоёр салбар хоёулаа API-г шууд буцаадаг). Proxy-д `fileId` regex шалгалт (0.4 a). Анхаар: proxy нь файлыг бүхлээр нь санах ойд (`arrayBuffer`) уншиж, 50 файлын FIFO cache-д хадгалдаг тул том PDF / олон зурагт тохиромж муу (харин `Cache-Control: immutable` тул browser / CDN cache хийнэ). Ачаалал / санах ой их бол `GET /file/*`-г `api-public` exception (rate limit-тэй, P2) болгон үлдээх нь хялбар. Admin-ийн browser дуудлага нь ажилтны IP-тэй тул allowlist-д хамрагдана (эсвэл `admin.hire.mn`-г мөн ажилтны IP-д хязгаарла).
3. `web/app/exam/public/[id]/page.js`: `public-info`, `public-register`-г server action болго. Burst ачаалал (№10) web container руу шилжинэ — ачааллын тестээр шалга; эсвэл эдгээр 2 route-г public exception + rate limit-тэй үлдээж болно (Q19).
4. web / admin-ийн server-side API URL-г дотоод `http://core:5000/api/v1/` болго: `routes.js`-д серверт `process.env.API_URL_INTERNAL`, browser-т public URL (`NEXT_PUBLIC_*` нь build үед шингэдэг тул server-side-д тусдаа, шингээгүй env хэрэгтэй).
5. Studio: server-side route handler-уудын IP-г allowlist-д (D2); `pdf-template/image/*`-г browser preview-д хэрэгтэй тул ажилтны IP-д нээх (эсвэл `image/*`-ийг GET exception). Загварт хадгалагдсан `imageUrl` нь бүтэн URL тул hire_report-ийн татах зам (report VPS → `api.hire.mn`) хэвээр ажиллана.

**P2 — Allowlist идэвхжүүл (Traefik)**

- `dynamic.yml`-д middleware (Traefik v3: `ipAllowList`; `ipWhiteList` нь хуучин нэр — report VPS-д ашиглагдаж буй):

```yaml
# /home/dorjoo/api/dynamic.yml — file provider (hot reload)
http:
  middlewares:
    api-allow:
      ipAllowList:
        sourceRange:
          - "<report-vps-ip>/32"
          - "<staff-ip-1>/32"
          - "<staff-ip-2>/32"
    api-public-limit:
      rateLimit:
        average: 20
        burst: 60
```

- core service-ийн label-ууд (sketch — staging-д туршиж баталгаажуул):

```yaml
- "traefik.http.routers.api.middlewares=api-allow@file"
- "traefik.http.routers.api-public.rule=Host(`api.hire.mn`) && ((Method(`GET`) && PathPrefix(`/api/v1/file/`)) || PathPrefix(`/api/v1/userService/callback/`))"
- "traefik.http.routers.api-public.priority=100"
- "traefik.http.routers.api-public.entrypoints=websecure"
- "traefik.http.routers.api-public.tls.certresolver=letsencrypt"
- "traefik.http.routers.api-public.middlewares=api-public-limit@file"
```

- `api-public` нь allowlist-гүй, rate limit-тэй цөөн exception: `GET /file/*` (зөвхөн GET; 0.4 a засагдсаны дараа), QPay callback. P1-ийн дараа үлдэх бол: `user/email/confirm/*` (шилжилтийн хугацаанд), public QR-ын 2 route.
- Түгжигдэхээс сэргийлэх: `dynamic.yml` нь single-file bind mount тул засахдаа файлын inode-ыг солихоос болгоомжил (`sed -i`, зарим editor rename хийдэг — container хуучин файлыг харсаар үлдэнэ) эсвэл `--providers.file.directory` + хавтас mount руу шилжүүл. Staging: эхлээд `api-test.hire.mn` (шинэ Host rule)-д идэвхжүүл. Rollback: middleware label / `dynamic.yml`-г буцаана (~30 секунд); SSH нь Traefik-с хамааралгүй тул түгжигдсэн ч засаж болно. IPv6: `api.hire.mn`-д AAAA record байвал allowlist-д IPv6-г тооц (эсвэл AAAA-г арилга).
- Шалгалт: allowlist-гүй сүлжээнээс `GET /api/v1/assessment/all` → 403, `GET /api/v1/file/<мэдэгдэж буй icon>` → 200, QPay-ийн туршилтын callback → 200. Allowlist-тэй талаас: web-ийн бүх гол урсгал — QR бүртгэл, шалгалт эхлүүлэх, төлбөр, и-мэйл баталгаажуулалт, зураг ачаалалт; admin — нэвтрэх, зураг upload, preview; report VPS — тайлан COMPLETED болж `report/mail/:code` дуудагдах.
- "Цөөн IP" динамик (гэрийн интернэт) бол: WireGuard / Tailscale-ийг core VPS дээр тавьж нэг тогтмол egress IP / subnet-ийг allowlist-д (P3).

**P3 — Дараагийн шат (сонголт)**

- core ↔ report хоорондын дамжуулалт HTTP (порт 4000, TLS-гүй), report → Postgres (6432) шифрлэгдээгүй байж болзошгүй → WireGuard private network (VPS хоорондын `10.x`) руу шилжүүлбэл Postgres-ийг интернэтээс бүр хааж, core-ийн internal route-ыг зөвхөн private interface дээр гаргаж, allowlist-ийн IP хамаарлыг бууруулна.
- Service-to-service `X-Internal-Key` (0.4 b, №14): hire_report → core, core → hire_report.
- `admin.hire.mn` ба Studio-г ажилтны IP-д хязгаарла (зөвхөн ажилтан ашигладаг).
- Traefik `rateLimit` (IP-аар) `hire.mn` router-т (QR burst-ийг тооц, №10-аар тааруул).
- Cloudflare proxy + WAF (сонголт): DDoS, bot хамгаалалт; origin-г зөвхөн Cloudflare-ийн IP-д нээ.
- Allowlist-г git (`ops`, №12) + runbook: IP нэмэх / хасах, түгжигдсэнээс сэргэх, VPS шилжилт (runbook-ийн 15, 23-р алхам)-д allowlist шинэчлэх.

Хийх:

- [ ] P0: Traefik JSON access log + logrotate; Cloudflare proxy эсэх (Q15); prod `.env`-ийн web / admin `API_URL` (Q16).
- [ ] P0-b: `recalculate` / `regenerate` / `/docs`-ыг тусдаа router-оор allowlist-д.
- [ ] P1: email confirm холбоос → web; `getFileUrl()` → `/api/file/`; public QR-ын 2 дуудлагыг server action; web / admin дотоод URL; Studio-ийн browser дуудлага.
- [ ] P2: `dynamic.yml` allowlist + `api-public` router + rate limit; `api-test` дээр туршаад prod.
- [ ] Postgres 6432: `DOCKER-USER` / private bind / WireGuard (UFW-д итгэхгүй) — `nc -vz`-ээр гаднаас шалга.
- [ ] Runbook (№12): `docs/runbooks/api-allowlist.md`.
- [ ] Тест (№9 / №10): allowlist-гүй IP → 403 smoke, path exception → 200, ачаалалд middleware-ийн нөлөө.

Хэмжээ: P0 S; P1 M (4–5 газарт код); P2 S–M; P3 L. Эрсдэл: Дунд — буруу тохиргоо бүх хэрэглэгчийг хааж болно → ажиглалт (P0) + staging + хурдан rollback-аар бууруулна. Хамаарал: 0.4 (file / email), №14 (ops path), №10 (staging-д allowlist), №12 (config-г git-д).

## Бусад анзаарсан зүйл

- `ops/core-vps/docker-compose.yml` (`pgbackup` service) дотор DB нууц үг plain text — env_file/secret руу гаргаж, нууц үгийг солих.
- Audit-д бүртгэлтэй, хэвээр байгаа: Postgres порт интернэтэд ил, rate limit байхгүй, `exam code` = bearer credential, hire_report-д auth байхгүй. Postgres порт: Docker publish хийсэн портыг UFW-ээр хааж болохгүй байж болзошгүй (№15); hire_report-ийн auth-гүй байдал: №14, №15.
- core ↔ report (HTTP :4000, TLS-гүй) ба report → Postgres (6432) дамжуулалт интернэтээр шифрлэгдээгүй байж болзошгүй — PII, `password` hash-тай мөр дамжиж болно (№15-P3: private network / TLS).
- hire_report `feature/v1.2.0`-ийн dynamic renderer (`dynamic-template.renderer.ts`) загварын `imageUrl`-ийг `axios.get`-ээр татдаг, URL-ийн host-д хязгаар байхгүй → SSRF эрсдэл (загварыг зөвхөн Studio эрхтэй хүн засдаг тул бага; host-ийг `api.hire.mn`-д хязгаарлах нь хямд засвар).
- TRUE_FALSE (type 30) асуулт: `Question.js` boolean утга → `publish()`-д тохирох салбар байхгүй, `answers: []` болно — ашиглагдаж байгаа эсэхийг шалга.
- `hire_report/.env`-д `REDIS_HOST` хоёр удаа; `app.module` `envFilePath: .env.development` (файл байхгүй), `BullModule.forRoot` `process.env.REDIS_HOST`-г ConfigModule-оос өмнө уншдаг (core-ийн `load-env.ts`-тэй ижил асуудал).
- Тайлангийн мэйл идэвхгүй: UX-д "имэйлээр ирнэ" гэж бүү бич (эсвэл мэйлийг сэргээ).
- Swagger UI `/docs` нь `setupSwagger` (`src/config/swagger.ts`)-оор нөхцөлгүй, нэвтрэлтгүй асдаг; Traefik `api.hire.mn`-ийн бүх path-г core руу дамжуулдаг тул prod-д ил байж болзошгүй (шалга; хаах эсвэл env-ээр нөхцөлдөө; хамгийн хурдан нь №15-P0-b-ийн IP allowlist). hire_report-д ч Swagger идэвхтэй (`setupSwagger`).
- `main.ts`: CORS `origin: '*'`, JSON / urlencoded limit 100mb, rate limit / helmet / compression байхгүй. Core-д `unhandledRejection` handler бий (`error_logs`-д бичнэ); hire_report-д байхгүй.
- Local backup (`pgbackup`) зөвхөн 7 хоног, offsite байхгүй (compose-ийн коммент).
- `ops` ба Hire root git repo биш (№12): compose дахь image tag, скриптүүд хувилбарлагдаагүй.
- hire_report-ийн AWS env нэр `main` ба `feature/v1.2.0` дээр өөр (A1).

## Хэрэгтэй шалгалтууд (read-only SQL ба shell)

```sql
-- (№2) Аль тест дээр skip дүрэм байна
SELECT a.id, a.name, count(*) AS rules
FROM "questionRule" r
JOIN question q ON q.id = r."targetQuestionId"
JOIN "questionCategory" c ON c.id = q."categoryId"
JOIN assessment a ON a.id = c."assessmentId"
WHERE r.active
GROUP BY a.id, a.name ORDER BY rules DESC;

-- (№2/№3) Эхэлсэн боловч дуусаагүй, 2+ цагийн настай exam
SELECT e.code, e."assessmentName", e."userStartDate",
  (SELECT count(DISTINCT ua."questionCategoryId") FROM "userAnswer" ua WHERE ua."examId" = e.id) AS answered_cats,
  (SELECT count(*) FROM "questionCategory" c WHERE c."assessmentId" = e."assessmentId") AS total_cats
FROM exam e
WHERE e."userEndDate" IS NULL AND e."userStartDate" < now() - interval '2 hours'
ORDER BY e."userStartDate" DESC LIMIT 200;
-- answered_cats = total_cats-1 эсвэл total_cats боловч дуусаагүй бол: №2-ын (1) эсвэл сүүлийн дэлгэц дээр гарсан

-- (№7) Гацсан тайлан: ops/shared/find-stuck-reports.sh 720 (Pattern A/B). Одоо гацаад байгаа:
SELECT id, code, status, progress, "updatedAt" FROM report_logs
WHERE status NOT IN ('COMPLETED','SENT','FAILED') AND "updatedAt" < now() - interval '15 minutes'
ORDER BY "updatedAt" DESC;

-- (№3) Давхардсан examDetail
SELECT "examId", "questionId", count(*) FROM "examDetail" GROUP BY 1,2 HAVING count(*) > 1 ORDER BY 3 DESC LIMIT 50;

-- (№8) Квот дуусаж буй service-үүд
SELECT id, "userId", count, "usedUserCount", price FROM "userService" WHERE count - "usedUserCount" <= 5 ORDER BY id DESC;
```

```sql
-- (A5) FK `ON DELETE` prod-д хэрэглэгдсэн эсэх: assessment / questionCategory-г заасан FK-ууд
-- confdeltype: 'c' = CASCADE, 'n' = SET NULL, 'a' = NO ACTION
SELECT conrelid::regclass AS tbl, conname, confdeltype
FROM pg_constraint
WHERE contype = 'f' AND confrelid IN ('assessment'::regclass, '"questionCategory"'::regclass)
ORDER BY 1, 2;

-- (A7) deploy-ын дараа: FAILED enum, paywall баганууд, report_access
SELECT unnest(enum_range(NULL::report_logs_status_enum)) AS status_values;
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('assessment', 'exam') AND column_name LIKE 'report%';
SELECT to_regclass('public.report_access') AS report_access_table;

-- (№10) peak ачаалал: цагт хэдэн шалгалт эхэлсэн / дууссан (сүүлийн 90 хоног)
SELECT date_trunc('hour', "userStartDate") AS hour,
       count(*) AS started,
       count(*) FILTER (WHERE "userEndDate" IS NOT NULL) AS finished
FROM exam
WHERE "userStartDate" > now() - interval '90 days'
GROUP BY 1 ORDER BY started DESC LIMIT 20;

-- (№10) end burst: 5 минутын цонхонд хамгийн олон дуусгасан (Postgres 14+)
SELECT date_bin('5 minutes', "userEndDate", TIMESTAMP '2026-01-01') AS window_start,
       count(*) AS finished
FROM exam
WHERE "userEndDate" > now() - interval '90 days'
GROUP BY 1 ORDER BY finished DESC LIMIT 10;

-- (№7 / №10) тайлан бэлэн болох хугацаа — service time-ийн ойролцоо үнэлгээ
-- (SENT нь poll-оор COMPLETED-с шилждэг тул updatedAt бага зэрэг хожимдоно)
SELECT count(*) AS n,
       percentile_cont(0.5)  WITHIN GROUP (ORDER BY extract(epoch FROM ("updatedAt" - "createdAt"))) AS p50_sec,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM ("updatedAt" - "createdAt"))) AS p95_sec
FROM report_logs
WHERE status IN ('COMPLETED', 'SENT') AND "createdAt" > now() - interval '30 days';

-- (№11) funnel-ийн эхлэл: өдрөөр
SELECT date_trunc('day', "createdAt") AS day,
       count(*) AS created,
       count("userStartDate") AS started,
       count("userEndDate") AS finished
FROM exam
WHERE "createdAt" > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;

-- (№13) seq scan их хүснэгтүүд ба хамгийн том хүснэгтүүд
SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup
FROM pg_stat_user_tables ORDER BY seq_tup_read DESC LIMIT 15;
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- (№13) app-ын холболт дээр statement_timeout үйлчилж байгаа эсэх (pgbouncer-ээр дамжуулж ажиллуул)
SHOW statement_timeout;
```

Shell шалгалтууд (№14 / №15; утгуудыг нь нууц биш URL / төлөвөөр хязгаарласан):

```bash
# (0.4 a) файл уншихын traversal: 200 бол эмзэг, 404 бол хамгаалагдсан — ЗӨВХӨН аюулгүй файлаар шалга
curl -i 'https://api.hire.mn/api/v1/file/..%2F..%2F..%2Fetc%2Fhostname'

# (№15) Cloudflare proxy (улбар шар үүл) асаалттай эсэх: хариунд `server: cloudflare` / `cf-ray` байвал асаалттай
curl -sI https://api.hire.mn/api/v1 | grep -i -E '^(server|cf-ray)'

# (№15) интернэтээс DB порт нээлттэй эсэх (өөрийн гэрийн / гадаад сүлжээнээс)
nc -vz <core-vps-ip> 6432

# (№15) Docker-ийн publish хийсэн порт UFW-ийг тойрч байгаа эсэх (core VPS дээр)
sudo iptables -S DOCKER | head -20
sudo ufw status verbose

# (№15) prod-д web / admin-ийн server-side API URL (утга нь URL — нууц биш)
docker compose exec web sh -c 'env | grep -E "^(API_URL|NEXT_PUBLIC_API_URL)="'
docker compose exec admin sh -c 'env | grep -E "^NEXT_PUBLIC_API_URL="'

# (№15-P0) allowlist-д оруулах эх IP-үүд: Traefik access log-оос (P0 идэвхжсэний дараа)
jq -r 'select(.RouterName=="api@docker") | .ClientHost' /var/log/traefik/access.log | sort | uniq -c | sort -rn | head -20
```

## Нээлттэй асуултууд (санал болгож буй default-тай)

Deploy:

- D1. hire_report: аль branch / merge вэ? Default: `main` дээр `feature/v1.2.0`-г merge хийсэн `release/v1.2.0` (conflict-ыг гараар); яаралтай бол түр `main` (Studio загварыг prod-д идэвхжүүлэхгүй). (A1)
- D2. Studio-г хаана ажиллуулдаг (Vercel / VPS / Docker)? `NEXT_PUBLIC_API_URL` нь build үед шингэнэ. (A4)
- D3. Prod `.env`-д `JWT_SECRET`, `NODE_ENV` байгаа юу? Default: байхгүй гэж үзээд эхлээд одоогийн утгаар deploy, secret rotate-г ачаалал багатай цагт тусад нь. (A3)

Эхний 8:

1. (Хариулагдсан) Prod-д аль branch: core v1.2.0, web / admin v1.1.0, studio dev, report latest — үлдсэнийг D1–D3 болон A хэсгээс үз.
2. №4: "оролцогч тайлангийн төлбөр төлнө" нь байгууллага бүрд адил уу, эсвэл service тутам сонгодог уу? Default: глобал (assessment-ийн тохиргоо), байгууллага үнэгүй харна.
3. №6: "үр дүн үнэгүй, дэлгэрэнгүй тайлан (PDF) төлбөртэй" нь одоогийн `reportPdfPaid` горим мөн үү? Default: тийм; (A) "N удаа үнэгүй" горимыг UI-с хасна.
4. №8: эрх нэмэх нь wallet-аар төлбөртэй юу, админ үнэгүй нэмдэг үү, хоёул уу? Default: хоёул; QR хэвээр (A), (B)-г дараа.
5. №3: үргэлжлүүлэх цонх? Default: дуустал (эсвэл 7 хоног), хугацаатай тест дээр цаг серверийн цагаар үргэлжилнэ.
6. №2: `show` action хэрэгтэй юу? Default: үгүй — UI / enum-с хасна.
7. №1: prod dump-г хэдэн хоногоор шинэчлэх, PII-г бүрэн нэргүй болгох уу? Default: гараар `--refresh`, нэргүй болгоно.

Хоёр дахь жагсаалт (№9–№13):

8. №11: "system role" = зөвхөн super_admin (default) уу, admin / tester орох уу? Тусдаа "system" аккаунт хэрэгтэй юу? Default: зөвхөн super_admin, `MONITOR_ROLES` env-ээр өргөтгөнө.
9. №10: зорилтот ачаалал ба хүлээн зөвшөөрөх тайлангийн хугацаа? Default: 300 зэрэг шалгуулагч, 100 хүн 1 минутад дуусгана, 95% тайлан ≤ 5 минутад (бодит peak-г дээрх SQL-ээр хар).
10. №1 / №9 / №10: Mac дээр Docker Desktop байгаа юу? Default: байгаа гэж үзнэ (test compose); үгүй бол Homebrew Postgres + Redis.
11. №12: docs-ийн эх сурвалж — `ops`-г git болгож `docs/` нэмэх (default) уу, тусдаа `hire-docs` repo уу?
12. №13: migration — TypeORM-ийн өөрийн migration (default) уу, энгийн SQL файл + жижиг runner уу?

Гурав дахь жагсаалт (№14–№15):

13. №14: "uploads" гэж юуг хэлсэн бэ? Default: local-д үүсгэсэн report PDF-г prod-ын report серверийн `uploads/` руу тавих (одоогийн `upload-report-files.sh`-ийн үүрэг). Зураг / файл (core-ийн `POST /upload` гэх мэт) гэсэн бол хэл.
14. №14: recalculate / regenerate / upload-ыг хэн хэрэглэх вэ, яаж дуудах вэ? Default: зөвхөн super_admin, admin UI-ийн товч + (хэрэгтэй бол) Bearer token-той curl скрипт; `OPS_ROLES` env-ээр admin-д нээж болно.
15. №15: `api.hire.mn`, `hire.mn`, `admin.hire.mn` Cloudflare proxy (улбар шар үүл) асаалттай юу? Default: DNS-only гэж үзнэ; асаалттай бол Traefik-д Cloudflare-ийн IP-г trusted болгох шаардлагатай.
16. №15: prod-ын web / admin `.env`-д `API_URL` / `NEXT_PUBLIC_API_URL` юу вэ? Default: public `https://api.hire.mn/api/v1/` гэж үзээд server-side-ыг дотоод `http://core:5000/api/v1/` болгоно.
17. №15: "цөөн IP" — хэн, хаанаас (оффис / гэр / VPN), static эсэх? Default: 2–3 static IP; динамик бол WireGuard / Tailscale (нэг тогтмол egress).
18. №15: Studio хаана ажилладаг (D2), AI agent (`AI_AGENT_KEY`) хаанаас дууддаг вэ? Default: тэдгээрийн IP-г allowlist-д нэмнэ, эсвэл AI route-г path exception болгоно.
19. №15: public QR-ын 2 дуудлагыг (`public-info`, `public-register`) server action болгох уу (default), эсвэл public exception + rate limit-тэй үлдээх үү?
