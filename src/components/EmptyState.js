import { View, StyleSheet } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";

/**
 * Componente para exibir estado vazio
 * @param {string} title - Título a ser exibido
 * @param {string} message - Mensagem descritiva
 * @param {string} icon - Emoji ou ícone (opcional)
 * @param {Function} onAction - Função chamada quando usuário clica no botão de ação
 * @param {string} actionLabel - Texto do botão de ação (opcional)
 */
export default function EmptyState({
	title,
	message,
	icon = "📭",
	onAction = null,
	actionLabel = null,
}) {
	const theme = useTheme();

	return (
		<View style={styles.container}>
			<Text style={styles.icon}>{icon}</Text>
			<Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
			<Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{message}</Text>
			{onAction && actionLabel && (
				<Button
					mode="contained"
					onPress={onAction}
					style={styles.button}
					buttonColor={theme.colors.primary}>
					{actionLabel}
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
		fontSize: 20,
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

