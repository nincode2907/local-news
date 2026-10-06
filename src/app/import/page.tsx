"use client";
import { useState } from "react";
import Link from "next/link";
import type { ParsedBrief } from "@/lib/parser";
import { NewsCard } from "@/components/news-card";
import { Markdown } from "@/components/markdown";
import { structuredExample } from "@/lib/import-example";
type Preview = { parsed: ParsedBrief; duplicate: boolean; existingId?: string };
export default function ImportPage() {
  const [raw, setRaw] = useState("");
  const [date, setDate] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busyAction, setBusyAction] = useState<"preview" | "save" | null>(null);
  const busy = busyAction !== null;
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [canFallback, setCanFallback] = useState(false);
  const [allowLegacyFallback, setAllowLegacyFallback] = useState(false);
  function change(value: string) {
    setRaw(value);
    setPreview(null);
    setSaved(null);
    setMessage("");
    setDate("");
    setCanFallback(false);
    setAllowLegacyFallback(false);
  }
  async function clipboard() {
    try {
      if (!navigator.clipboard) throw new Error();
      const value = await navigator.clipboard.readText();
      if (!value.trim()) {
        setMessage("Clipboard trống. Sao chép bản tin hoặc dán bên dưới.");
        return;
      }
      change(value);
    } catch {
      setMessage(
        "Không đọc được clipboard. Hãy dùng Ctrl/Cmd + V vào ô nhập bên dưới.",
      );
    }
  }
  async function send(
    action: "preview" | "save",
    fallback = allowLegacyFallback,
  ) {
    setBusyAction(action);
    setMessage(
      action === "save"
        ? "Đang lưu bản tin vào database…"
        : "Đang phân tích bản tin và kiểm tra trùng…",
    );
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          raw,
          date: date || undefined,
          allowLegacyFallback: fallback,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const data = await response.json();
      if (!response.ok) {
        setCanFallback(data.canFallback === true);
        throw new Error(data.error);
      }
      setCanFallback(false);
      if (action === "preview") {
        setPreview(data);
        setAllowLegacyFallback(fallback);
        setDate(data.parsed.date || "");
      } else {
        setSaved(data.id);
        setMessage(
          data.duplicate
            ? "Bản tin đã tồn tại. Không tạo bản sao."
            : "Đã lưu bản gốc và các tin nhận diện được.",
        );
      }
    } catch (e) {
      setMessage(
        e instanceof Error && e.name === "TimeoutError"
          ? "Máy chủ chưa phản hồi sau 45 giây. Bản gốc vẫn nằm trong ô nhập; hãy xem trước để kiểm tra trùng trước khi thử lưu lại."
          : e instanceof Error
            ? e.message
            : "Không thể nhập bản tin. Thử lại.",
      );
    } finally {
      setBusyAction(null);
    }
  }
  return (
    <>
      <div className="eyebrow">Nhật ký mỗi sáng</div>
      <h1>Nhập Daily Brief</h1>
      <p className="intro">Sao chép từ ChatGPT. Xem trước. Lưu vào nhật ký.</p>
      <div className="import-panel">
        <div className="heading-row">
          <label htmlFor="brief">Markdown gốc</label>
          <button onClick={clipboard} disabled={busy} className="secondary">
            Đọc clipboard
          </button>
        </div>
        <textarea
          id="brief"
          disabled={busy}
          value={raw}
          onChange={(e) => change(e.target.value)}
          placeholder="Dán Daily Brief của bạn vào đây…"
          rows={14}
        />
        <div className="heading-row">
          <span className="muted">Markdown gốc luôn được giữ nguyên.</span>
          <button
            className="button"
            disabled={busy || !raw.trim()}
            onClick={() => send("preview")}
          >
            {busy
              ? busyAction === "save"
                ? "Đang lưu bản tin…"
                : "Đang tạo xem trước…"
              : "Xem trước bản tin →"}
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="notice">
        {message}
        {saved && (
          <>
            {" "}
            <Link href={"/timeline/" + saved}>Mở bản tin đã lưu →</Link>
          </>
        )}
      </p>
      {canFallback && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => send("preview", true)}
        >
          Dùng Legacy Markdown Parser →
        </button>
      )}
      {preview && (
        <section className="preview">
          <div className="section-label">
            <span>Bản xem trước</span>
            <span>{preview.parsed.items.length} tin</span>
          </div>
          <p className="notice">{preview.parsed.importMethod}</p>
          {preview.duplicate ? (
            <p className="review">
              Bản tin đã tồn tại.{" "}
              <Link href={"/timeline/" + preview.existingId}>
                Mở bản tin đã lưu →
              </Link>
            </p>
          ) : (
            <>
              <label>
                Ngày của bản tin
                <input
                  type="date"
                  disabled={
                    busy ||
                    !!saved ||
                    preview.parsed.importMethod ===
                      "Structured Intelligence Data"
                  }
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <h3>Tóm tắt</h3>
              <Markdown>{preview.parsed.summary}</Markdown>
              {preview.parsed.signal && (
                <>
                  <h3>Tín hiệu nổi bật</h3>
                  <Markdown>{preview.parsed.signal}</Markdown>
                </>
              )}
              {preview.parsed.model && (
                <>
                  <h3>Gợi ý model</h3>
                  <Markdown>{preview.parsed.model}</Markdown>
                </>
              )}
              {preview.parsed.warnings.length > 0 && (
                <div className="review notice">
                  <strong>Cần kiểm tra — bản gốc vẫn được lưu</strong>
                  <ul>
                    {preview.parsed.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="news-list">
                {preview.parsed.items.map((item, i) => (
                  <NewsCard key={i} item={item} />
                ))}
              </div>
              {preview.parsed.worthTrying.length > 0 && (
                <section>
                  <h3>Đáng thử</h3>
                  <ul>
                    {preview.parsed.worthTrying.map((entry, i) => (
                      <li key={i}>
                        {typeof entry === "string" ? (
                          entry
                        ) : (
                          <>
                            <strong>{entry.title}</strong>
                            {entry.reason && <> — {entry.reason}</>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <button
                className="button"
                disabled={busy || !date || !!saved}
                onClick={() => send("save")}
              >
                {busy && busyAction === "save"
                  ? "Đang lưu bản tin…"
                  : "Lưu vào nhật ký"}
              </button>
            </>
          )}
        </section>
      )}
      <details className="raw">
        <summary>Structured Intelligence Data — hợp đồng v1</summary>
        <pre>{structuredExample}</pre>
        <p>
          Khối JSON là dữ liệu chính thức; heading Markdown không tạo thêm tin.
          schema_version là 1, date là ngày ISO. Impact nhận very_high, high,
          medium, low, unknown; source dùng name và URL tùy chọn. Metadata có
          thể là null; worth_trying nhận chuỗi cũ hoặc object title/reason. JSON
          lỗi cần sửa hoặc chọn fallback rõ ràng.
        </p>
      </details>
      <details className="raw">
        <summary>Định dạng Markdown được hỗ trợ</summary>
        <pre>
          {
            "# Daily Brief — YYYY-MM-DD\n\n## Summary\nTóm tắt ngày\n\n## Biggest signal\nXu hướng đáng chú ý (tùy chọn)\n\n## Model recommendation\nGợi ý model (tùy chọn)\n\n### Tiêu đề tin\nDomain: AI\nCategory: Models\nFact: Sự kiện đã xảy ra\nAnalysis: Vì sao đáng chú ý\nRecommendation: Hành động gợi ý\nImpact: high\nSources: [Tên nguồn](https://example.com)"
          }
        </pre>
        <p>
          Nhận nhãn tiếng Việt tương đương. Định dạng khác vẫn lưu bản gốc và
          đánh dấu cần kiểm tra; không tự suy diễn các trường thiếu.
        </p>
      </details>
    </>
  );
}
