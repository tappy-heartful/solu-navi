import { SectionDoc, RoleDoc, InstrumentDoc, Prefecture, Municipality } from "./types";
import defaultSectionsData from "@/data/master/sections.json";
import defaultRolesData from "@/data/master/roles.json";
import defaultInstrumentsData from "@/data/master/instruments.json";
import defaultPrefecturesData from "@/data/master/prefectures.json";
import defaultMunicipalitiesData from "@/data/master/municipalities.json";
import defaultGradesData from "@/data/master/grades.json";

export const DEFAULT_SECTIONS: SectionDoc[] = defaultSectionsData as SectionDoc[];

export const DEFAULT_ROLES: RoleDoc[] = defaultRolesData as RoleDoc[];

export const DEFAULT_INSTRUMENTS: InstrumentDoc[] = defaultInstrumentsData as InstrumentDoc[];

export const DEFAULT_PREFECTURES: Prefecture[] = defaultPrefecturesData as Prefecture[];

export const DEFAULT_MUNICIPALITIES: Municipality[] = defaultMunicipalitiesData as Municipality[];

export const GRADES: string[] = defaultGradesData as string[];
