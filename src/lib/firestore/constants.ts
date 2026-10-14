import {
  SectionDoc,
  RoleDoc,
  InstrumentDoc,
  Prefecture,
  Municipality,
  AttendanceStatus,
  EventAdjustStatus,
  Genre,
  ScoreStatus,
} from "./types";
import defaultSectionsData from "@/data/master/sections.json";
import defaultRolesData from "@/data/master/roles.json";
import defaultInstrumentsData from "@/data/master/instruments.json";
import defaultPrefecturesData from "@/data/master/prefectures.json";
import defaultMunicipalitiesData from "@/data/master/municipalities.json";
import defaultGradesData from "@/data/master/grades.json";
import defaultAttendanceStatusesData from "@/data/master/attendanceStatuses.json";
import defaultEventAdjustStatusesData from "@/data/master/eventAdjustStatuses.json";
import defaultGenresData from "@/data/master/genres.json";
import defaultScoreStatusesData from "@/data/master/scoreStatuses.json";

export const DEFAULT_SECTIONS: SectionDoc[] = defaultSectionsData as SectionDoc[];

export const DEFAULT_ROLES: RoleDoc[] = defaultRolesData as RoleDoc[];

export const DEFAULT_INSTRUMENTS: InstrumentDoc[] = defaultInstrumentsData as InstrumentDoc[];

export const DEFAULT_PREFECTURES: Prefecture[] = defaultPrefecturesData as Prefecture[];

export const DEFAULT_MUNICIPALITIES: Municipality[] = defaultMunicipalitiesData as Municipality[];

export const GRADES: string[] = defaultGradesData as string[];

export const DEFAULT_ATTENDANCE_STATUSES: AttendanceStatus[] = defaultAttendanceStatusesData as AttendanceStatus[];

export const DEFAULT_EVENT_ADJUST_STATUSES: EventAdjustStatus[] = defaultEventAdjustStatusesData as EventAdjustStatus[];

export const DEFAULT_GENRES: Genre[] = defaultGenresData as Genre[];

export const DEFAULT_SCORE_STATUSES: ScoreStatus[] = defaultScoreStatusesData as ScoreStatus[];

