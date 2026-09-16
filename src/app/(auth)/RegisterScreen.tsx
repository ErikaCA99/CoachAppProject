import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { auth, db } from "../../services/firebase/firebase";
import { useAuthStore } from "../../store/auth.store";

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const initialState = {
    nombre: "",
    apellidos: "",
    genero: "",
    correo: "",
    contraseña: "",
    confirmarContraseña: "",
  };

  const [state, setState] = useState(initialState);

  const handleChangeText = (value: string, name: string) => {
    setState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleContinue = async () => {
    if (state.contraseña !== state.confirmarContraseña) {
      Alert.alert("Alerta", "Las contraseñas no coinciden");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        state.correo,
        state.contraseña,
      );

      const userId = userCredential.user.uid;

      // Crear documento inicial en Firestore
      await setDoc(doc(db, "users", userId), {
        nombre: state.nombre,
        apellidos: state.apellidos,
        genero: state.genero,
        correo: state.correo,
      });

      // Guardar usuario en el store de Zustand (validado con Zod)
      const firebaseUser = userCredential.user;
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      });

      Alert.alert("Éxito", "Registro exitoso");
      router.replace("/(app)");
    } catch (error) {
      console.error("Error al registrar usuario: ", error);
      Alert.alert("Error", "Hubo un problema al registrar el usuario");
    }
  };

  return (
    <View className="flex-1 justify-center bg-background p-5">
      <Text className="mb-5 text-center text-2xl font-bold text-foreground">
        Registro de Usuario
      </Text>
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Nombre"
        placeholderTextColor="#4b5563"
        onChangeText={(value) => handleChangeText(value, "nombre")}
        value={state.nombre}
      />
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Apellidos"
        placeholderTextColor="#4b5563"
        onChangeText={(value) => handleChangeText(value, "apellidos")}
        value={state.apellidos}
      />
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Género"
        placeholderTextColor="#4b5563"
        onChangeText={(value) => handleChangeText(value, "genero")}
        value={state.genero}
      />
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Correo Electrónico"
        placeholderTextColor="#4b5563"
        keyboardType="email-address"
        onChangeText={(value) => handleChangeText(value, "correo")}
        value={state.correo}
      />
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Contraseña"
        placeholderTextColor="#4b5563"
        secureTextEntry={true}
        onChangeText={(value) => handleChangeText(value, "contraseña")}
        value={state.contraseña}
      />
      <TextInput
        className="mb-2.5 rounded-lg border border-border bg-primary-light/20 p-4 text-base text-foreground"
        placeholder="Confirmar Contraseña"
        placeholderTextColor="#4b5563"
        secureTextEntry={true}
        onChangeText={(value) => handleChangeText(value, "confirmarContraseña")}
        value={state.confirmarContraseña}
      />
      <TouchableOpacity
        className="mt-2.5 items-center justify-center rounded-lg bg-primary p-4 shadow-sm"
        onPress={handleContinue}
      >
        <Text className="text-base font-bold text-background">Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
}
