import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Call, CallAnswer, CallAnswerSong, ScoreStatus } from "@/lib/firestore/types";
import { DEFAULT_SCORE_STATUSES } from "@/lib/firestore/constants";
import { unstable_cache } from "next/cache";

/**
 * 譜面ステータス一覧を取得（ID順）
 */
export const getScoreStatusesServer = unstable_cache(
  async (): Promise<ScoreStatus[]> => {
    const snap = await adminDb.collection("scoreStatus").get();
    if (snap.empty) {
      return DEFAULT_SCORE_STATUSES;
    }
    return snap.docs
      .map(toPlainObject)
      .map((d: any) => ({
        id: d.id,
        name: d.name || "",
        order: d.order,
      }))
      .sort((a: any, b: any) => Number(a.order ?? a.id) - Number(b.order ?? b.id)) as ScoreStatus[];
  },
  ["master-score-statuses"],
  { revalidate: 86400, tags: ["master-score-statuses"] }
);


/**
 * 曲募集一覧を取得（作成日時降順）
 */
export async function getCallsServer(): Promise<Call[]> {
  const snap = await adminDb.collection("calls").orderBy("createdAt", "desc").get();
  return snap.docs.map(toPlainObject) as Call[];
}

/**
 * callAnswers の全ドキュメントIDを取得
 * リスト画面で参加者数・自分の回答状況を判定するために使用
 */
export async function getCallAnswerIdsServer(): Promise<string[]> {
  const snap = await adminDb.collection("callAnswers").get();
  return snap.docs.map(doc => doc.id);
}

/**
 * 特定の曲募集をIDで取得
 */
export async function getCallServer(callId: string): Promise<Call | null> {
  const docSnap = await adminDb.collection("calls").doc(callId).get();
  if (!docSnap.exists) return null;
  return toPlainObject(docSnap) as Call;
}

/**
 * 確認画面用: 特定募集の全回答・ユーザー名・譜面ステータスをまとめて取得
 */
export async function getCallConfirmDataServer(callId: string): Promise<{
  callAnswers: CallAnswer[];
  usersMap: Record<string, { displayName: string; pictureUrl?: string }>;
  scoreStatusMap: Record<string, string>;
}> {
  const answersSnap = await adminDb.collection("callAnswers").get();
  const matchingDocs = answersSnap.docs.filter(doc => doc.id.startsWith(callId + "_"));

  const callAnswers: CallAnswer[] = matchingDocs.map(doc => ({
    id: doc.id,
    uid: doc.data().uid as string,
    answers: (doc.data().answers || {}) as { [genre: string]: CallAnswerSong[] },
  }));

  const uids = [...new Set(callAnswers.map(a => a.uid).filter(Boolean))];

  const scoreStatusIds = new Set<string>();
  callAnswers.forEach(ans => {
    Object.values(ans.answers).forEach(songs => {
      songs.forEach(song => {
        if (song.scorestatus) scoreStatusIds.add(song.scorestatus);
      });
    });
  });

  const [userDocs, scoreStatusDocs] = await Promise.all([
    Promise.all(uids.map(uid => adminDb.collection("users").doc(uid).get())),
    Promise.all([...scoreStatusIds].map(id => adminDb.collection("scoreStatus").doc(id).get())),
  ]);

  const usersMap: Record<string, { displayName: string; pictureUrl?: string }> = {};
  userDocs.forEach(doc => {
    if (doc.exists) {
      usersMap[doc.id] = {
        displayName: doc.data()?.displayName || "(不明)",
        pictureUrl: doc.data()?.pictureUrl || "",
      };
    }
  });

  const scoreStatusMap: Record<string, string> = {};
  DEFAULT_SCORE_STATUSES.forEach((s) => {
    scoreStatusMap[s.id] = s.name;
  });
  scoreStatusDocs.forEach((doc) => {
    if (doc.exists) scoreStatusMap[doc.id] = doc.data()?.name || scoreStatusMap[doc.id] || "";
  });


  return { callAnswers, usersMap, scoreStatusMap };
}
