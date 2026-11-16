import { getApp } from "@react-native-firebase/app";
import {
  getToken,
  initializeAppCheck as initializeNative,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import { CustomProvider, initializeAppCheck } from "@firebase/app-check";
import type { FirebaseApp } from "@firebase/app";
import { Buffer } from "buffer";
import { z } from "zod";

/** Native attestation bridges into the JS SDK used by Auth, Firestore and Functions. */
export function configurarAppCheck(app: FirebaseApp): void {
  const proveedor = new ReactNativeFirebaseAppCheckProvider();
  proveedor.configure({
    android: { provider: __DEV__ ? "debug" : "playIntegrity" },
    apple: { provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback" },
  });
  const nativo = initializeNative(getApp(), {
    provider: proveedor,
    isTokenAutoRefreshEnabled: true,
  });
  initializeAppCheck(app, {
    isTokenAutoRefreshEnabled: true,
    provider: new CustomProvider({
      getToken: async () => {
        const resultado = await getToken(await nativo);
        const claims = z
          .object({ exp: z.number().positive() })
          .parse(
            JSON.parse(
              Buffer.from(resultado.token.split(".")[1], "base64").toString(
                "utf8",
              ),
            ),
          );
        return { token: resultado.token, expireTimeMillis: claims.exp * 1000 };
      },
    }),
  });
}
