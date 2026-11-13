import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth, parseError } from "@mentorias/auth";
import { Button, Chip, Divider, Surface, Text, TextInput, useTheme } from "react-native-paper";

import { voucherService } from "../services/api";

const redeemErrorMessages = {
	invalid_or_expired_voucher: "Este código é inválido, expirou ou já foi resgatado.",
	voucher_not_available: "Este voucher não está disponível para resgate.",
};

function getRedeemErrorMessage(error) {
	const errorCode = error?.response?.data?.error;
	return redeemErrorMessages[errorCode] || parseError(error).message;
}

function getVoucherStatus(status) {
	const labels = {
		redeemed: "Resgatado",
		used: "Utilizado",
		expired: "Expirado",
		active: "Ativo",
	};

	return labels[status] || status || "Status não informado";
}

function formatDate(value) {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("pt-BR");
}

export default function HomeScreen() {
	const theme = useTheme();
	const { user } = useAuth();
	const [code, setCode] = useState("");
	const [vouchers, setVouchers] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [redeeming, setRedeeming] = useState(false);
	const [loadError, setLoadError] = useState(null);
	const [redeemError, setRedeemError] = useState("");
	const [notice, setNotice] = useState("");

	const loadVouchers = useCallback(async ({ refresh = false } = {}) => {
		if (refresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}
		setLoadError(null);

		try {
			const response = await voucherService.listMine();
			const list = Array.isArray(response.data) ? response.data : response.data?.vouchers;
			if (!Array.isArray(list)) {
				throw new Error("A resposta do histórico de vouchers está em um formato inválido.");
			}

			setVouchers(list);
			return true;
		} catch (error) {
			setLoadError(error);
			return false;
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void loadVouchers();
	}, [loadVouchers]);

	const handleRedeem = async () => {
		const normalizedCode = code.trim();
		if (!normalizedCode || redeeming) {
			return;
		}

		setRedeeming(true);
		setRedeemError("");
		setNotice("");

		try {
			await voucherService.redeem(normalizedCode);
			setCode("");
			const refreshed = await loadVouchers({ refresh: true });
			setNotice(
				refreshed
					? "Voucher resgatado. Você recebeu 1 crédito."
					: "Voucher resgatado, mas não foi possível atualizar o saldo. Tente atualizar a tela."
			);
		} catch (error) {
			setRedeemError(getRedeemErrorMessage(error));
		} finally {
			setRedeeming(false);
		}
	};

	const creditBalance = vouchers?.filter(voucher => voucher.status === "redeemed").length;
	const firstName = user?.name?.split(" ")[0] || "";

	return (
		<ScrollView
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => loadVouchers({ refresh: true })}
					tintColor={theme.colors.primary}
				/>
			}>
			<View style={styles.heading}>
				<Text variant="headlineSmall" style={styles.title}>
					Olá, {firstName}
				</Text>
				<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
					Resgate seus vouchers e acompanhe seus créditos.
				</Text>
			</View>

			<Surface
				elevation={1}
				style={[styles.balanceCard, { backgroundColor: "#e8f5e9" }]}>
				<View style={styles.balanceHeading}>
					<MaterialCommunityIcons
						name="ticket-confirmation-outline"
						size={26}
						color={theme.colors.primary}
					/>
					<Text variant="titleMedium" style={{ color: theme.colors.primary }}>
						Seus créditos
					</Text>
				</View>
				<View style={styles.balanceValue}>
					<Text variant="displayMedium" style={[styles.balanceNumber, { color: theme.colors.primary }]}>
						{loading && vouchers === null ? "…" : creditBalance ?? "—"}
					</Text>
					<Text variant="titleMedium" style={{ color: theme.colors.primary }}>
						{creditBalance === 1 ? "crédito disponível" : "créditos disponíveis"}
					</Text>
				</View>
				{loadError && (
					<View style={styles.loadError}>
						<Text variant="bodySmall" style={{ color: theme.colors.error }}>
							{parseError(loadError).message}
						</Text>
						<Button compact onPress={() => loadVouchers({ refresh: true })}>
							Tentar novamente
						</Button>
					</View>
				)}
			</Surface>

			<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
				<Text variant="titleLarge" style={styles.cardTitle}>
					Resgatar voucher
				</Text>
				<Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
					Informe o código para adicionar 1 crédito à sua conta.
				</Text>
				<TextInput
					mode="outlined"
					label="Código do voucher"
					placeholder="Digite seu código"
					value={code}
					onChangeText={value => {
						setCode(value);
						setRedeemError("");
						setNotice("");
					}}
					onSubmitEditing={handleRedeem}
					autoCapitalize="characters"
					autoCorrect={false}
					returnKeyType="done"
					accessibilityLabel="Código do voucher"
					style={styles.input}
				/>
				{redeemError ? (
					<Text variant="bodySmall" style={[styles.formMessage, { color: theme.colors.error }]}>
						{redeemError}
					</Text>
				) : null}
				{notice ? (
					<Text variant="bodySmall" style={[styles.formMessage, { color: theme.colors.primary }]}>
						{notice}
					</Text>
				) : null}
				<Button
					mode="contained"
					onPress={handleRedeem}
					loading={redeeming}
					disabled={!code.trim() || redeeming}
					style={styles.actionButton}>
					Resgatar voucher
				</Button>
			</Surface>

			<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
				<View style={styles.historyHeading}>
					<Text variant="titleLarge" style={styles.cardTitle}>
						Histórico de vouchers
					</Text>
					<MaterialCommunityIcons name="history" size={24} color={theme.colors.primary} />
				</View>
				{loading && vouchers === null ? (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						Carregando histórico...
					</Text>
				) : vouchers?.length ? (
					vouchers.map((voucher, index) => {
						const key = voucher.id || voucher.code || `voucher-${index}`;
						const date = formatDate(voucher.redeemedAt || voucher.updatedAt || voucher.createdAt);

						return (
							<View key={key}>
								<View style={styles.historyRow}>
									<View style={styles.historyDetails}>
										<Text variant="titleSmall" numberOfLines={1}>
											{voucher.code || "Voucher"}
										</Text>
										<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
											{date || "Data não informada"}
										</Text>
									</View>
									<Chip compact>{getVoucherStatus(voucher.status)}</Chip>
								</View>
								{index < vouchers.length - 1 ? <Divider /> : null}
							</View>
						);
					})
				) : loadError ? (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						Não foi possível carregar o histórico.
					</Text>
				) : (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						Nenhum voucher resgatado. Insira um código para adicionar seu primeiro crédito.
					</Text>
				)}
			</Surface>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		padding: 20,
		paddingBottom: 32,
		gap: 16,
	},
	heading: {
		gap: 4,
	},
	title: {
		fontWeight: "700",
	},
	balanceCard: {
		padding: 20,
		borderRadius: 20,
	},
	balanceHeading: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	balanceValue: {
		marginTop: 16,
		flexDirection: "row",
		alignItems: "baseline",
		gap: 10,
	},
	balanceNumber: {
		fontWeight: "700",
	},
	loadError: {
		marginTop: 8,
		gap: 4,
	},
	card: {
		padding: 20,
		borderRadius: 20,
	},
	cardTitle: {
		fontWeight: "700",
	},
	description: {
		marginTop: 6,
		marginBottom: 16,
	},
	input: {
		backgroundColor: "transparent",
	},
	formMessage: {
		marginTop: 8,
	},
	actionButton: {
		marginTop: 16,
		borderRadius: 12,
	},
	historyHeading: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	historyRow: {
		minHeight: 60,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingVertical: 10,
	},
	historyDetails: {
		flex: 1,
		gap: 4,
	},
});
