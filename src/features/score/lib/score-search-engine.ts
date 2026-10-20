import { Score, EventWithSetlist } from "@/lib/firestore/types";

export type ScoreFilters = {
  search: string;
  genre: string;
  eventId: string;
  sort: string;
};

// フィルタ知能 (タイトル・保管場所・略称・備考での横断検索)
export const scoreFilterFn = (s: Score, f: ScoreFilters, events: EventWithSetlist[]) => {
  const q = (f.search || "").toLowerCase().trim();
  const matchSearch =
    !q ||
    (s.title || "").toLowerCase().includes(q) ||
    (s.storageLocation || "").toLowerCase().includes(q) ||
    (s.abbreviation || "").toLowerCase().includes(q) ||
    (s.note || "").toLowerCase().includes(q);

  const matchGenre = !f.genre || s.genres?.includes(f.genre);
  let matchEvent = true;
  if (f.eventId) {
    const event = events.find((e) => e.id === f.eventId);
    matchEvent = event?.scoreIdsInSetlist?.includes(s.id) ?? false;
  }
  return !!(matchSearch && matchGenre && matchEvent);
};

// ソート知能
export const scoreSortFn = (a: Score, b: Score, f: ScoreFilters, events: EventWithSetlist[]) => {
  if (f.eventId) {
    const event = events.find((e) => e.id === f.eventId);
    const orderedIds = event?.scoreIdsInSetlist || [];
    return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id);
  }
  const [key, order] = (f.sort || "createdAt-desc").split("-");
  const isAsc = order === "asc";
  if (key === "title") {
    return isAsc
      ? (a.title || "").localeCompare(b.title || "", "ja")
      : (b.title || "").localeCompare(a.title || "", "ja");
  }
  return isAsc ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0);
};
