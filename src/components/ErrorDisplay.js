import { View, StyleSheet } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { parseError } from "@mentorias/auth";

/**
 * Componente para exibir erros de forma amigável
 * @param {Error|Object} error - Erro a ser exibido
 * @param {Function} onRetry - Função chamada quando usuário clica em "Tentar novamente"
 * @param {string} customMessage - Mensagem customizada (opcional)
 */
export default function ErrorDisplay({ error, onRetry, customMessage = null }) {
	const theme = useTheme();
	const parsedError = error ? parseError(error) : null;
	const message = customMessage || parsedError?.message || "Ocorreu um erro. Tente novamente.";

	return (
		<View style={styles.container}>
			<Text style={[styles.icon, { color: theme.colors.error }]}>⚠️</Text>
			<Text style={[styles.title, { color: theme.colors.onSurface }]}>Ops!</Text>
			<Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{message}</Text>
			{onRetry && (
				<Button
					mode="contained"
					onPress={onRetry}
					style={styles.button}
					buttonColor={theme.colors.primary}>
					Tentar Novamente
				</Button>
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
	icon: {
		fontSize: 64,
		marginBottom: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 8,
		textAlign: "center",
	},
	message: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	button: {
		marginTop: 8,
	},
});

