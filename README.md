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

Mở [Intelligence](http://intelligence.localhost), hoặc URL trực tiếp [127.0.0.1:15000](http://127.0.0.1:15000). Dev Hub đã đăng ký block `15000–15099`: app `15000`, E2E `15090`, restart check `15091`. Chỉ đổi `PORT` sau khi đối chiếu registry; script `dev` và `start` nạp `.env.local` trước khi Next.js khởi động server. `.env.local` hiện có cấu hình local đã migrate/seed để thử ngay. Database file được lưu trên disk, không mất khi restart. Seed là ví dụ minh họa, không phải bản tin đã xác minh.

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

Nên yêu cầu ChatGPT xuất format bên dưới để parser nhận diện chính xác. `YYYY-MM-DD` là ngày brief, không suy diễn ngày hiện tại khi thiếu. Có thể chọn ngày trong preview. Parser nhận nhãn tiếng Anh và tiếng Việt tương đương, nhãn in đậm/bullet, `###` cho tin hoặc `## 1. Title`. Không fetch nguồn hoặc xác minh nội dung. Markdown không rõ cấu trúc được giữ raw và gắn Cần kiểm tra; V1 không có editor sửa structured data.

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

Impact: `high`, `medium`, `low` (hoặc `cao`, `trung bình`, `thấp`); thiếu/khác → `unknown`. Domain/category là text mở rộng tự do. Raw giữ nguyên; SHA-256 chuẩn hóa CRLF và khoảng trắng ngoài cùng để chống trùng toàn brief. Hai brief khác nội dung cùng ngày được giữ như hai phiên bản. Hôm nay chọn ngày mới nhất, rồi lần import mới nhất. Không chống trùng theo từng tin.

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
