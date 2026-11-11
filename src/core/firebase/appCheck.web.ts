import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "@firebase/app-check";
import type { FirebaseApp } from "@firebase/app";

export function configurarAppCheck(app: FirebaseApp): void {
  const siteKey = process.env.EXPO_PUBLIC_APP_CHECK_SITE_KEY;
  // No browser APIs during Expo's static export. No debug bypass in production.
  if (typeof window === "undefined" || !siteKey) return;
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
