/**
 * カレンダーおよび繰り返しイベント用ユーティリティ
 * (CANDY のアルゴリズムに準拠し、ハイフン区切り / ドット区切りの両形式に対応)
 */

export const padZero = (n: number) => n.toString().padStart(2, "0");

/**
 * 任意の "YYYY-MM-DD" または "yyyy.MM.dd" を "YYYY-MM-DD" (ハイフン区切り) に正規化
 */
export const toHyphenDate = (dateStr: string): string => {
  if (!dateStr) return "";
  return dateStr.replace(/\./g, "-");
};

/**
 * 任意の "YYYY-MM-DD" または "yyyy.MM.dd" を "yyyy.MM.dd" (ドット区切り) に正規化
 */
export const toDotDate = (dateStr: string): string => {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, ".");
};

/**
 * 2つの日付間の日数差分 (dateStr2 - dateStr1)
 */
export const getDaysDiff = (dateStr1: string, dateStr2: string): number => {
  const d1 = new Date(toHyphenDate(dateStr1));
  const d2 = new Date(toHyphenDate(dateStr2));
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 日付文字列を指定日数分シフトする
 * 返り値は入力形式 (ハイフンかドットか) を保持
 */
export const shiftDateString = (dateStr: string, diffDays: number): string => {
  const isDot = dateStr.includes(".");
  const normalized = toHyphenDate(dateStr);
  const [y, m, d] = normalized.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + diffDays);
  const shiftedHyphen = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
  return isDot ? toDotDate(shiftedHyphen) : shiftedHyphen;
};

/**
 * 繰り返し単位に応じたデフォルトの繰り返し終了日を算出
 */
export const calculateDefaultEndDate = (
  start: string,
  unit: "day" | "week" | "month" | "year"
): string => {
  if (!start) return "";
  const normalized = toHyphenDate(start);
  const [y, m, d] = normalized.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  if (unit === "day") {
    date.setDate(date.getDate() + 7);
  } else if (unit === "week") {
    date.setMonth(date.getMonth() + 1);
  } else if (unit === "month") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (unit === "year") {
    date.setFullYear(date.getFullYear() + 5);
  }

  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

export interface RecurrenceConfig {
  interval: number;
  unit: "day" | "week" | "month" | "year";
  monthlyOption?: "dayOfMonth" | "dayOfWeek";
  yearlyOption?: "dayOfYear" | "dayOfWeekOfYear";
  endDate: string; // YYYY-MM-DD
}

/**
 * 繰り返し設定に基づいて対象日付一覧 (YYYY-MM-DD) を生成 (CANDY 準拠)
 */
export const generateRecurrenceDates = (
  startDate: string,
  config: RecurrenceConfig
): string[] => {
  const normalizedStart = toHyphenDate(startDate);
  const normalizedEnd = toHyphenDate(config.endDate);
  const dates: string[] = [normalizedStart];

  const [startYear, startMonth, startDay] = normalizedStart.split("-").map(Number);
  const baseDate = new Date(startYear, startMonth - 1, startDay);

  const baseDayOfWeek = baseDate.getDay();
  const baseWeekNum = Math.ceil(startDay / 7);

  // 無限ループ防止用の安全リミット (最大1000件)
  const maxSafetyLimit = 1000;

  for (let i = 1; i < maxSafetyLimit; i++) {
    const nextDate = new Date(startYear, startMonth - 1, startDay);
    let nextDateStr = "";

    if (config.unit === "day") {
      nextDate.setDate(baseDate.getDate() + i * config.interval);
      nextDateStr = `${nextDate.getFullYear()}-${padZero(nextDate.getMonth() + 1)}-${padZero(nextDate.getDate())}`;
    } else if (config.unit === "week") {
      nextDate.setDate(baseDate.getDate() + i * config.interval * 7);
      nextDateStr = `${nextDate.getFullYear()}-${padZero(nextDate.getMonth() + 1)}-${padZero(nextDate.getDate())}`;
    } else if (config.unit === "month") {
      // Nヶ月進める
      const targetMonth = startMonth - 1 + i * config.interval;
      if (config.monthlyOption === "dayOfWeek") {
        // 毎月第X曜日
        const tempDate = new Date(startYear, targetMonth, 1);
        const firstDayOfWeek = tempDate.getDay();
        let firstTargetDay = 1 + (baseDayOfWeek - firstDayOfWeek);
        if (firstTargetDay <= 0) firstTargetDay += 7;
        const targetDay = firstTargetDay + (baseWeekNum - 1) * 7;
        const lastDayOfMonth = new Date(startYear, targetMonth + 1, 0).getDate();
        const finalDay = targetDay > lastDayOfMonth ? targetDay - 7 : targetDay;
        const finalDate = new Date(startYear, targetMonth, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      } else {
        // 毎月N日
        const lastDayOfMonth = new Date(startYear, targetMonth + 1, 0).getDate();
        const finalDay = startDay > lastDayOfMonth ? lastDayOfMonth : startDay;
        const finalDate = new Date(startYear, targetMonth, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      }
    } else if (config.unit === "year") {
      // N年進める
      const targetYear = startYear + i * config.interval;
      if (config.yearlyOption === "dayOfWeekOfYear") {
        // 毎年M月第X曜日
        const tempDate = new Date(targetYear, startMonth - 1, 1);
        const firstDayOfWeek = tempDate.getDay();
        let firstTargetDay = 1 + (baseDayOfWeek - firstDayOfWeek);
        if (firstTargetDay <= 0) firstTargetDay += 7;
        const targetDay = firstTargetDay + (baseWeekNum - 1) * 7;
        const lastDayOfMonth = new Date(targetYear, startMonth, 0).getDate();
        const finalDay = targetDay > lastDayOfMonth ? targetDay - 7 : targetDay;
        const finalDate = new Date(targetYear, startMonth - 1, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      } else {
        // 毎年M月N日
        const lastDayOfMonth = new Date(targetYear, startMonth, 0).getDate();
        const finalDay = startDay > lastDayOfMonth ? lastDayOfMonth : startDay;
        const finalDate = new Date(targetYear, startMonth - 1, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      }
    }

    if (nextDateStr > normalizedEnd) {
      break;
    }
    dates.push(nextDateStr);
  }

  return dates;
};
