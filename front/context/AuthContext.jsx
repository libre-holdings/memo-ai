// context/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  linkWithCredential,
  onIdTokenChanged,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const AuthContext = createContext(null);

// 想定する claim の形： { plan: "free" | "pro" | "extra" }
function normalizePlanFromClaims(claims) {
  const p = claims?.plan;
  if (p === "pro" || p === "extra" || p === "free") return p;
  return "free"; // claim無ければfree扱い
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ プランをContextに保持
  const [plan, setPlan] = useState("free");

  // ✅ Context 更新を確実に伝播させるための tick
  const [authTick, setAuthTick] = useState(0);

  const attemptedAnonRef = useRef(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "801835173003-tb5r6s5qaaaifk35eej69650u48a8bjf.apps.googleusercontent.com",
    });
  }, []);

  // ✅ claims を読み取って plan を更新する
  const syncClaims = useCallback(async (u, forceRefresh) => {
    if (!u) {
      setPlan("free");
      return;
    }
    try {
      // forceRefresh=true の時は token を更新してから claims を読む
      if (forceRefresh) {
        await u.getIdToken(true);
      }
      const tokenResult = await u.getIdTokenResult();
      const nextPlan = normalizePlanFromClaims(tokenResult?.claims);
      setPlan(nextPlan);

      console.log("[Auth] claims synced:", {
        uid: u.uid,
        plan: nextPlan,
        // claims全部出すと長いので必要なら追加
      });
    } catch (e) {
      console.log("[Auth] syncClaims error:", e?.message || e);
      setPlan("free");
    }
  }, []);

  // ✅ どこからでも呼べる「claims再同期」
  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return "free";
    await syncClaims(u, true);
    // 最新 state の plan を返したいが setState は非同期なので tokenResult から返す
    const tokenResult = await u.getIdTokenResult();
    return normalizePlanFromClaims(tokenResult?.claims);
  }, [syncClaims]);

  // ✅ link(provider追加)なども拾いやすい
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setLoading(false);
      setAuthTick((t) => t + 1);

      // onIdTokenChanged は token が更新された時にも来るので、ここで claims を読む
      await syncClaims(firebaseUser, false);
    });

    return unsubscribe;
  }, [syncClaims]);

  const linkGoogle = useCallback(async () => {
    console.log("[Auth] linkGoogle start");

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signIn();

    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens?.idToken;
    if (!idToken) {
      throw new Error("No idToken from Google (getTokens returned empty)");
    }

    const credential = GoogleAuthProvider.credential(idToken);

    const current = auth.currentUser;
    if (!current) {
      throw new Error("No current user (must be signed in before linking)");
    }

    const result = await linkWithCredential(current, credential);

    // 連携結果を確実に反映
    await result.user.reload();
    await result.user.getIdToken(true);

    // ✅ providerData の displayName/photoURL を Firebase user.profile に書き込む
    const googleProvider = result.user.providerData?.find(
      (p) => p.providerId === "google.com"
    );

    const nextDisplayName =
      result.user.displayName || googleProvider?.displayName || null;
    const nextPhotoURL =
      result.user.photoURL || googleProvider?.photoURL || null;

    if (nextDisplayName && result.user.displayName !== nextDisplayName) {
      console.log("[Auth] updateProfile displayName:", nextDisplayName);
      await updateProfile(result.user, {
        displayName: nextDisplayName,
        photoURL: nextPhotoURL,
      });
      await result.user.reload();
      await result.user.getIdToken(true);
    } else if (nextPhotoURL && result.user.photoURL !== nextPhotoURL) {
      console.log("[Auth] updateProfile photoURL");
      await updateProfile(result.user, { photoURL: nextPhotoURL });
      await result.user.reload();
      await result.user.getIdToken(true);
    }

    // ✅ Consumer に確実に更新を伝える
    setUser(result.user);
    setAuthTick((t) => t + 1);

    // ✅ plan は claims から読む（linkで変わらなくてもOK）
    await syncClaims(result.user, false);

    console.log("[Auth] linkGoogle done:", {
      uid: result.user.uid,
      isAnonymous: result.user.isAnonymous,
      displayName: result.user.displayName,
      email: result.user.email,
    });

    return result.user;
  }, [syncClaims]);

  useEffect(() => {
    if (loading) return;
    if (user) return;

    if (attemptedAnonRef.current) return;
    attemptedAnonRef.current = true;

    signInAnonymously(auth).catch((e) => {
      console.log("anonymous sign-in error:", e.code, e.message);
    });
  }, [loading, user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      plan,          // ✅ 追加
      refreshClaims, // ✅ 追加（課金後・復元後に呼ぶ）
      linkGoogle,
      authTick,
    }),
    [user, loading, plan, refreshClaims, linkGoogle, authTick]
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
