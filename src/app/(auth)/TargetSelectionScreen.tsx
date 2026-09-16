import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    doc,
    getFirestore,
    setDoc
} from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import app from "../../services/firebase/firebase";

const SeleccionDeObjetivo = () => {
  const db = getFirestore(app);
  const { userId, nombre, apellidos, correo, contraseña, gender } =
    useLocalSearchParams();
  console.log("UserId en SeleccionDeObjetivo:", userId, gender);
  const router = useRouter();

  const [selectedObjective, setSelectedObjective] = useState(null);

  const objectives = [
    { id: 1, name: "Perder grasa y ganar músculo", icon: "fitness-outline" },
    { id: 2, name: "Perder grasa", icon: "walk-outline" },
    { id: 3, name: "Ganar músculo", icon: "barbell-outline" },
    { id: 4, name: "Aumentar fuerza", icon: "flash-outline" },
    { id: 5, name: "Entrenamiento combinado", icon: "bicycle-outline" },
    { id: 6, name: "Salud", icon: "heart-outline" },
  ];

  const handleNext = async () => {
    if (!selectedObjective) {
      Alert.alert(
        "Objetivo no seleccionado",
        "Por favor selecciona un objetivo antes de continuar.",
      );
      return;
    }

    try {
      // Guardar el objetivo en Firestore en la colección "users"
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          objetivo: selectedObjective,
        },
        { merge: true },
      );

      //Alert.alert('Éxito', 'Objetivo guardado con éxito.');
      router.push({
        pathname: "/(auth)/NivelDeExperiencia",
        params: {
          userId,
          nombre,
          apellidos,
          correo,
          contraseña,
          gender,
          objetivo: selectedObjective,
        },
      });
    } catch (error) {
      console.error("Error al guardar el objetivo: ", error);
      Alert.alert(
        "Error",
        "Hubo un problema al guardar el objetivo. Intenta nuevamente.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cuál es tu objetivo?</Text>
      <View style={styles.optionsContainer}>
        {objectives.map((objective) => (
          <TouchableOpacity
            key={objective.id}
            style={[
              styles.button,
              selectedObjective === objective.name && styles.selected,
            ]}
            onPress={() => setSelectedObjective(objective.name)}
          >
            <Ionicons
              name={objective.icon}
              size={24}
              color={selectedObjective === objective.name ? "#fff" : "#0074D9"}
              style={styles.icon}
            />
            <Text
              style={[
                styles.buttonText,
                selectedObjective === objective.name && styles.selectedText,
              ]}
            >
              {objective.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[
          styles.nextButton,
          !selectedObjective && styles.nextButtonDisabled,
        ]}
        onPress={handleNext}
        disabled={!selectedObjective}
      >
        <Text style={styles.nextButtonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
};
export default SeleccionDeObjetivo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAFF", // Fondo claro deportivo
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#003366", // Azul corporativo
    textAlign: "center",
    marginBottom: 30,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F0FA", // Azul pastel claro
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#B0C4DE", // Azul sutil para bordes
    shadowColor: "#00509e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selected: {
    backgroundColor: "#00509e", // Azul vibrante para el seleccionado
    borderColor: "#003366",
  },
  buttonText: {
    fontSize: 18,
    color: "#003366",
    marginLeft: 10,
    fontWeight: "bold",
  },
  selectedText: {
    color: "#FFFFFF", // Blanco para texto seleccionado
  },
  icon: {
    marginLeft: 5,
  },
  nextButton: {
    backgroundColor: "#003366", // Azul vibrante
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#003366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 20,
  },
  nextButtonDisabled: {
    backgroundColor: "#B0C4DE", // Gris azulado para botón deshabilitado
  },
  nextButtonText: {
    fontSize: 18,
    color: "#FFFFFF", // Blanco para texto del botón
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
