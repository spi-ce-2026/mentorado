import { ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Surface, Text, useTheme } from "react-native-paper";

import { getMentorshipStatusInfo } from "../utils/mentorshipRequest";

export default function AcompanhamentoMentoriaScreen({ route, navigation }) {
	const theme = useTheme();
	const { status, expertise = [] } = route.params ?? {};
	const info = getMentorshipStatusInfo(status);

	return (
		<ScrollView contentContainerStyle={styles.content}>
			<View style={styles.hero}>
				<View
					importantForAccessibility="no-hide-descendants"
					accessibilityElementsHidden
					style={[styles.illustration, { backgroundColor: theme.colors.primaryContainer }]}>
					<MaterialCommunityIcons name={info.icon} size={72} color={theme.colors.primary} />
				</View>

				<View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
					<Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer }}>
						{info.label}
					</Text>
				</View>

				<Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>
					{info.title}
				</Text>
				<Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
					{info.message}
				</Text>
			</View>

			{expertise.length > 0 ? (
				<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
					<Text variant="titleMedium" accessibilityRole="header" style={styles.cardTitle}>
						Áreas solicitadas
					</Text>
					<View style={styles.chips}>
						{expertise.map(name => (
							<View
								key={name}
								style={[styles.staticChip, { borderColor: theme.colors.outline }]}>
								<Text variant="labelLarge">{name}</Text>
							</View>
						))}
					</View>
				</Surface>
			) : null}

			<Button
				mode="contained"
				onPress={() => navigation.navigate("Inicio")}
				style={styles.button}>
				Voltar ao início
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		padding: 20,
		paddingBottom: 32,
		gap: 16,
	},
	hero: {
		alignItems: "center",
		gap: 12,
		paddingVertical: 16,
	},
	illustration: {
		width: 144,
		height: 144,
		borderRadius: 72,
		alignItems: "center",
		justifyContent: "center",
	},
	badge: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
	},
	title: {
		fontWeight: "700",
		textAlign: "center",
	},
	message: {
		textAlign: "center",
		paddingHorizontal: 8,
	},
	card: {
		padding: 20,
		borderRadius: 20,
		gap: 12,
	},
	cardTitle: {
		fontWeight: "700",
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	staticChip: {
		minHeight: 36,
		paddingHorizontal: 14,
		borderRadius: 18,
		borderWidth: 1,
		justifyContent: "center",
	},
	button: {
		borderRadius: 12,
		marginTop: 8,
	},
});
