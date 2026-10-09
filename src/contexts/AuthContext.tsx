"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, onAuthStateChanged, signOut, signInWithCustomToken } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { UserDoc } from "../lib/firestore/types";
import { toPlainObject } from "../lib/firestore/utils";

interface AuthContextType {
  user: User | null;
  userData: UserDoc | null;
  loading: boolean;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  logout: () => Promise<void>;
  loginWithCustomToken: (token: string) => Promise<void>;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  isSystemAdmin: false,
  logout: async () => {},
  loginWithCustomToken: async () => {},
  refreshUserData: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubscribeDoc = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              setUserData(toPlainObject<UserDoc>({ ...snap.data(), uid: snap.id }));
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error("User doc snapshot error:", err);
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithCustomToken = useCallback(async (token: string) => {
    setLoading(true);
    await signInWithCustomToken(auth, token);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUserData(null);
  }, []);

  const refreshUserData = useCallback(() => {
    // リアルタイム同期されているが、明示的なリフレッシュが必要な場合用
  }, []);

  // システム管理者判定
  const isSystemAdmin = !!userData?.isSystemAdmin;

  // モジュール別管理者判定 (パスに応じたRBAC動的導出)
  let isAdmin = isSystemAdmin;
  if (!isAdmin && userData) {
    if (pathname.startsWith("/user") && userData.isUserAdmin) isAdmin = true;
    if (pathname.startsWith("/event") && userData.isEventAdmin) isAdmin = true;
    if (pathname.startsWith("/score") && userData.isScoreAdmin) isAdmin = true;
    if (pathname.startsWith("/notice") && userData.isNoticeAdmin) isAdmin = true;
    if (pathname.startsWith("/live") && userData.isLiveAdmin) isAdmin = true;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isAdmin,
        isSystemAdmin,
        logout,
        loginWithCustomToken,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
