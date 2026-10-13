/**
 * Utility helper to tidy up and format notes (catatan), KUA names, and applicant names.
 */

export function resolveAutoKuaName(district?: string, institutionName?: string): string {
  const cleanDist = district ? district.replace(/^Kec\.?\s*/i, '').trim() : '';

  if (institutionName && institutionName.trim() !== '-' && institutionName.trim() !== '') {
    const trimmed = institutionName.trim();
    // If it's already "KUA Kec. ..." or custom institution (e.g. "Masjid ...")
    if (/^KUA\s/i.test(trimmed)) {
      return trimmed;
    }
    // If it's just "Kec. PARIGI", prepend KUA
    if (/^Kec\.?\s/i.test(trimmed)) {
      return `KUA ${trimmed}`;
    }
    return trimmed;
  }

  if (cleanDist) {
    return `KUA Kec. ${cleanDist}`;
  }

  return '-';
}

export function cleanAndTidyNotes(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[]') {
    return '';
  }

  // If starts and ends with JSON curly braces
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return formatParsedJsonObject(parsed);
    } catch {
      // ignore JSON parse error
    }
  }

  // If contains embedded JSON (e.g. "[Input Drive] {...}")
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const prefix = trimmed.slice(0, jsonMatch.index).trim();
      const formatted = formatParsedJsonObject(parsed);
      return [prefix, formatted].filter(Boolean).join(' : ');
    } catch {
      // ignore
    }
  }

  // Remove duplicate quotes, backslashes, or unneeded characters
  return trimmed
    .replace(/^["']|["']$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ');
}

function formatParsedJsonObject(obj: Record<string, any>): string {
  if (!obj || typeof obj !== 'object') return '';

  const ignoredKeys = [
    'applicantName', 'nama', 'phone', 'email', 'id', 'source',
    'serviceTitle', 'address', 'district', 'institutionName',
    'verificationCode', 'filesCount', 'fileUrls', 'status'
  ];

  const lines: string[] = [];

  // If there's an explicit catatan/keterangan field, put it first
  const explicitNote = obj.catatan || obj.keterangan || obj.notes || obj.note || obj['Keterangan'] || obj['Catatan'];
  if (explicitNote && typeof explicitNote === 'string' && explicitNote.trim() && explicitNote.trim() !== '-') {
    lines.push(explicitNote.trim());
  }

  for (const [key, val] of Object.entries(obj)) {
    if (ignoredKeys.includes(key) || ['catatan', 'keterangan', 'notes', 'note', 'Keterangan', 'Catatan'].includes(key)) {
      continue;
    }
    if (val === null || val === undefined) continue;

    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val).trim();
    if (valStr && valStr !== '-' && valStr !== 'null') {
      const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`${cleanKey}: ${valStr}`);
    }
  }

  return lines.join(' • ');
}

export function getParsedNotesKeyValues(raw?: string | null): Array<{ key: string; value: string }> {
  if (!raw) return [];
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') {
    return [];
  }

  let obj: Record<string, any> | null = null;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      obj = JSON.parse(trimmed);
    } catch {}
  } else {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        obj = JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }

  if (obj && typeof obj === 'object') {
    const results: Array<{ key: string; value: string }> = [];
    const ignoredKeys = [
      'source', 'verificationCode', 'filesCount', 'fileUrls', 'status'
    ];

    for (const [k, v] of Object.entries(obj)) {
      if (ignoredKeys.includes(k) || v === null || v === undefined) continue;
      const vStr = typeof v === 'object' ? JSON.stringify(v) : String(v).trim();
      if (vStr && vStr !== '-') {
        results.push({
          key: k.replace(/_/g, ' '),
          value: vStr
        });
      }
    }
    return results;
  }

  return [{ key: 'Catatan', value: cleanAndTidyNotes(trimmed) }];
}
