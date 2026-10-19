"use client";

import React from "react";
import { useSearchableList } from "@/hooks/useSearchableList";
import { SearchableListLayout } from "@/components/Layout/SearchableListLayout";
import { Media } from "@/lib/firestore/types";
import { mediaFilterFn, mediaSortFn, MediaFilters } from "../../lib/media-search-engine";
import {
  ListFilterGrid,
  FilterInput,
  FilterSelect,
  ListRow,
  ListCellHeader,
  ListCellLink,
  ListCellSmall,
} from "@/components/List/ListParts";

type Props = {
  initialData: {
    medias: Media[];
  };
};

export function MediaListClient({ initialData }: Props) {
  const list = useSearchableList<Media, MediaFilters>(
    initialData.medias,
    { search: "", sort: "date-desc" },
    mediaFilterFn,
    mediaSortFn
  );

  return (
    <SearchableListLayout
      title="メディア・音源"
      icon="fa-solid fa-photo-film"
      basePath="/media"
      list={list}
      tableHeaders={["タイトル", "日付", "Instagram", "YouTube", "録音/Drive", "TOP"]}
      searchFields={
        <ListFilterGrid>
          <FilterInput
            placeholder="タイトルで検索..."
            value={list.filters.search}
            onChange={(v) => list.updateFilter("search", v)}
          />
          <FilterSelect
            label="並び替え"
            options={[
              { id: "date-desc", name: "新しい順" },
              { id: "date-asc", name: "古い順" },
            ]}
            value={list.filters.sort}
            onChange={(v) => list.updateFilter("sort", v)}
          />
        </ListFilterGrid>
      }
    >
      {list.filteredData.map((m) => (
        <ListRow key={m.id}>
          <ListCellHeader href={`/media/confirm?mediaId=${m.id}`}>
            {m.title}
          </ListCellHeader>

          <ListCellSmall>{m.date}</ListCellSmall>

          <ListCellLink href={m.instagramUrl} icon="fa-brands fa-instagram" label="Instagram" />

          <ListCellLink href={m.youtubeUrl} icon="fa-brands fa-youtube" label="YouTube" />

          <ListCellLink href={m.driveUrl} icon="fa-brands fa-google-drive" label="録音/Drive" />

          <ListCellSmall>{m.isDispTop ? "表示" : ""}</ListCellSmall>
        </ListRow>
      ))}
    </SearchableListLayout>
  );
}
