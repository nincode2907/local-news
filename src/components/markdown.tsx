import ReactMarkdown from "react-markdown";
export function Markdown({
  children,
  excerpt = false,
}: {
  children: string | null;
  excerpt?: boolean;
}) {
  return children ? (
    <div className="prose">
      <ReactMarkdown
        allowedElements={excerpt ? ["p", "strong", "em"] : undefined}
        unwrapDisallowed={excerpt}
      >
        {children}
      </ReactMarkdown>
    </div>
  ) : (
    <span className="muted">Chưa có trong bản tin.</span>
  );
}
