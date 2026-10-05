import ReactMarkdown from "react-markdown";
export function Markdown({ children }: { children: string | null }) {
  return children ? (
    <div className="prose">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  ) : (
    <span className="muted">Chưa có trong brief.</span>
  );
}
