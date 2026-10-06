import { readFile } from "node:fs/promises";
import path from "node:path";

function serve(content: string, contentType: string) {
  return new Response(content, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (file === "project-guide.md") {
    return serve(
      await readFile(
        path.join(process.cwd(), "docs", "project-guide.md"),
        "utf8",
      ),
      "text/markdown",
    );
  }
  if (file === "README.md") {
    return serve(
      await readFile(path.join(process.cwd(), "README.md"), "utf8"),
      "text/markdown",
    );
  }
  if (file === "plan.md") {
    return serve(
      await readFile(path.join(process.cwd(), "plan.md"), "utf8"),
      "text/markdown",
    );
  }
  if (file === "AGENTS.md") {
    return serve(
      await readFile(path.join(process.cwd(), "AGENTS.md"), "utf8"),
      "text/markdown",
    );
  }
  if (file === "intelligence-import.md") {
    return serve(
      await readFile(
        path.join(
          process.cwd(),
          ".agents",
          "skills",
          "intelligence-import",
          "SKILL.md",
        ),
        "utf8",
      ),
      "text/markdown",
    );
  }

  if (!/^[a-z0-9-]+\.html$/i.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  let html: string;
  try {
    html = await readFile(path.join(process.cwd(), "docs", file), "utf8");
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const markdownLinks: Record<string, string> = {
    "project-guide.md": "/documents/project-guide.md",
    "../README.md": "/documents/README.md",
    "../plan.md": "/documents/plan.md",
    "../AGENTS.md": "/documents/AGENTS.md",
    "../.agents/skills/intelligence-import/SKILL.md":
      "/documents/intelligence-import.md",
  };

  for (const [from, to] of Object.entries(markdownLinks)) {
    html = html.replaceAll(`href="${from}"`, `href="${to}"`);
  }
  html = html
    .replaceAll('href="http://intelligence.localhost"', 'href="/"')
    .replaceAll('href="http://127.0.0.1:15000"', 'href="/"')
    .replaceAll("../src/app/icon.svg", "/icon.svg");

  return serve(html, "text/html");
}
