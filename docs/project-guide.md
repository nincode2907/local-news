# Intelligence — hướng dẫn dự án

Nguồn chuẩn cho kiến trúc, vận hành local và kết quả bootstrap agent. Cập nhật ngày
2026-10-05 (Asia/Ho_Chi_Minh). [Bản trực quan](project-guide.html) được tổ chức từ
tài liệu này; [README](../README.md) chứa setup, format import và backup/restore.

## Phạm vi và nguồn kiến thức

Intelligence là journal cá nhân lưu Daily Brief từ ChatGPT theo ngày. V1 đã có
import, Hôm nay, Lịch sử, Tìm kiếm; V2/V3 chỉ là roadmap trong [plan.md](../plan.md).
App chạy Node local, không cần Docker, auth, external AI API hoặc vector database.
Proxy Dev Hub là dịch vụ có sẵn, tùy chọn; URL trực tiếp dùng được khi proxy dừng.

| Nguồn                                                                 | Khi nào đọc                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)                                             | Manual ngắn cho mọi task: boundaries, invariants, commands, routing |
| [intelligence-import](../.agents/skills/intelligence-import/SKILL.md) | Sửa parser, preview/save, duplicate hoặc persistence                |
| [README.md](../README.md)                                             | Setup, hợp đồng Markdown và backup/restore                          |
| Tài liệu này                                                          | Kiến trúc, service mapping, proxy và kết quả bootstrap              |
| [plan.md](../plan.md)                                                 | Quyết định kỹ thuật, trạng thái V1, limitation và roadmap           |

Không cần nạp toàn bộ các tài liệu cho mỗi task. Không có AGENTS lồng nhau hay skill
project trước bootstrap; instruction RTK từ người dùng được giữ ở AGENTS root mới.

## Kiến trúc và ranh giới

```text
ChatGPT → copy/paste → /import (client)
                       ↓ preview → xác nhận ngày → save
                 /api/import (Node server)
                       ↓ parser deterministic / repository transaction
                 Drizzle → libSQL client → Turso shared DB hoặc SQLite file
                       ↑
       / (Hôm nay) · /timeline · /timeline/[id] · /search (server pages)
```

| Lớp               | File chính                                                    | Trách nhiệm                                                      |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Màn hình          | `src/app`, `src/components`                                   | Đọc journal, form clipboard/paste; UI tiếng Việt                 |
| Parser            | `src/lib/parser.ts`, `src/lib/intelligence-data.ts`           | JSON v1 validated ưu tiên; legacy EN/VI fallback, không suy diễn |
| Import API        | `src/app/api/import/route.ts`                                 | Kiểm input/origin, preview, reparse và save phía server          |
| Repository        | `src/lib/repository.ts`                                       | Atomic import/hash duplicate, đọc lịch sử và search/filter       |
| Database          | `src/lib/schema.ts`, `src/lib/db.ts`, `src/lib/connection.ts` | Schema, server-only runtime, libSQL driver                       |
| Migration/scripts | `drizzle/`, `scripts/`                                        | SQL đã commit; migrate/seed/backup/restore có chủ đích           |

`daily_briefs` có quan hệ một-nhiều với `news_items`, mỗi item có nhiều `sources`.
Schema cụ thể là nguồn chuẩn trong `schema.ts`; format input là README. Domain/category
là text mở rộng; impact lưu very_high/high/medium/low/unknown. UI có thể dịch
label, giữ identifier.

Raw Markdown được giữ nguyên. Hash chuẩn hóa CRLF và trim ngoài cùng, không sửa raw;
unique constraint và transaction bảo vệ import. Cùng ngày có nhiều phiên bản khác
nội dung. Ngày mới nhất/lần import mới nhất quyết định Hôm nay. Parse không rõ →
nullable field + cảnh báo cần kiểm tra. Không có tự fetch hoặc xác minh nguồn.

JSON giữa `---INTELLIGENCE-DATA-START---` và `---INTELLIGENCE-DATA-END---` là nguồn
structured chính thức, version `1` theo README. Khi hợp lệ, không lấy
items/date/metadata từ Markdown; preview hiện `Structured Intelligence Data`.
JSON/schema lỗi chặn lưu và yêu cầu sửa hoặc chủ động chọn `Legacy Markdown Parser`.
Fallback bỏ JSON khỏi phần scan nhưng giữ nguyên raw và cảnh báo. Brief cũ không có
block dùng legacy tự động. Contract hiện dùng schema version `1` (vẫn nhận `"1.0"`
cũ), impact `very_high`/`high`/`medium`/`low`/`unknown`, source `{name, url?}`
(vẫn nhận `{url,label}`), và `worth_trying` dạng object `{title, reason}` hoặc
chuỗi cũ. Source chỉ có tên được giữ với URL null và cần review; migration 0002
cho phép dạng này trong DB và giữ nguyên nguồn/hồ sơ cũ. `worth_trying` giữ nguyên
kiểu phần tử để tương thích lịch sử.

## Runtime trên máy này

Registry trung tâm: `/Users/buivannin/Desktop/workspace/personal/dev-hub/projects.yml`.
Identity `intelligence`, đường dẫn `/Users/buivannin/Desktop/workspace/personal/news`.
Block đã dự trữ `15000–15099`; mỗi thay đổi port phải đối chiếu registry và listener.

| Dịch vụ              | Port host/process      | Hostname               | Tính chất                                      |
| -------------------- | ---------------------- | ---------------------- | ---------------------------------------------- |
| App Next.js          | 15000                  | intelligence.localhost | Node local, bind 127.0.0.1                     |
| Playwright E2E       | 15090                  | Không có proxy         | Production server tạm, database file tạm riêng |
| Restart check        | 15091                  | Không có proxy         | Process tạm trong browser test                 |
| Caddy shared ingress | 80                     | intelligence.localhost | Proxy Dev Hub có sẵn, ngoài block project      |
| Turso / local SQLite | Không expose host port | Không áp dụng          | Remote service hoặc file DB                    |

Ngày bootstrap, `.env.local` chọn 5000, `.env.example` chọn 3000. Process Next thuộc
repo được quan sát ở cả hai port; port 3000 còn có Room Mate Docker, 5000 có Control
Center. Block 15000–15099 đã được probe IPv4/IPv6 toàn block trước/sau reservation,
không thấy listener khi cấp. Runtime/config/tests chuyển theo mapping mới.

### Khởi động và cấu hình

Chạy lệnh từ root Intelligence; cần Node.js >=22, npm và `.env.local`. Setup/migration
chi tiết ở README. `npm run dev` dùng HMR; production cần `npm run build`, `npm start`.
Giữ server trong terminal tương tác có log; chỉ in URL sau khi startup thành công.

Script `dev`/`start` dùng `scripts/run-next.mjs` nạp `.env.local` bằng dotenv trước
CLI Next để PORT có hiệu lực khi bind. Không truyền `--env-file` vào Node vì Next dev
forward cờ đó vào worker NODE_OPTIONS, nơi cờ này không hợp lệ. Biến đã export trong shell ưu tiên hơn file env. `.env.local`
chứa PORT, URL/token; `.env.example` là mẫu không có secret. Đổi env cần restart.
Credentials chỉ được đọc ở server/scripts, không được đưa vào NEXT_PUBLIC hoặc client.

Máy thứ hai dùng cùng Turso URL/token để chia sẻ dữ liệu; kiểm registry local của máy
đó trước khi chọn port. Không copy local SQLite khi muốn shared data; không có offline
sync. Seed là dữ liệu minh họa, chỉ dùng khi được yêu cầu trên DB phù hợp.

### Hostname và proxy

```text
http://intelligence.localhost:80
  → Caddy Dev Hub
  → host.docker.internal:15000 (proxy Docker hiện có)
  → Next.js loopback 127.0.0.1:15000
```

Route được sinh bằng Dev Hub `npm run proxy:generate`; giữ manual entries ngoài marker.
Không đổi route của project khác. Caddyfile phải validate trước áp dụng. Admin API đang
tắt nên áp dụng Caddyfile bằng restart riêng container `dev-hub-caddy`; có gián đoạn
ngắn cho hostname của Dev Hub. Không đổi `/etc/hosts` hoặc cài system service.

Proxy đang publish `0.0.0.0:80` (Docker `80:80`), phạm vi rộng hơn loopback của app.
Bootstrap này không thay đổi publication. `allowedDevOrigins` chỉ thêm hostname của
Intelligence cho asset/HMR dev; API import giữ same-origin Host check, không mở CORS.
Phải kiểm HTTP IPv4, IPv6 và browser; đuôi `.localhost` không chứng minh route chạy.

## Kiểm thử và dữ liệu cá nhân

- `npm test`: parser/repository integration trên DB tạm, bao gồm rollback và raw equality.
- `npm run test:e2e`: production build + migrate/seed DB tạm riêng, ports 15090/15091.
- `npm run build`: production compile và TypeScript check.
- Favicon `src/app/icon.svg` được Next phục vụ ở `/icon.svg`.
- Giữ nhãn UI tiếng Việt; user content và raw import giữ ngôn ngữ gốc. Test dùng fixtures.
- Backup/restore theo README. Không reset DB, đổi token hay import seed vào shared DB
  chỉ để chạy kiểm chứng. Kiểm local không đồng nghĩa Turso hai máy đã được xác minh.

## Kết quả audit và bootstrap

| Vùng                | Quan sát trước                                     | Thay đổi / nguồn kiến thức sau                           |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Agent instructions  | Không có AGENTS root/nested; RTK chỉ có trong chat | AGENTS root ngắn, giữ RTK và project invariants          |
| Knowledge routing   | README/plan có kiến thức, chưa có route cho agent  | Skill import; guide kiến trúc/vận hành; giữ README/plan  |
| Instruction quality | Thiếu persistent rule V1/raw/secrets/data safety   | Rule rõ trong AGENTS, workflow đặc thù ở skill           |
| Local runtime       | Chưa có registry entry; env mẫu/thực tế khác nhau  | Reserve 15000–15099, env/tests và Caddy route đồng bộ    |
| Ngôn ngữ/favicon    | lang=vi nhưng labels tiếng Anh; chưa có icon       | UI labels tiếng Việt, favicon journal; raw không bị dịch |
| Git                 | Không có Git repository                            | Không init/commit/push trong bootstrap                   |

Không có AGENTS dài cần phân loại A–E hoặc di chuyển destructive. Không xóa kiến thức
hiện có: roadmap/decisions ở plan; format/backup ở README. Reuse global skills đã có:
project-ai-bootstrap (setup), skill-creator (authoring), frontend-design/ui-ux-pro-max
(khi sửa thiết kế), task-qa-review (khi yêu cầu QA). Không cài global skill/tool mới.

### Kiểm chứng thực tế

| Check trong lượt bootstrap  | Kết quả                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Skill authoring validator   | PASS — skill import hợp lệ; validator chạy trong venv tạm vì Python hệ thống thiếu PyYAML |
| Parser/database integration | PASS — 3 tests, DB tạm                                                                    |
| Browser workflow            | PASS — 4 tests; production build, ports 15090/15091, migrate/seed trên DB tạm             |
| Development startup         | PASS — wrapper dotenv, Next Ready trên 127.0.0.1:15000, log giữ trong terminal tương tác  |
| Proxy/direct HTTP           | PASS — direct 15000; hostname và Host route qua IPv4/IPv6                                 |
| Proxy import origin         | PASS — preview read-only qua intelligence.localhost; cùng Host/Origin                     |
| Browser hostname/favicon    | PASS — heading tiếng Việt, lang=vi, SVG icon phản hồi thành công                          |
| Documentation               | PASS — link Markdown cục bộ; HTML tương tác, 375px không overflow, render đã kiểm tra     |
| Caddy/registry              | PASS — configuration validate; route Dev Hub cũ health OK; entry registry cũ giữ nguyên   |
| Turso remote/hai máy        | CHƯA KIỂM CHỨNG — env hiện dùng file DB                                                   |

`AGENTS.md` trước: không tồn tại (0 dòng/byte); sau: 63 dòng, 3905 byte.
Project skill import: 39 dòng, 2362 byte. Không có nested scope bị flatten.
Runtime cuối: dev server foreground tại 15000; proxy intelligence.localhost hoạt động.
Test servers 15090/15091 đã dừng. File DB cá nhân không được seed/reset trong bootstrap.

Turso remote/hai máy vẫn chưa kiểm chứng vì `.env.local` hiện dùng file DB.
Proxy Docker vẫn publish 80 trên mọi interface; thay đổi loopback publication của proxy
là phạm vi vận hành Dev Hub riêng, chưa được thực hiện trong bootstrap Intelligence.
