import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useAuth } from "@mentorias/auth";

import { APP_NAME } from "../theme";

export default function LoginScreen() {
	const theme = useTheme();
	const { login, loading } = useAuth();

	return (
		<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
			<Text variant="headlineMedium" style={styles.title}>
				UberHub Mentorias
			</Text>
			<Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
				{APP_NAME}
			</Text>
			<Button mode="contained" onPress={login} loading={loading} disabled={loading}>
				Entrar com Google
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	title: {
		fontWeight: "bold",
		textAlign: "center",
	},
	subtitle: {
		marginTop: 4,
		marginBottom: 32,
		textAlign: "center",
	},
});
