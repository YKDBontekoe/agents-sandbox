export function sanitizeSkillList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of value) {
    if (typeof entry === 'string' && !seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }

  return result;
}

export function skillsListToRecord(skills: string[]): Record<string, boolean> {
  return skills.reduce<Record<string, boolean>>((acc, id) => {
    if (typeof id === 'string' && !(id in acc)) {
      acc[id] = true;
    }
    return acc;
  }, {});
}

export function recordToSkillList(record: Record<string, boolean>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (value && typeof key === 'string' && !seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }

  return result;
}

export function readSkillCache(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem('ad_skills_unlocked');
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return skillsListToRecord(sanitizeSkillList(parsed));
    }

    if (parsed && typeof parsed === 'object') {
      const result: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof key === 'string' && Boolean(value)) {
          result[key] = true;
        }
      }
      return result;
    }
  } catch {
    // Ignore malformed cache data
  }

  return {};
}

export function writeSkillCache(skills: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload = skillsListToRecord(skills);
    window.localStorage.setItem('ad_skills_unlocked', JSON.stringify(payload));
  } catch {
    // Ignore storage write errors (quota, privacy settings, etc.)
  }
}
