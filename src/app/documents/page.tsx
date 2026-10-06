import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ArrowUpRight, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

async function listDocuments() {
  const directory = path.join(process.cwd(), "docs");
  const names = (await readdir(directory)).filter((name) =>
    /^[a-z0-9-]+\.html$/i.test(name),
  );

  return Promise.all(
    names.sort().map(async (name) => {
      const html = await readFile(path.join(directory, name), "utf8");
      const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim();
      return { name, title: title || name };
    }),
  );
}

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <main>
      <div className="eyebrow">Thư viện / Tài liệu</div>
      <div className="heading-row">
        <h1>Tài liệu</h1>
        <div className="edition">{documents.length} tài liệu HTML</div>
      </div>
      <p className="documents-intro">
        Hướng dẫn và tài liệu dự án, được mở riêng để dễ đọc và tra cứu.
      </p>
      {documents.length ? (
        <ul className="documents-list">
          {documents.map((document) => (
            <li key={document.name}>
              <FileText aria-hidden="true" size={21} />
              <span className="documents-copy">
                <strong>{document.title}</strong>
                <small>{document.name}</small>
              </span>
              <a
                href={`/documents/${encodeURIComponent(document.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mở ${document.title} trong tab mới`}
              >
                Mở tài liệu <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <FileText aria-hidden="true" size={24} />
          <p>Chưa có tài liệu HTML trong thư mục docs/.</p>
        </div>
      )}
    </main>
  );
}
