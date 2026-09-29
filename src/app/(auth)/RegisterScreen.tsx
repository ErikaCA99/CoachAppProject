import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { BotonGoogle } from "@/components/auth/BotonGoogle";
import { BotonPrimario } from "@/components/ui/BotonPrimario";
import { CampoTexto } from "@/components/ui/CampoTexto";
import { SeparadorTexto } from "@/components/ui/SeparadorTexto";
import { AuthController } from "@/controllers/AuthController";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import {
  registroFormSchema,
  type RegistroFormInput,
} from "@/schemas/auth.schema";
import { useAuthStore } from "@/store/auth.store";

type Campo = keyof RegistroFormInput;

const ESTADO_INICIAL: RegistroFormInput = {
  nombre: "",
  apellidos: "",
  correo: "",
  contrasena: "",
  confirmarContrasena: "",
};

/**
 * Registro con correo. Tras crear la cuenta NO navega: el layout raíz detecta
 * la sesión nueva con perfil incompleto y abre `(onboarding)` automáticamente.
 */
export default function RegisterScreen() {
  const [form, setForm] = useState<RegistroFormInput>(ESTADO_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { signInWithGoogle } = useGoogleAuth();
  const { user, isLoading, error: errorGoogle } = useAuthStore();
  const ocupado = cargando || isLoading || !!user;

  const cambiar = (campo: Campo) => (valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleContinuar = async () => {
    setErrorGeneral(null);
    const resultado = registroFormSchema.safeParse(form);
    if (!resultado.success) {
      const nuevos: Partial<Record<Campo, string>> = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as Campo;
        nuevos[campo] ??= issue.message;
      }
      setErrores(nuevos);
      return;
    }

    setCargando(true);
    try {
      await AuthController.registrar({
        nombre: resultado.data.nombre,
        apellidos: resultado.data.apellidos,
        correo: resultado.data.correo,
        contrasena: resultado.data.contrasena,
      });
      // El store de sesión se sincroniza solo vía useAuthListener.
    } catch (err) {
      console.error("Error al registrar usuario: ", err);
      setErrorGeneral(AuthController.mensajeDeError(err));
      setCargando(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1 bg-primary-light/15"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader modo="registro" />

          <CampoTexto
            etiqueta="Nombre"
            placeholder="Tu nombre"
            value={form.nombre}
            onChangeText={cambiar("nombre")}
            autoCapitalize="words"
            error={errores.nombre}
            editable={!ocupado}
          />
          <CampoTexto
            etiqueta="Apellido"
            placeholder="Tu apellido"
            value={form.apellidos}
            onChangeText={cambiar("apellidos")}
            autoCapitalize="words"
            error={errores.apellidos}
            editable={!ocupado}
          />
          <CampoTexto
            etiqueta="Correo electrónico"
            placeholder="correo@ejemplo.com"
            value={form.correo}
            onChangeText={cambiar("correo")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errores.correo}
            editable={!ocupado}
          />
          <CampoTexto
            etiqueta="Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={form.contrasena}
            onChangeText={cambiar("contrasena")}
            esContrasena
            autoComplete="new-password"
            error={errores.contrasena}
            editable={!ocupado}
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            value={form.confirmarContrasena}
            onChangeText={cambiar("confirmarContrasena")}
            esContrasena
            error={errores.confirmarContrasena}
            editable={!ocupado}
          />

          {errorGeneral || errorGoogle ? (
            <Text className="mb-3 text-center text-sm text-error">
              {errorGeneral ?? errorGoogle}
            </Text>
          ) : null}

          <BotonPrimario
            titulo="Continuar"
            onPress={handleContinuar}
            cargando={ocupado}
          />

          <SeparadorTexto texto="o continúa con" />

          <BotonGoogle
            onPress={() => void signInWithGoogle()}
            deshabilitado={ocupado}
          />

          <Text className="mt-5 text-center text-xs text-text-muted">
            Al registrarte aceptas nuestros{" "}
            <Text className="font-semibold text-primary">
              Términos de Servicio
            </Text>{" "}
            y{" "}
            <Text className="font-semibold text-primary">
              Política de Privacidad
            </Text>
            .
          </Text>

          <View className="h-6" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
