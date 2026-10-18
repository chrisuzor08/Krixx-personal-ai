"use client";
import { Check, Copy } from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const KW = /\b(const|let|var|function|return|if|else|for|while|import|from|export|class|new|async|await|def|try|catch|except|throw|public|private|static|interface|type|extends|true|false|null|undefined|None|True|False|self|this|in|of|switch|case|break|package|fn|struct|impl|use|pub)\b/;

/** Tiny dependency-free highlighter: comments, strings, numbers, keywords. */
function highlight(code: string): ReactNode[] {
  const re = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [t] = m;
    if (m[1]) out.push(<span key={i++} className="tok-c">{t}</span>);
    else if (m[2]) out.push(<span key={i++} className="tok-s">{t}</span>);
    else if (m[3]) out.push(<span key={i++} className="tok-n">{t}</span>);
    else if (KW.test(t)) out.push(<span key={i++} className="tok-k">{t}</span>);
    else out.push(t);
    last = m.index + t.length;
  }
  out.push(code.slice(last));
  return out;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line bg-[#0b0c12]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5 text-[11px] text-[#9296a5]">
        <span className="font-mono">{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-[#e5e7eb]">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const code = String(children ?? "");
            if (!lang && !code.includes("\n")) return <code>{children}</code>;
            return <CodeBlock lang={lang ?? ""} code={code.replace(/\n$/, "")} />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
