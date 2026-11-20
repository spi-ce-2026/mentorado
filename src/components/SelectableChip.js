import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";

/**
 * Opção selecionável com área de toque de 44 pt e estado acessível.
 * @param {string} label - texto exibido e nome acessível
 * @param {boolean} selected - se a opção está marcada
 * @param {Function} onPress - alterna a seleção
 * @param {"checkbox"|"radio"} role - papel acessível (múltipla ou única escolha)
 */
export default function SelectableChip({ label, selected, onPress, role = "checkbox", disabled = false }) {
	const { colors } = useTheme();

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole={role}
			accessibilityLabel={label}
			accessibilityState={{ checked: selected, disabled }}
			style={({ pressed }) => [
				styles.chip,
				{
					borderColor: selected ? colors.primary : colors.outline,
					backgroundColor: selected ? colors.primaryContainer : colors.surface,
					opacity: pressed ? 0.85 : 1,
				},
			]}>
			{selected ? <MaterialCommunityIcons name="check" size={18} color={colors.primary} /> : null}
			<Text
				variant="labelLarge"
				style={{ color: selected ? colors.onPrimaryContainer : colors.onSurface }}>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	chip: {
		minHeight: 44,
		minWidth: 44,
		paddingHorizontal: 14,
		borderRadius: 22,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
});
