"use client";

import React, { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
}

const PUBLIC_PATHS = ["/login", "/callback"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

    // 1. 未ログインの場合
    if (!user) {
      if (!isPublic) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // ログイン済みでログインページ等にいる場合 -> ホームへ
    if (isPublic) {
      router.replace("/");
      return;
    }

    // 2. 利用規約同意チェック (agreedAt がない場合は /agreement へ)
    if (!userData?.agreedAt) {
      if (pathname !== "/agreement") {
        router.replace("/agreement");
      }
      return;
    }

    // 既に同意済みで /agreement にいる場合 -> ホームへ
    if (pathname === "/agreement") {
      router.replace("/");
      return;
    }

    // 3. 必須プロフィール入力チェック
    // 略称、役職、パート、入学年度、楽器が未入力なら /user/edit へ
    const isProfileComplete = Boolean(
      userData.abbreviation &&
      userData.roleId &&
      userData.sectionId &&
      userData.enrollmentYear &&
      userData.instrumentIds &&
      userData.instrumentIds.length > 0
    );

    if (!isProfileComplete && pathname !== "/user/edit") {
      router.replace("/user/edit?initial=1");
    }
  }, [user, userData, loading, pathname, router]);

  if (loading) {
    return null; // スピナーやスケルトンを出すか、透明
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (!user && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
