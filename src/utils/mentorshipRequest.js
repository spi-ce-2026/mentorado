// Funções puras da solicitação de mentoria (sem React e sem chamadas HTTP).

export const EXPERTISE_REQUIRED_MESSAGE = "Selecione ao menos uma área de especialidade.";

const VOUCHER_NOT_AVAILABLE_MESSAGE =
	"Seu voucher não está disponível para esta solicitação. Confira seus créditos na aba Início.";

const DEFAULT_CATEGORY = "Outras áreas";

/**
 * Normaliza a resposta de GET /tags. Lança erro se o formato não for uma lista.
 * Mantém só tags com nome, remove duplicadas e define categoria padrão.
 */
export function normalizeTags(data) {
	if (!Array.isArray(data)) {
		throw new Error("A lista de áreas está em um formato inválido.");
	}

	const seen = new Set();
	const tags = [];

	data.forEach(tag => {
		const name = typeof tag?.name === "string" ? tag.name.trim() : "";
		if (!name || seen.has(name)) {
			return;
		}
		seen.add(name);

		const category = typeof tag.category === "string" && tag.category.trim()
			? tag.category.trim()
			: DEFAULT_CATEGORY;
		tags.push({ name, category });
	});

	return tags;
}

/** Agrupa tags por categoria, na ordem alfabética das categorias (pt-BR). */
export function groupTagsByCategory(tags) {
	const groups = new Map();

	tags.forEach(tag => {
		if (!groups.has(tag.category)) {
			groups.set(tag.category, []);
		}
		groups.get(tag.category).push(tag);
	});

	return [...groups.entries()]
		.sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
		.map(([category, items]) => ({ category, items }));
}

/** Adiciona o item se ausente, ou remove se presente. Não altera o array original. */
export function toggleItem(list, value) {
	return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

/** Retorna um objeto com a mensagem de cada campo inválido. Vazio quando o formulário está válido. */
export function validateMentorshipForm({ expertise }) {
	const errors = {};
	if (!expertise || expertise.length === 0) {
		errors.expertise = EXPERTISE_REQUIRED_MESSAGE;
	}
	return errors;
}

/** Monta o objeto "preferences" do contrato de POST /mentorships. */
export function buildPreferences({ expertise, availableTimes, preferredLanguage, sessionFormat }) {
	return {
		expertise: [...expertise],
		availableTimes: [...availableTimes],
		preferredLanguage,
		sessionFormat,
	};
}

/**
 * Interpreta o erro de POST /mentorships.
 * @param {object} error - erro do axios
 * @param {string} fallbackMessage - mensagem genérica (ex.: a de parseError)
 * @returns {{ code: string|null, message: string }}
 */
export function describeSubmitError(error, fallbackMessage) {
	const code = error?.response?.data?.error ?? null;

	if (code === "voucher_required") {
		return {
			code,
			message: "Para solicitar uma mentoria, você precisa ter um crédito de voucher.",
		};
	}

	if (code === "voucher_not_available") {
		return { code, message: VOUCHER_NOT_AVAILABLE_MESSAGE };
	}

	return { code, message: fallbackMessage };
}

const STATUS_INFO = {
	pending_match: {
		icon: "account-search-outline",
		label: "Buscando mentor",
		title: "Estamos procurando um mentor para você",
		message:
			"Recebemos sua solicitação de mentoria. Assim que um mentor for definido, a mentoria será atualizada.",
	},
	matched: {
		icon: "account-check-outline",
		label: "Mentor definido",
		title: "Sua solicitação já tem um mentor",
		message: "Um mentor foi definido para a sua solicitação. O horário ainda precisa ser agendado.",
	},
};

const UNKNOWN_STATUS_INFO = {
	icon: "check-circle-outline",
	label: "Solicitação recebida",
	title: "Sua solicitação foi recebida",
	message: "Os detalhes desta solicitação ainda não estão disponíveis nesta tela.",
};

/** Texto de acompanhamento para cada status. Status desconhecido não é tratado como espera. */
export function getMentorshipStatusInfo(status) {
	return STATUS_INFO[status] || UNKNOWN_STATUS_INFO;
}
