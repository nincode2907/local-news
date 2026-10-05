# Intelligence — implementation plan

Updated: 2026-10-05 (Asia/Ho_Chi_Minh).

## V1

### Mục tiêu

Journal cá nhân chạy local: copy Daily Brief từ ChatGPT → clipboard/paste → preview → lưu raw nguyên gốc và structured items → đọc Today, Timeline, Search. Lưu lịch sử bền vững, cấu hình dùng chung Turso trên hai máy. Không auth, Docker, external AI API hoặc vector DB.

### Architecture chính

```text
Browser: Today / Timeline / Search / Import
    → Next.js App Router (Node, loopback)
    → rule-based parser + repository
    → Drizzle ORM / @libsql/client
    → Turso shared DB (hoặc file SQLite khi setup/test)
```

- `src/app`: server-rendered journal pages, import client form và API.
- `src/lib/parser.ts`: nhãn EN/VI, heading tin, date ISO, impact mapping, source URL; deterministic, version `rules-v1`.
- `src/lib/repository.ts`: atomic import, SHA-256 duplicate check, read/search queries.
- `src/lib/schema.ts` + `drizzle/`: 3 bảng `daily_briefs`, `news_items`, `sources`; committed migrations.
- `scripts/`: migrate, idempotent seed, consistent JSON backup, restore vào DB trống.
- `fixtures/`: 3 brief / 7 tin minh họa, không phải tin đã xác minh.
- `tests/`: parser/database integration và browser tests trên production server + DB tạm riêng.

### Quyết định kỹ thuật

- Raw Markdown không thay đổi khi lưu. Canonical hash chỉ chuẩn hóa CRLF và trim ngoài cùng; unique constraint bảo vệ import trùng, transaction bảo vệ toàn bộ brief/items/sources.
- Ngày không unique: cùng ngày có thể có nhiều phiên bản nội dung. Today chọn ngày mới nhất, rồi `created_at` mới nhất.
- Metadata summary/signal/model là nullable. Không tự sinh fact/analysis/recommendation từ nội dung không gắn nhãn; thiếu dữ liệu hiển thị rõ và giữ raw, warnings, review flag.
- Preview chỉ đọc DB, không ghi. Duplicate mở được brief đã tồn tại. Chọn ngày thủ công nếu parser không có ngày ISO.
- Domain/category là text mở rộng, không enum đóng; impact dùng high/medium/low/unknown. IDs không phụ thuộc domain, đủ mở rộng sang AI, Cloud, Backend, Cybersecurity, Chips, Robotics, Electronics, Finance, Science, Startup.
- SQL parameterized `LIKE` trên 4 trường, escape wildcard; filter chính xác date/domain/category/impact. Chưa dùng FTS5 vì V1 chỉ có journal cá nhân nhỏ và không cần ranking/index quản lý thêm.
- Drizzle/libSQL đọc env phía server, `server-only` ngăn import DB vào client. `.env.local` bị ignore, không prefix NEXT_PUBLIC. Server bind 127.0.0.1, import API kiểm tra origin và input; scan client JS bundles không có references TURSO_AUTH_TOKEN/TURSO_DATABASE_URL.
- Tailwind + CSS semantic tokens: dark xanh than, serif headings, body system sans, không tải font external, không gradient/glow/animation trang trí.
- Dependency lockfile, Node >=22. Override esbuild trong dependency development cũ của drizzle-kit để audit về 0; migration generation và toàn bộ checks vẫn pass.

### Acceptance criteria và trạng thái thực tế

| Tiêu chí                                        | Trạng thái / bằng chứng                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Install, typecheck, production build            | PASS — npm install, npm ci, Next production build; TypeScript check trong build     |
| DB connect, migration, seed                     | PASS — local libSQL file; migrations chạy lại không nhân bản, 3 brief/7 tin         |
| Today đọc DB, summary/signal/model/counts/cards | PASS — integration + browser                                                        |
| Clipboard empty/denied và paste fallback        | PASS — browser test mô phỏng clipboard API empty/denied/success                     |
| Preview/import, partial failure, raw-only       | PASS — browser/API + parser integration                                             |
| Duplicate không nhân bản                        | PASS — hash unique, repository và API/browser checks                                |
| Raw được giữ nguyên                             | PASS — exact string assertions trên DB, detail và restore                           |
| Timeline newest-first và detail/raw             | PASS — integration + browser                                                        |
| Search title/facts/analysis/recommendation      | PASS — integration + browser từng trường                                            |
| Filters date/domain/category/impact             | PASS — test kết hợp toàn bộ filters                                                 |
| DB error không làm mất draft, import rollback   | PASS — trigger mô phỏng lỗi DB, UI giữ textarea; transaction rollback test          |
| Restart không mất data                          | PASS — đóng/mở DB và dừng/chạy lại production process, đọc lại brief đã import      |
| Responsive desktop/mobile                       | PASS — browser kiểm tra 375px không overflow; screenshot desktop/mobile đã kiểm tra |
| Backup/restore                                  | PASS — snapshot 3 bảng, raw exact, từ chối restore vào DB có data                   |
| Dependency audit                                | PASS — 0 vulnerabilities sau override                                               |
| Turso remote và dùng chung trên 2 máy           | CHƯA KIỂM CHỨNG — chưa có URL/token thực; code/config/README đã sẵn sàng            |

V1 đã hoàn thành phần implementation và kiểm thử local. `.env.local` dùng file DB đã migrate/seed; cấu hình Turso thực cần URL/token của người dùng. Không có task V2/V3 được implement.

### Limitations V1

- Parser hợp đồng nhãn rõ ràng; format tự do có thể chỉ giữ raw hoặc nhận diện một phần. Không có màn hình sửa structured fields/reparse; review qua raw.
- Search LIKE chưa có ranking, semantic search, Unicode folding đầy đủ hoặc pagination; khi journal lớn nên đánh giá FTS5/pagination.
- Duplicate theo toàn brief chuẩn hóa whitespace ngoài cùng, không theo ngữ nghĩa/từng tin; bản chỉnh sửa được giữ riêng.
- Turso cần mạng, không offline sync. Token hết hạn cần cập nhật env và restart.
- Không tự xác minh nguồn/nội dung; seed chỉ để test. Clipboard tùy browser/OS, fallback luôn sẵn.
- Local/shared credentials chỉ ở server; chưa kiểm chứng kết nối remote thực trên hai máy.

### Bootstrap agent và runtime — 2026-10-05

- Thêm `AGENTS.md` (63 dòng) với RTK, V1 boundaries, data/secrets invariants và routing.
- Workflow import: `.agents/skills/intelligence-import/SKILL.md`; kiến trúc/vận hành
  và audit: [docs/project-guide.md](docs/project-guide.md) + [HTML](docs/project-guide.html).
- Đăng ký Dev Hub block 15000–15099, app 15000, E2E 15090, restart check 15091;
  proxy `intelligence.localhost`. Env/config/tests và README đã đồng bộ.
- Sửa startup bằng wrapper dotenv trước CLI Next; tránh cờ Node env-file bị đưa
  vào worker NODE_OPTIONS của Next dev. Dev và production startup đã kiểm chứng.
- Nhãn UI tiếng Việt, giữ lang=vi, thêm journal favicon và trang not-found tiếng Việt.
  Nội dung import, raw và enum/query identifiers được giữ nguyên.
- PASS: skill validator, 3 integration tests, 4 browser tests + production build;
  direct/proxy IPv4/IPv6/browser, same-origin preview, favicon và docs layout.
- Turso remote/hai máy vẫn chưa kiểm chứng. Không implement V2/V3.

## V2 — chỉ roadmap, chưa implement

- Topics / Entities: taxonomy và entity references dựa trên nhu cầu thực tế của lịch sử.
- Threads: nhóm diễn biến theo chủ đề, link ngược về các brief.
- Auto-link tin mới với lịch sử; ưu tiên rule và entity/url match trước.
- What changed since yesterday: thay đổi đáng chú ý so với ngày trước.
- Model Watch: theo dõi model và đánh giá theo use case cá nhân.
- GitHub Watch: theo dõi repository/release đáng quan tâm.
- Bookmarks / notes: lưu tin quan trọng và ghi chú cá nhân.
- Try / Watch / Ignore: quyết định hành động và theo dõi.

## V3 — chỉ roadmap, chưa implement

- Weekly/monthly synthesis từ lịch sử đã lưu.
- Semantic search; embeddings chỉ khi keyword/entity search không đủ.
- Prediction tracking: dự đoán, thời hạn, kết quả và hiệu chỉnh.
- AI-assisted import/classification, có preview/review, luôn giữ raw provenance.
- Local LLM/API integration tùy chọn, đánh giá chi phí và riêng tư khi triển khai.
- Knowledge/entity pages: tổng hợp lịch sử theo thực thể.
- Relationship discovery: gợi ý liên hệ có evidence, không tự coi suy luận là fact.

Dừng ở V1. Chỉ bắt đầu V2 khi người dùng review và yêu cầu.
