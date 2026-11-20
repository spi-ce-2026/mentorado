import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { parseError } from "@mentorias/auth";
import { Button, Surface, Text, useTheme } from "react-native-paper";

import SelectableChip from "../components/SelectableChip";
import {
	AVAILABLE_TIME_OPTIONS,
	DEFAULT_PREFERRED_LANGUAGE,
	DEFAULT_SESSION_FORMAT,
	PREFERRED_LANGUAGE_OPTIONS,
	SESSION_FORMAT_OPTIONS,
} from "../config/mentorshipOptions";
import { tagService } from "../services/api";
import { mentorshipService } from "../services/mentorshipService";
import {
	buildPreferences,
	describeSubmitError,
	groupTagsByCategory,
	normalizeTags,
	toggleItem,
	validateMentorshipForm,
} from "../utils/mentorshipRequest";

function FormSection({ title, hint, error, children }) {
	const theme = useTheme();

	return (
		<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
			<Text variant="titleMedium" accessibilityRole="header" style={styles.sectionTitle}>
				{title}
			</Text>
			{hint ? (
				<Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
					{hint}
				</Text>
			) : null}
			<View style={styles.sectionBody}>{children}</View>
			{error ? (
				<Text
					variant="bodySmall"
					accessibilityRole="alert"
					accessibilityLiveRegion="polite"
					style={[styles.fieldError, { color: theme.colors.error }]}>
					{error}
				</Text>
			) : null}
		</Surface>
	);
}

export default function SolicitarMentoriaScreen({ navigation }) {
	const theme = useTheme();
	const [tags, setTags] = useState([]);
	const [loadingTags, setLoadingTags] = useState(true);
	const [tagsError, setTagsError] = useState(null);
	const [expertise, setExpertise] = useState([]);
	const [availableTimes, setAvailableTimes] = useState([]);
	const [preferredLanguage, setPreferredLanguage] = useState(DEFAULT_PREFERRED_LANGUAGE);
	const [sessionFormat, setSessionFormat] = useState(DEFAULT_SESSION_FORMAT);
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	// Trava síncrona: o estado "submitting" só vale depois do re-render, então dois toques rápidos
	// poderiam disparar duas requisições antes dele.
	const submittingRef = useRef(false);

	const loadTags = useCallback(async () => {
		setLoadingTags(true);
		setTagsError(null);
		try {
			const response = await tagService.list();
			setTags(normalizeTags(response.data));
		} catch (error) {
			setTagsError(error);
		} finally {
			setLoadingTags(false);
		}
	}, []);

	useEffect(() => {
		void loadTags();
	}, [loadTags]);

	const handleToggleExpertise = name => {
		setExpertise(current => toggleItem(current, name));
		setErrors(current => ({ ...current, expertise: undefined }));
	};

	const handleToggleAvailableTime = value => {
		setAvailableTimes(current => toggleItem(current, value));
	};

	const handleSubmit = async () => {
		if (submittingRef.current) {
			return;
		}

		const validationErrors = validateMentorshipForm({ expertise });
		setErrors(validationErrors);
		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		submittingRef.current = true;
		setSubmitting(true);
		setSubmitError(null);

		try {
			const preferences = buildPreferences({
				expertise,
				availableTimes,
				preferredLanguage,
				sessionFormat,
			});
			const response = await mentorshipService.create(preferences);
			// replace: o formulário sai da pilha, então "voltar" não reenvia a solicitação.
			navigation.replace("AcompanhamentoMentoria", {
				status: response.data?.status ?? null,
				expertise: [...expertise],
			});
		} catch (error) {
			setSubmitError(describeSubmitError(error, parseError(error).message));
		} finally {
			submittingRef.current = false;
			setSubmitting(false);
		}
	};

	const groups = groupTagsByCategory(tags);
	const expertiseCount = expertise.length;
	const isVoucherRequired = submitError?.code === "voucher_required";

	return (
		<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			<View style={styles.heading}>
				<Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>
					Solicitar mentoria
				</Text>
				<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
					Escolha as áreas em que você quer orientação. Você pode marcar mais de uma. Suas escolhas são mantidas se algo der errado.
				</Text>
			</View>

			{isVoucherRequired ? (
				<Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.errorContainer }]}>
					<View style={styles.voucherHeading}>
						<MaterialCommunityIcons name="ticket-confirmation-outline" size={26} color={theme.colors.onErrorContainer} />
						<Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer }}>
							Voucher necessário
						</Text>
					</View>
					<Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: theme.colors.onErrorContainer, marginTop: 8 }}>
						{submitError.message} Resgate seu código na aba Início e volte aqui: suas escolhas continuam preenchidas.
					</Text>
					<Button
						mode="contained"
						onPress={() => navigation.navigate("Inicio")}
						style={styles.actionButton}>
						Resgatar voucher
					</Button>
					<Button
						mode="outlined"
						onPress={handleSubmit}
						disabled={submitting}
						style={styles.secondaryButton}>
						Já resgatei, enviar novamente
					</Button>
				</Surface>
			) : null}

			<FormSection
				title="Áreas de especialidade"
				hint={
					expertiseCount > 0
						? `${expertiseCount} ${expertiseCount === 1 ? "área selecionada" : "áreas selecionadas"}`
						: "Obrigatório: escolha ao menos uma área."
				}
				error={errors.expertise}>
				{loadingTags ? (
					<View style={styles.inlineState}>
						<ActivityIndicator color={theme.colors.primary} accessibilityLabel="Carregando áreas" />
						<Text variant="bodyMedium">Carregando áreas...</Text>
					</View>
				) : tagsError ? (
					<View style={styles.inlineState}>
						<Text variant="bodyMedium" style={{ color: theme.colors.error }}>
							{parseError(tagsError).message}
						</Text>
						<Button mode="outlined" onPress={loadTags}>
							Tentar novamente
						</Button>
					</View>
				) : groups.length === 0 ? (
					<View style={styles.inlineState}>
						<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
							Nenhuma área está disponível no momento.
						</Text>
						<Button mode="outlined" onPress={loadTags}>
							Atualizar lista
						</Button>
					</View>
				) : (
					groups.map(group => (
						<View key={group.category} style={styles.group}>
							<Text variant="labelLarge" accessibilityRole="header" style={{ color: theme.colors.onSurfaceVariant }}>
								{group.category}
							</Text>
							<View style={styles.chipWrap}>
								{group.items.map(tag => (
									<SelectableChip
										key={tag.name}
										label={tag.name}
										selected={expertise.includes(tag.name)}
										onPress={() => handleToggleExpertise(tag.name)}
											disabled={submitting}
									/>
								))}
							</View>
						</View>
					))
				)}
			</FormSection>

			<FormSection
				title="Idioma"
				hint="Idioma preferido para a mentoria.">
				<View style={styles.chipWrap}>
					{PREFERRED_LANGUAGE_OPTIONS.map(option => (
						<SelectableChip
							key={option.value}
							role="radio"
							label={option.label}
							selected={preferredLanguage === option.value}
							onPress={() => setPreferredLanguage(option.value)}
								disabled={submitting}
						/>
					))}
				</View>
			</FormSection>

			<FormSection title="Formato" hint="Como a mentoria acontece.">
				<View style={styles.chipWrap}>
					{SESSION_FORMAT_OPTIONS.map(option => (
						<SelectableChip
							key={option.value}
							role="radio"
							label={option.label}
							selected={sessionFormat === option.value}
							onPress={() => setSessionFormat(option.value)}
								disabled={submitting}
						/>
					))}
				</View>
			</FormSection>

			<FormSection title="Disponibilidade" hint="Opcional.">
				{AVAILABLE_TIME_OPTIONS.length === 0 ? (
					<Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
						As opções de disponibilidade ainda não foram definidas. Por enquanto, nenhum horário será enviado.
					</Text>
				) : (
					<View style={styles.chipWrap}>
						{AVAILABLE_TIME_OPTIONS.map(option => (
							<SelectableChip
								key={option.value}
								label={option.label}
								selected={availableTimes.includes(option.value)}
								onPress={() => handleToggleAvailableTime(option.value)}
									disabled={submitting}
							/>
						))}
					</View>
				)}
			</FormSection>

			{submitError && !isVoucherRequired ? (
				<Text
					variant="bodyMedium"
					accessibilityRole="alert"
					accessibilityLiveRegion="polite"
					style={[styles.submitError, { color: theme.colors.error }]}>
					{submitError.message}
				</Text>
			) : null}

			<Button
				mode="contained"
				onPress={handleSubmit}
				loading={submitting}
				disabled={submitting}
				accessibilityHint="Envia a solicitação de mentoria com as preferências escolhidas"
				style={styles.submitButton}>
				Solicitar mentoria
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
	heading: {
		gap: 6,
	},
	title: {
		fontWeight: "700",
	},
	card: {
		padding: 20,
		borderRadius: 20,
		gap: 8,
	},
	sectionTitle: {
		fontWeight: "700",
	},
	hint: {
		marginBottom: 4,
	},
	sectionBody: {
		gap: 12,
	},
	fieldError: {
		marginTop: 4,
	},
	inlineState: {
		gap: 12,
		alignItems: "flex-start",
	},
	group: {
		gap: 8,
	},
	chipWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	voucherHeading: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	actionButton: {
		marginTop: 12,
		borderRadius: 12,
	},
	secondaryButton: {
		marginTop: 4,
		borderRadius: 12,
	},
	submitError: {
		textAlign: "center",
	},
	submitButton: {
		borderRadius: 12,
		marginTop: 4,
	},
});
