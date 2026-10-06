# Intelligence

Personal intelligence journal chạy local: import Markdown từ ChatGPT, đọc theo ngày và tìm lại tin. V1 không auth, AI API hay vector DB.

## Setup

Node.js **22+**, npm. Trong thư mục project:

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed # tùy chọn: 3 brief / 7 tin mẫu, có thể chạy lại
npm run dev
```

Mở [Intelligence](http://intelligence.localhost), hoặc URL trực tiếp [127.0.0.1:15000](http://127.0.0.1:15000). Dev Hub đã đăng ký block `15000–15099`: app `15000`, E2E `15090`, restart check `15091`. Chỉ đổi `PORT` sau khi đối chiếu registry; script `dev` và `start` nạp `.env.local` trước khi Next.js khởi động server. `.env.local` dùng DB local đã migrate; seed mẫu đã được gỡ theo yêu cầu. Database file được lưu trên disk, không mất khi restart. Seed là ví dụ minh họa, không phải bản tin đã xác minh.

## Turso và máy thứ hai

Tạo database Turso, lấy URL/token bằng dashboard hoặc Turso CLI:

```sh
turso db create intelligence
turso db show intelligence --url
turso db tokens create intelligence
```

Đặt vào `.env.local` trên **cả hai máy**:

```dotenv
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

Chạy `npm ci`, `npm run db:migrate`, rồi `npm run dev` trên mỗi máy. Seed chỉ là tùy chọn, hash giúp seed không nhân bản. Hai máy truy cập trực tiếp cùng remote DB; cần mạng, không có offline sync. Dùng `.env.local` cho máy này và secrets như Turso token; giữ `.env.example` làm mẫu để copy khi setup. Đổi `PORT`, URL hoặc token cần restart `npm run dev` / `npm start` để tiến trình Node đọc giá trị mới. Không dùng prefix `NEXT_PUBLIC_` cho credentials; env/database chỉ được đọc ở Node server hoặc script. Không commit `.env.local`, database hay backup.

CLI config: [Turso documentation](https://docs.turso.tech/cli/introduction). Drizzle kết nối qua [libSQL driver](https://orm.drizzle.team/docs/get-started/sqlite-new); App Router theo [Next.js docs](https://nextjs.org/docs/app/getting-started).

## Import mỗi sáng

1. Copy Daily Brief từ ChatGPT.
2. Mở **Nhập Daily Brief**, chọn **Đọc clipboard**; nếu bị chặn/trống thì paste vào textarea.
3. **Xem trước bản tin**, kiểm tra ngày, tin nhận diện và các cảnh báo.
4. **Lưu vào nhật ký**, mở brief vừa lưu hoặc Hôm nay.

Trong lúc lưu, UI báo rõ trạng thái. Server ghi log `[import] started/complete/failed`
với action và thời gian xử lý, không ghi nội dung brief hay credentials. Request phía
browser timeout sau 45 giây; nếu gặp timeout, hãy xem preview để kiểm tra duplicate
trước khi thử lưu lại.

### Structured Intelligence Data — hợp đồng v1 (ưu tiên)

Yêu cầu ChatGPT thêm đúng một khối JSON giữa hai delimiter dành riêng bên dưới.
JSON hợp lệ là structured representation chính thức: ngày, metadata và items chỉ lấy
từ JSON, không suy diễn từ heading Markdown. Toàn bộ text dán được giữ nguyên trong
`raw_content`. Preview hiện `Structured Intelligence Data`.

```text
---INTELLIGENCE-DATA-START---
{
  "schema_version": 1,
  "date": "2026-10-05",
  "daily_summary": "Tóm tắt ngày.",
  "biggest_signal": null,
  "model_recommendation": null,
  "items": [
    {
      "title": "Tiêu đề tin",
      "domain": "AI",
      "category": "Models",
      "facts": "Sự kiện được ghi rõ.",
      "analysis": "Vì sao đáng chú ý.",
      "recommendation": null,
      "impact": "very_high",
      "sources": [{ "name": "Google" }]
    }
  ],
  "worth_trying": [
    { "title": "So sánh hai cấu hình", "reason": "Đo thay đổi trên cùng tác vụ." }
  ]
}
---INTELLIGENCE-DATA-END---
```

- Mọi key cấp brief trong ví dụ là bắt buộc. `schema_version` chuẩn là số `1`
  (`"1.0"` cũ vẫn được nhận); `date` là ngày ISO hợp lệ. Ba metadata là chuỗi
  không trống hoặc `null`.
- Item cần `title` không trống, `impact` là `very_high/high/medium/low/unknown`,
  `sources` là array `{name, url?}`. `name` không trống; `url` có thể thiếu/null,
  hoặc phải là URL HTTP/HTTPS nếu có. Dạng cũ `{url, label}` vẫn được nhận. Nguồn
  chỉ có tên được hiển thị dạng text và đánh dấu cần kiểm tra URL. Các trường
  `domain/category/facts/analysis/recommendation` là chuỗi không trống hoặc `null`;
  bỏ qua các trường này thì giữ `null`, không suy diễn từ Markdown.
- `items`, `sources`, `worth_trying` có thể rỗng. `worth_trying` nhận chuỗi cũ hoặc
  object `{title, reason}`; object được lưu và hiển thị nguyên dạng, `reason` có thể
  là chuỗi hoặc `null`. Thiếu facts/URL nguồn, impact unknown hoặc summary null được
  đánh dấu cần kiểm tra. Key mở rộng giữ trong raw, chưa trích xuất.
- Không dùng delimiter dành riêng trong giá trị JSON; không bọc JSON bằng code fence
  giữa delimiter. JSON/schema/version/marker lỗi chặn save và báo lỗi rõ vị trí.
  Sửa nội dung hoặc chọn **Dùng Legacy Markdown Parser** để preview lại. Fallback
  bỏ khối JSON khỏi phần scan, giữ nguyên raw và lưu cảnh báo. Chọn ngày thủ công nếu
  Markdown không có ngày. Block hợp lệ vẫn được ưu tiên ngay cả khi bật fallback.
- Save validate/reparse trên server; structured date không được override. API nhận
  `{action, raw, date?, allowLegacyFallback?: boolean}`; lỗi structured trả HTTP 422
  cùng `canFallback: true`. Preview chỉ đọc; hash chống trùng giữ cơ chế cũ.

Khi cập nhật app, chạy `npm run db:migrate`: migration thêm `worth_trying` mặc định
`[]` và cho phép source không có URL; bản rebuild bảng giữ nguyên URL/name đã lưu,
raw và lịch sử. Không chạy seed để cập nhật.

### Legacy Markdown Parser — tương thích brief cũ

Không có JSON block thì parser cũ vẫn chạy tự động, preview hiện `Legacy Markdown
Parser`. `YYYY-MM-DD` là ngày brief, không suy diễn ngày hiện tại khi thiếu. Có thể
chọn ngày trong preview. Parser nhận nhãn EN/VI, nhãn in đậm/bullet, `###` cho tin
hoặc `## 1. Title`. Không fetch nguồn hay xác minh nội dung. Markdown không rõ cấu
trúc vẫn giữ raw và gắn Cần kiểm tra; V1 không có editor sửa structured data.

```markdown
# Daily Brief — 2026-10-05

## Summary

Tóm tắt ngày.

## Biggest signal

Xu hướng đáng chú ý (tùy chọn).

## Model recommendation

Gợi ý model (tùy chọn).

### News title

Domain: AI
Category: Models
Fact: Sự kiện có trong brief.
Analysis: Vì sao đáng quan tâm.
Recommendation: Hành động gợi ý.
Impact: high
Sources: [Nguồn](https://example.com)
```

Impact: `very_high`, `high`, `medium`, `low` (hoặc `rất cao`, `cao`, `trung bình`, `thấp`); thiếu/khác → `unknown`. Domain/category là text mở rộng tự do. Raw giữ nguyên; SHA-256 chuẩn hóa CRLF và khoảng trắng ngoài cùng để chống trùng toàn brief. Hai brief khác nội dung cùng ngày được giữ như hai phiên bản. Hôm nay chọn ngày mới nhất, rồi lần import mới nhất. Không chống trùng theo từng tin.

## Migrations, tests và production

```sh
npm run db:generate # chỉ khi đổi schema; review SQL mới trước khi migrate
npm run db:migrate
npm test
npx playwright install chromium
npm run test:e2e # DB tạm độc lập, production server port 15090; restart check 15091
npm run build
npm start
```

Server bind `127.0.0.1`. Search dùng SQL parameterized `LIKE` trên title/facts/analysis/recommendation, filter ngày/domain/category/impact. Có escape ký tự wildcard; SQLite chưa có tìm kiếm Unicode không phân biệt dấu đầy đủ. Timeline detail hiển thị original Markdown.

## Backup

```sh
npm run db:backup
```

Xuất snapshot JSON nhất quán của cả 3 bảng vào `backups/`, gồm raw Markdown, IDs, hash và sources. Áp dụng cả local và Turso; lưu bản sao ở nơi khác để bảo vệ lịch sử. Khôi phục vào DB trống đã migrate bằng `npm run db:restore -- backups/<file>.json` (script từ chối nếu DB có dữ liệu). Local cũng có thể sao chép file `intelligence.db` **sau khi tắt app và mọi script**. Turso có [hướng dẫn backup/export](https://docs.turso.tech/cli/db/shell) qua CLI; snapshot JSON là cơ chế backup của app.

Kiến trúc, vận hành và hướng dẫn cho agent: [project-guide.md](docs/project-guide.md) / [bản trực quan](docs/project-guide.html). V2/V3 chỉ có roadmap trong [plan.md](plan.md).
