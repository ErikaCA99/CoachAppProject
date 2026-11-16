/**
 * Type shim for @react-native-firebase/app@27.1.0.
 * The installed package.json points to dist/typescript/lib/index.d.ts, but
 * that file is absent from the published package contents in this install.
 * Keep this surface narrow; remove it when the dependency ships its types.
 */
declare module "@react-native-firebase/app" {
  export interface FirebaseApp {
    readonly name: string;
    readonly options: Readonly<Record<string, unknown>>;
    readonly automaticDataCollectionEnabled: boolean;
  }

  export function getApp(name?: string): FirebaseApp;
}
