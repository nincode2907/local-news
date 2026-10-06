import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { connect } from "../../src/lib/connection";
import { structuredExample } from "../../src/lib/import-example";
test("Today, timeline detail/raw, search fields and combined filters", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Điểm tin hôm nay" }),
  ).toBeVisible();
  await expect(page.locator(".news-card")).toHaveCount(3);
  await page.screenshot({
    path: "test-results/today-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Lịch sử", exact: true }).click();
  await expect(page.locator(".timeline>a")).toHaveCount(3);
  await page.locator(".timeline>a").first().click();
  await page.getByText("Xem Markdown gốc").click();
  await expect(page.locator(".raw pre")).toContainText(
    "### From impressive demos",
  );
  await page.getByRole("link", { name: "Tìm kiếm", exact: true }).click();
  for (const q of [
    "From impressive",
    "fixed set",
    "dependable",
    "switching models",
  ]) {
    await page.getByLabel("Từ khóa", { exact: true }).fill(q);
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await expect(page.locator(".news-card")).toHaveCount(1);
  }
  await page.getByLabel("Từ khóa", { exact: true }).fill("");
  await page.getByLabel("Ngày", { exact: true }).fill("2026-10-05");
  await page.getByLabel("Lĩnh vực", { exact: true }).selectOption("AI");
  await page
    .getByLabel("Chuyên mục", { exact: true })
    .selectOption("Evaluation");
  await page.getByLabel("Tác động", { exact: true }).selectOption("high");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/today-mobile.png",
    fullPage: true,
  });
});
test("clipboard empty, denied, success, invalid content, duplicate", async ({
  page,
}) => {
  await page.goto("/import");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText: async () => "" },
    }),
  );
  await page.getByRole("button", { name: "Đọc clipboard" }).click();
  await expect(page.getByRole("status")).toContainText("Clipboard trống");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Đọc clipboard" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Không đọc được clipboard",
  );
  await page.getByLabel("Markdown gốc").fill("invalid");
  await page.getByRole("button", { name: "Xem trước bản tin" }).click();
  await expect(page.getByRole("status")).toContainText("không hợp lệ");
  const raw = await readFile("fixtures/2026-10-05.md", "utf8");
  await page.evaluate(
    (value) =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { readText: async () => value },
      }),
    raw,
  );
  await page.getByRole("button", { name: "Đọc clipboard" }).click();
  await expect(page.getByLabel("Markdown gốc")).toHaveValue(raw);
  await page.getByRole("button", { name: "Xem trước bản tin" }).click();
  await expect(page.locator(".preview")).toContainText("Bản tin đã tồn tại");
  await expect(
    page.getByRole("button", { name: "Lưu vào nhật ký" }),
  ).toHaveCount(0);
});
test("save partial raw, duplicate API, database failure retains draft", async ({
  page,
  request,
}) => {
  const raw =
    "# Daily Brief — 2026-10-06\nAn unstructured daily brief kept verbatim for review.";
  await page.goto("/import");
  await page.getByLabel("Markdown gốc").fill(raw);
  await page.getByRole("button", { name: "Xem trước bản tin" }).click();
  await expect(page.locator(".preview")).toContainText("Cần kiểm tra");
  await page.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu bản gốc");
  const href = await page
    .getByRole("link", { name: "Mở bản tin đã lưu" })
    .getAttribute("href");
  const duplicate = await request.post("/api/import", {
    data: { action: "save", raw },
  });
  expect((await duplicate.json()).duplicate).toBe(true);
  await page.goto(href!);
  await page.getByText("Xem Markdown gốc").click();
  await expect(page.locator(".raw pre")).toHaveText(raw);
  const db = connect(process.env.TEST_DB_URL);
  try {
    await db.client.execute(
      "CREATE TRIGGER reject_import BEFORE INSERT ON daily_briefs BEGIN SELECT RAISE(ABORT, 'test database error'); END",
    );
    await page.goto("/import");
    await page.getByLabel("Markdown gốc").fill(raw + "\nNew draft.");
    await page.getByRole("button", { name: "Xem trước bản tin" }).click();
    await page.getByRole("button", { name: "Lưu vào nhật ký" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Không lưu/đọc được database",
    );
    await expect(page.getByLabel("Markdown gốc")).toHaveValue(
      raw + "\nNew draft.",
    );
  } finally {
    await db.client.execute("DROP TRIGGER IF EXISTS reject_import");
    db.client.close();
  }
  expect((await request.post("/api/import", { data: null })).status()).toBe(
    400,
  );
  expect(
    (
      await request.post("/api/import", {
        data: { action: "save", raw, date: "2026-02-30" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/import", {
        headers: { Origin: "https://example.com" },
        data: { action: "preview", raw },
      })
    ).status(),
  ).toBe(403);
});

test("production restart preserves imported data", async () => {
  const { spawn } = await import("node:child_process");
  async function start() {
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "15091",
      ],
      {
        env: {
          ...process.env,
          TURSO_DATABASE_URL: process.env.TEST_DB_URL,
          TURSO_AUTH_TOKEN: "",
        },
        stdio: "ignore",
      },
    );
    await expect
      .poll(async () => {
        try {
          return (await fetch("http://127.0.0.1:15091/")).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    return child;
  }
  async function stop(child: Awaited<ReturnType<typeof start>>) {
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      child.kill("SIGTERM");
    });
  }
  let child = await start();
  try {
    expect(await (await fetch("http://127.0.0.1:15091/")).text()).toContain(
      "2026-10-06",
    );
  } finally {
    await stop(child);
  }
  child = await start();
  try {
    const html = await (await fetch("http://127.0.0.1:15091/")).text();
    expect(html).toContain("2026-10-06");
    expect(html).toContain(
      "An unstructured daily brief kept verbatim for review.",
    );
  } finally {
    await stop(child);
  }
});

test("structured preview/save is authoritative and duplicate import is safe", async ({
  page,
  request,
}) => {
  const raw = structuredExample
    .replace(
      "# Daily Brief — 2026-10-05",
      "# Daily Brief — 2030-01-01\n### Markdown heading must not be imported\nFact: Ignore this",
    )
    .replace('"date": "2026-10-05"', '"date": "2026-10-02"');
  await page.goto("/import");
  await page.getByLabel("Markdown gốc").fill(raw);
  await page.getByRole("button", { name: "Xem trước bản tin" }).click();
  await expect(page.locator(".preview")).toContainText(
    "Structured Intelligence Data",
  );
  await expect(page.locator(".preview .news-card")).toHaveCount(1);
  await expect(page.getByLabel("Ngày của bản tin")).toHaveValue("2026-10-02");
  await expect(page.getByLabel("Ngày của bản tin")).toBeDisabled();
  await expect(page.locator(".preview")).toContainText(
    "Đo mức thay đổi thực tế trên cùng một tác vụ.",
  );
  await expect(page.locator(".preview")).toContainText("Tác động: Rất cao");
  await expect(page.locator(".preview")).toContainText("Google");
  expect(
    (
      await request.post("/api/import", {
        data: { action: "save", raw, date: "2030-01-01" },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu bản gốc");
  const href = await page
    .getByRole("link", { name: "Mở bản tin đã lưu" })
    .getAttribute("href");
  const duplicate = await request.post("/api/import", {
    data: { action: "save", raw },
  });
  expect((await duplicate.json()).duplicate).toBe(true);
  await page.goto(href!);
  await expect(page.locator(".news-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Đáng thử" })).toBeVisible();
  await page.getByText("Xem Markdown gốc").click();
  await expect(page.locator(".raw pre")).toHaveText(raw);
});

test("invalid JSON warns and requires explicit legacy fallback before saving", async ({
  page,
  request,
}) => {
  const raw =
    "# Daily Brief — 2026-10-01\n## Summary\nFallback summary\n---INTELLIGENCE-DATA-START---\n{invalid JSON\n### Fake JSON heading\nFact: Ignore this\n---INTELLIGENCE-DATA-END---\n### Legacy item outside block\nFact: Explicit fallback fact\nImpact: high\nSources: https://example.com";
  const rejected = await request.post("/api/import", {
    data: { action: "save", raw },
  });
  expect(rejected.status()).toBe(422);
  expect((await rejected.json()).canFallback).toBe(true);
  expect(
    (
      await request.post("/api/import", {
        data: { action: "save", raw, allowLegacyFallback: "true" },
      })
    ).status(),
  ).toBe(400);
  await page.goto("/import");
  await page.getByLabel("Markdown gốc").fill(raw);
  await page.getByRole("button", { name: "Xem trước bản tin" }).click();
  await expect(page.getByRole("status")).toContainText("JSON không hợp lệ");
  await expect(
    page.getByRole("button", { name: "Lưu vào nhật ký" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Markdown gốc")).toHaveValue(raw);
  await page
    .getByRole("button", { name: "Dùng Legacy Markdown Parser" })
    .click();
  await expect(page.locator(".preview")).toContainText(
    "Legacy Markdown Parser",
  );
  await expect(page.locator(".preview .news-card")).toHaveCount(1);
  await expect(page.locator(".preview")).toContainText(
    "Legacy item outside block",
  );
  await expect(page.locator(".preview .review")).toContainText(
    "Structured Intelligence Data không hợp lệ",
  );
  await page.getByRole("button", { name: "Lưu vào nhật ký" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu bản gốc");
  await page.getByRole("link", { name: "Mở bản tin đã lưu" }).click();
  await page.getByText("Xem Markdown gốc").click();
  await expect(page.locator(".raw pre")).toHaveText(raw);
});
