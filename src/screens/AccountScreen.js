import { StyleSheet, View } from "react-native";
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import { useAuth } from "@mentorias/auth";

export default function AccountScreen() {
	const theme = useTheme();
	const { user, logout } = useAuth();
	const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

	return (
		<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
			{user?.picture ? (
				<Avatar.Image size={88} source={{ uri: user.picture }} />
			) : (
				<Avatar.Text size={88} label={initial} />
			)}
			<Text variant="titleLarge" style={styles.name}>
				{user?.name}
			</Text>
			<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
				{user?.email}
			</Text>
			<Text variant="bodySmall" style={[styles.roles, { color: theme.colors.onSurfaceVariant }]}>
				Papéis: {user?.role}
			</Text>
			<Button mode="outlined" icon="logout" onPress={logout} style={styles.button}>
				Sair
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		padding: 24,
		paddingTop: 48,
	},
	name: {
		marginTop: 16,
		fontWeight: "bold",
	},
	roles: {
		marginTop: 8,
	},
	button: {
		marginTop: 32,
	},
});
