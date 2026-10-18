import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
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
import { useAuthStore } from "@/store/auth.store";

/**
 * Inicio de sesión. No navega manualmente: cuando Firebase confirma la
 * sesión, `useAuthListener` + `usePerfilListener` actualizan el store y el
 * `Stack.Protected` del layout raíz lleva al usuario a (onboarding) o (app).
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithGoogle } = useGoogleAuth();
  const { user, isLoading, error, setLoading, setError } = useAuthStore();

  // Tras autenticarse, el perfil tarda un instante en llegar de Firestore;
  // mientras tanto seguimos aquí mostrando el botón en estado de carga.
  const esperandoPerfil = !!user;
  const ocupado = isLoading || esperandoPerfil;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await AuthController.iniciarSesion(email, password);
    } catch (err) {
      setError(AuthController.mensajeDeError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Recuperar contraseña",
        "Escribe tu correo electrónico y vuelve a tocar el enlace.",
      );
      return;
    }
    try {
      await AuthController.recuperarContrasena(email);
      Alert.alert(
        "Revisa tu correo",
        "Te enviamos un enlace para restablecer tu contraseña.",
      );
    } catch (err) {
      Alert.alert("Error", AuthController.mensajeDeError(err));
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
          <AuthHeader modo="login" />

          <CampoTexto
            etiqueta="Correo electrónico"
            placeholder="correo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!ocupado}
          />

          <CampoTexto
            etiqueta="Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            esContrasena
            autoComplete="password"
            editable={!ocupado}
          />

          <TouchableOpacity
            className="-mt-2 mb-5 self-end"
            onPress={handleRecuperar}
            disabled={ocupado}
          >
            <Text className="text-xs font-semibold text-primary">
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {error ? (
            <Text className="mb-3 text-center text-sm text-error">{error}</Text>
          ) : null}

          <BotonPrimario
            titulo="Iniciar Sesión"
            onPress={handleLogin}
            cargando={ocupado}
          />

          <SeparadorTexto texto="o continúa con" />

          <BotonGoogle
            onPress={() => void signInWithGoogle()}
            deshabilitado={ocupado}
          />

          <View className="h-6" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
