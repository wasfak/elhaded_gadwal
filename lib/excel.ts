import * as XLSX from "xlsx";

export type ItemRow = { code: string; name: string };
export type BranchRow = { name: string };
export type ParseResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; errors: string[] };

function readSheet(file: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(file, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // defval keeps empty cells as "" so we can flag them, not skip them
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

// ---------- ITEMS: header row must be code | name ----------
export function parseItems(
  buf: ArrayBuffer,
  existingCodes: Set<string>
): ParseResult<ItemRow> {
  const json = readSheet(buf);
  const errors: string[] = [];

  if (json.length === 0)
    return { ok: false, errors: ["File is empty — no rows found."] };

  const headerKeys = Object.keys(json[0]).map((k) => k.toLowerCase().trim());
  if (!headerKeys.includes("code"))
    errors.push('Missing required column "code".');
  if (!headerKeys.includes("name"))
    errors.push('Missing required column "name".');
  if (errors.length) return { ok: false, errors };

  const rows: ItemRow[] = [];
  const seen = new Map<string, number>(); // code -> first excel row

  json.forEach((raw, i) => {
    const excelRow = i + 2; // +1 for header, +1 for 1-indexing
    // find the actual keys case-insensitively
    const codeKey = Object.keys(raw).find((k) => k.toLowerCase().trim() === "code")!;
    const nameKey = Object.keys(raw).find((k) => k.toLowerCase().trim() === "name")!;
    const code = norm(raw[codeKey]);
    const name = norm(raw[nameKey]);

    if (!code) errors.push(`Row ${excelRow} — Code is empty.`);
    if (!name) errors.push(`Row ${excelRow} — Name is empty.`);
    if (!code) return;

    if (seen.has(code)) {
      errors.push(
        `Row ${excelRow} — Code "${code}" appears twice in this file (rows ${seen.get(
          code
        )} and ${excelRow}).`
      );
    } else {
      seen.set(code, excelRow);
    }

    if (existingCodes.has(code))
      errors.push(`Row ${excelRow} — Code "${code}" already exists in the system.`);

    rows.push({ code, name });
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, rows };
}

// ---------- BRANCHES: header row must be branch ----------
export function parseBranches(
  buf: ArrayBuffer,
  existingNames: Set<string>
): ParseResult<BranchRow> {
  const json = readSheet(buf);
  const errors: string[] = [];

  if (json.length === 0)
    return { ok: false, errors: ["File is empty — no rows found."] };

  const headerKeys = Object.keys(json[0]).map((k) => k.toLowerCase().trim());
  if (!headerKeys.includes("branch"))
    return { ok: false, errors: ['Missing required column "branch".'] };

  const rows: BranchRow[] = [];
  const seen = new Map<string, number>();

  json.forEach((raw, i) => {
    const excelRow = i + 2;
    const branchKey = Object.keys(raw).find(
      (k) => k.toLowerCase().trim() === "branch"
    )!;
    const name = norm(raw[branchKey]);

    if (!name) {
      errors.push(`Row ${excelRow} — Branch is empty.`);
      return;
    }

    // case-insensitive duplicate detection within file
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push(
        `Row ${excelRow} — Branch "${name}" appears twice in this file (rows ${seen.get(
          key
        )} and ${excelRow}).`
      );
    } else {
      seen.set(key, excelRow);
    }

    if (existingNames.has(key))
      errors.push(`Row ${excelRow} — Branch "${name}" already exists in the system.`);

    rows.push({ name });
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, rows };
}