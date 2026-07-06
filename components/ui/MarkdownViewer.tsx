"use client";

import React from "react";

interface Props {
  text: string;
  className?: string;
}

type BlockType =
  | { kind: "h1" | "h2" | "h3" | "h4"; text: string; key: string }
  | { kind: "code"; lang: string; lines: string[]; key: string }
  | { kind: "blockquote"; text: string; key: string }
  | { kind: "ul"; items: string[]; key: string }
  | { kind: "ol"; items: Array<{ num: string; text: string }>; key: string }
  | { kind: "table"; head: string[]; rows: string[][]; key: string }
  | { kind: "hr"; key: string }
  | { kind: "p"; text: string; key: string };

/** Render inline markdown: **bold**, *italic*, `code`, [link](url) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined pattern: bold, italic, code, link
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<code key={match.index}>{match[4]}</code>);
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={match.index}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--csa-primary)", textDecoration: "underline" }}
        >
          {match[5]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseBlocks(raw: string): BlockType[] {
  const lines = raw.split("\n");
  const blocks: BlockType[] = [];
  let i = 0;
  let keyIdx = 0;
  const k = () => String(keyIdx++);

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.replace(/^```\s*/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "code", lang, lines: codeLines, key: k() });
      i++; // skip closing ```
      continue;
    }

    // Headings
    if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const text = line.replace(/^#+\s*/, "");
      const kind = (["h1", "h2", "h3", "h4"][Math.min(level - 1, 3)] as BlockType["kind"]) as
        | "h1"
        | "h2"
        | "h3"
        | "h4";
      blocks.push({ kind, text, key: k() });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ kind: "hr", key: k() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join(" "), key: k() });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items, key: k() });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: Array<{ num: string; text: string }> = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const m = lines[i].match(/^(\d+)\.\s(.*)/);
        if (m) items.push({ num: m[1], text: m[2] });
        i++;
      }
      blocks.push({ kind: "ol", items, key: k() });
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.includes("---")) {
      const head = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean),
        );
        i++;
      }
      blocks.push({ kind: "table", head, rows, key: k() });
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*+]\s|^\d+\.\s|^#{1,4}\s|^>|^```/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ kind: "p", text: paraLines.join(" "), key: k() });
    }
  }

  return blocks;
}

export default function MarkdownViewer({ text, className = "" }: Props) {
  const blocks = parseBlocks(text);

  return (
    <div className={`prose-lesson ${className}`}>
      {blocks.map((block) => {
        switch (block.kind) {
          case "h1":
            return <h1 key={block.key}>{renderInline(block.text)}</h1>;
          case "h2":
            return <h2 key={block.key}>{renderInline(block.text)}</h2>;
          case "h3":
            return <h3 key={block.key}>{renderInline(block.text)}</h3>;
          case "h4":
            return <h4 key={block.key}>{renderInline(block.text)}</h4>;

          case "code":
            return (
              <pre key={block.key}>
                {block.lang && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 12,
                      fontSize: "0.7rem",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {block.lang}
                  </span>
                )}
                <code>{block.lines.join("\n")}</code>
              </pre>
            );

          case "blockquote":
            return (
              <blockquote key={block.key}>
                {renderInline(block.text)}
              </blockquote>
            );

          case "ul":
            return (
              <ul key={block.key}>
                {block.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item)}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={block.key}>
                {block.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item.text)}</li>
                ))}
              </ol>
            );

          case "table":
            return (
              <table key={block.key}>
                <thead>
                  <tr>
                    {block.head.map((h, idx) => (
                      <th key={idx}>{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );

          case "hr":
            return <hr key={block.key} />;

          case "p":
            return <p key={block.key}>{renderInline(block.text)}</p>;

          default:
            return null;
        }
      })}
    </div>
  );
}
