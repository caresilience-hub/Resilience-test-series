export function serializeSelectedSubjects(selectedSubjects: string[]) {
  return JSON.stringify(selectedSubjects);
}

export function serializePaperTimelines(paperTimelines: Record<string, string>) {
  return JSON.stringify(paperTimelines);
}

export function parseSelectedSubjects(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((subject) => String(subject)).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((subject) => String(subject)).filter(Boolean) : [];
    } catch {
      return value ? [value] : [];
    }
  }

  return [];
}

export function parsePaperTimelines(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  return {};
}
