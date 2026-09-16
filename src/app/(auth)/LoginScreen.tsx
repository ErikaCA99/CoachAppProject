import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { auth } from "../../services/firebase/firebase";
import { useAuthStore } from "../../store/auth.store";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const { signInWithGoogle } = useGoogleAuth();
  const { user, isLoading, error, setUser, setLoading, setError } =
    useAuthStore();

  // Redirigir automáticamente cuando el store tenga un usuario
  useEffect(() => {
    if (user) {
      router.replace("/(app)");
    }
  }, [user, router]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const firebaseUser = userCredential.user;

      // Validar con Zod y guardar en el store
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Credenciales incorrectas");
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <View className="flex-1 justify-center bg-background px-5">
      {/* Input de Correo */}
      <TextInput
        className="mb-2.5 rounded-2xl border border-border bg-primary-light/20 px-3.5 py-3.5 text-base text-foreground"
        placeholder="Correo electrónico"
        placeholderTextColor="#4b5563"
        value={email}
        onChangeText={(text) => setEmail(text)}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />

      {/* Input de Contraseña */}
      <TextInput
        className="mb-2.5 rounded-2xl border border-border bg-primary-light/20 px-3.5 py-3.5 text-base text-foreground"
        placeholder="Password"
        placeholderTextColor="#4b5563"
        value={password}
        onChangeText={(text) => setPassword(text)}
        secureTextEntry={true}
        editable={!isLoading}
      />

      {/* Mensaje de Error */}
      {error && (
        <Text className="mb-2.5 text-center text-sm text-error">{error}</Text>
      )}

      {/* Botón de Sign In */}
      <TouchableOpacity
        className="my-5 items-center rounded-2xl bg-primary p-4 shadow-sm"
        onPress={handleLogin}
        disabled={isLoading}
        style={isLoading ? { opacity: 0.6 } : undefined}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-lg font-bold tracking-wide text-background">
            Iniciar sesión
          </Text>
        )}
      </TouchableOpacity>

      {/* Separador */}
      <View className="mb-5 flex-row items-center">
        <View className="h-px flex-1 bg-border" />
        <Text className="mx-3 text-xs text-text-secondary">o</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      {/* Botón de Google */}
      <TouchableOpacity
        className="mb-5 flex-row items-center justify-center rounded-2xl border border-border bg-background p-4 shadow-sm"
        onPress={handleGoogleLogin}
        disabled={isLoading}
        style={isLoading ? { opacity: 0.6 } : undefined}
      >
        <Text className="text-base font-bold text-foreground">
          Continuar con Google
        </Text>
      </TouchableOpacity>

      {/* Opciones Adicionales */}
      <View className="mt-5 flex-row justify-between">
        <Text className="text-sm text-text-secondary">
          Olvidaste tu contraseña?
        </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/RegisterScreen")}>
          <Text className="text-sm font-bold text-primary">Registrarse</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
