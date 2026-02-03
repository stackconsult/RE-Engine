import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = (lines[0] || "").split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const cols: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === "," && !inQuote) {
        cols.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current);

    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? "").trim()));
    rows.push(row);
  }

  return { headers, rows };
}

export function toCsv(headers: readonly string[], rows: Record<string, string>[]): string {
  const out: string[] = [];
  out.push(headers.join(","));
  for (const r of rows) out.push(headers.map((h) => (r[h] ?? "")).join(","));
  return out.join("\n") + "\n";
}

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = path.join(dir, `.tmp_${path.basename(filePath)}_${randomUUID()}`);
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, filePath);
}

export async function readText(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}
