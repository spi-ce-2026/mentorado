import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { parseError } from "@mentorias/auth";
import { Button, Chip, Divider, Surface, Text, useTheme } from "react-native-paper";

import { mentorProfileService } from "../services/mentorProfileService";
import { mentorshipService } from "../services/mentorshipService";
import {
	formatMentorshipStatusLabel,
	getMentorshipStatusInfo,
	isSafeExternalUrl,
	normalizeMentorProfile,
	normalizeMentorships,
} from "../utils/mentorshipRequest";

export default function AcompanhamentoMentoriaScreen({ route, navigation }) {
	const theme = useTheme();
	const { status, expertise = [] } = route.params ?? {};
	const info = getMentorshipStatusInfo(status);

	const [mentorships, setMentorships] = useState([]);
	const [loadingList, setLoadingList] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [listError, setListError] = useState(null);

	const [expandedKey, setExpandedKey] = useState(null);
	const [profilesByMentorId, setProfilesByMentorId] = useState({});
	const [loadingMentorId, setLoadingMentorId] = useState(null);
	const [profileErrorsByMentorId, setProfileErrorsByMentorId] = useState({});
	const [linkError, setLinkError] = useState(null);

	const loadMentorships = useCallback(async ({ refresh = false } = {}) => {
		if (refresh) {
			setRefreshing(true);
		} else {
			setLoadingList(true);
		}
		setListError(null);

		try {
			const response = await mentorshipService.listMine();
			setMentorships(normalizeMentorships(response.data));
		} catch (error) {
			setListError(error);
		} finally {
			setLoadingList(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void loadMentorships();
	}, [loadMentorships]);

	const fetchMentorProfile = useCallback(
		async (mentorId, { force = false } = {}) => {
			if (!mentorId) {
				return;
			}
			if (!force && profilesByMentorId[mentorId]) {
				return;
			}

			setLoadingMentorId(mentorId);
			setProfileErrorsByMentorId(prev => ({ ...prev, [mentorId]: null }));

			try {
				const response = await mentorProfileService.getByMentorId(mentorId);
				const normalized = normalizeMentorProfile(response.data);
				setProfilesByMentorId(prev => ({ ...prev, [mentorId]: normalized }));
			} catch (error) {
				setProfileErrorsByMentorId(prev => ({ ...prev, [mentorId]: error }));
			} finally {
				setLoadingMentorId(current => (current === mentorId ? null : current));
			}
		},
		[profilesByMentorId]
	);

	const handleToggleMentorship = useCallback(
		(item, rowKey) => {
			setLinkError(null);

			if (!item.mentorId) {
				return;
			}

			if (expandedKey === rowKey) {
				setExpandedKey(null);
				return;
			}

			setExpandedKey(rowKey);
			void fetchMentorProfile(item.mentorId);
		},
		[expandedKey, fetchMentorProfile]
	);

	const handleOpenSchedulingLink = useCallback(async url => {
		setLinkError(null);

		if (!isSafeExternalUrl(url)) {
			setLinkError("Link de agendamento indisponível ou inválido.");
			return;
		}

		try {
			await Linking.openURL(url.trim());
		} catch {
			setLinkError("Não foi possível abrir o link de agendamento.");
		}
	}, []);

	return (
		<ScrollView
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => loadMentorships({ refresh: true })}
					tintColor={theme.colors.primary}
				/>
			}>
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

			<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
				<View style={styles.sectionHeader}>
					<Text variant="titleMedium" accessibilityRole="header" style={styles.cardTitle}>
						Minhas mentorias
					</Text>
					<Button
						compact
						onPress={() => loadMentorships({ refresh: true })}
						disabled={loadingList || refreshing}>
						Atualizar
					</Button>
				</View>

				{loadingList && mentorships.length === 0 ? (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						Carregando mentorias...
					</Text>
				) : listError ? (
					<View style={styles.stateBox}>
						<Text variant="bodyMedium" style={{ color: theme.colors.error }}>
							{parseError(listError).message}
						</Text>
						<Button mode="outlined" onPress={() => loadMentorships({ refresh: true })}>
							Tentar novamente
						</Button>
					</View>
				) : mentorships.length === 0 ? (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						Você ainda não possui mentorias registradas.
					</Text>
				) : (
					mentorships.map((item, index) => {
						const key = item.id || `mentorship-${index}`;
						const areas = item.preferences?.expertise ?? [];
						const hasMentor = Boolean(item.mentorId);
						const isExpanded = hasMentor && expandedKey === key;
						const profile = hasMentor ? profilesByMentorId[item.mentorId] : null;
						const isLoadingProfile = hasMentor && loadingMentorId === item.mentorId;
						const profileError = hasMentor ? profileErrorsByMentorId[item.mentorId] : null;

						return (
							<View key={key}>
								<Pressable
									disabled={!hasMentor}
									onPress={() => handleToggleMentorship(item, key)}
									accessibilityRole={hasMentor ? "button" : undefined}
									style={styles.mentorshipRow}>
									<View style={styles.mentorshipDetails}>
										<Text variant="titleSmall">
											{areas.length > 0 ? areas.join(", ") : "Mentoria"}
										</Text>
										<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
											{hasMentor
												? isExpanded
													? "Mentor atribuído · Toque para recolher"
													: "Mentor atribuído · Toque para ver perfil"
												: "Aguardando definição de mentor"}
										</Text>
									</View>
									<Chip compact>{formatMentorshipStatusLabel(item.status)}</Chip>
								</Pressable>

								{isExpanded ? (
									<View
										style={[
											styles.mentorProfileBox,
											{ backgroundColor: theme.colors.surfaceVariant },
										]}>
										{isLoadingProfile && !profile ? (
											<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
												Carregando perfil do mentor...
											</Text>
										) : profileError ? (
											<View style={styles.stateBox}>
												<Text variant="bodyMedium" style={{ color: theme.colors.error }}>
													{parseError(profileError).message}
												</Text>
												<Button
													mode="outlined"
													compact
													onPress={() => void fetchMentorProfile(item.mentorId, { force: true })}>
													Tentar novamente
												</Button>
											</View>
										) : profile ? (
											<View style={styles.profileContent}>
												<Text variant="titleSmall" style={styles.profileTitle}>
													Perfil do mentor
												</Text>
												<Text variant="bodyMedium">
													{profile.miniBio || "Mini bio não informada."}
												</Text>

												{profile.areas.length > 0 ? (
													<View style={styles.chips}>
														{profile.areas.map(area => (
															<View
																key={area}
																style={[
																	styles.staticChip,
																	{ borderColor: theme.colors.outline },
																]}>
																<Text variant="labelLarge">{area}</Text>
															</View>
														))}
													</View>
												) : null}

												{isSafeExternalUrl(profile.schedulingLink) ? (
													<Button
														mode="contained"
														onPress={() => void handleOpenSchedulingLink(profile.schedulingLink)}>
														Abrir link de agendamento
													</Button>
												) : (
													<Text
														variant="bodySmall"
														style={{ color: theme.colors.onSurfaceVariant }}>
														Link de agendamento não disponível no momento.
													</Text>
												)}

												{linkError ? (
													<Text variant="bodySmall" style={{ color: theme.colors.error }}>
														{linkError}
													</Text>
												) : null}
											</View>
										) : null}
									</View>
								) : null}

								{index < mentorships.length - 1 ? <Divider /> : null}
							</View>
						);
					})
				)}
			</Surface>

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
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
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
	stateBox: {
		gap: 10,
		alignItems: "flex-start",
	},
	mentorshipRow: {
		minHeight: 56,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingVertical: 10,
	},
	mentorshipDetails: {
		flex: 1,
		gap: 4,
	},
	mentorProfileBox: {
		borderRadius: 14,
		padding: 14,
		marginBottom: 10,
	},
	profileContent: {
		gap: 10,
	},
	profileTitle: {
		fontWeight: "700",
	},
	button: {
		borderRadius: 12,
		marginTop: 8,
	},
});