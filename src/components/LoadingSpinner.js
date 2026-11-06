import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Text, useTheme } from "react-native-paper";

/**
 * Componente de loading reutilizável
 * @param {string} message - Mensagem opcional a ser exibida
 * @param {string} size - Tamanho do spinner ('small' ou 'large')
 * @param {string} color - Cor do spinner (opcional, usa tema por padrão)
 */
export default function LoadingSpinner({ message, size = "large", color = null }) {
	const theme = useTheme();
	const spinnerColor = color || theme.colors.primary;

	return (
		<View style={styles.container}>
			<ActivityIndicator size={size} color={spinnerColor} />
			{message && (
				<Text style={[styles.message, { color: theme.colors.onSurface }]}>{message}</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	message: {
		marginTop: 16,
		fontSize: 16,
		textAlign: "center",
	},
});

