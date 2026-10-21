import {
  mensajeVariablesFaltantes,
  variablesFaltantes,
} from "@/utils/environment";

describe("variablesFaltantes", () => {
  const requeridas = ["A", "B", "C"] as const;

  it("devuelve vacío cuando todas tienen valor", () => {
    expect(variablesFaltantes({ A: "1", B: "2", C: "3" }, requeridas)).toEqual(
      [],
    );
  });

  it("detecta variables ausentes, vacías o solo con espacios", () => {
    expect(variablesFaltantes({ A: "1", B: "", C: "  " }, requeridas)).toEqual([
      "B",
      "C",
    ]);
    expect(variablesFaltantes({ A: "1" }, requeridas)).toEqual(["B", "C"]);
  });

  it("ignora variables que no son requeridas", () => {
    expect(
      variablesFaltantes({ A: "1", B: "2", C: "3", D: undefined }, requeridas),
    ).toEqual([]);
  });
});

describe("mensajeVariablesFaltantes", () => {
  it("nombra cada variable faltante y da la solución para EAS", () => {
    const mensaje = mensajeVariablesFaltantes([
      "EXPO_PUBLIC_FIREBASE_API_KEY",
      "EXPO_PUBLIC_FIREBASE_APP_ID",
    ]);
    expect(mensaje).toContain("faltan 2 variable(s)");
    expect(mensaje).toContain("- EXPO_PUBLIC_FIREBASE_API_KEY");
    expect(mensaje).toContain("- EXPO_PUBLIC_FIREBASE_APP_ID");
    expect(mensaje).toContain("eas env:push");
  });
});
