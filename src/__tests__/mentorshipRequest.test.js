import {
	buildPreferences,
	describeSubmitError,
	getMentorshipStatusInfo,
	groupTagsByCategory,
	normalizeTags,
	toggleItem,
	validateMentorshipForm,
} from "../utils/mentorshipRequest";

describe("mentorshipRequest utils", () => {
	it("normaliza tags, remove duplicadas e define categoria padrão", () => {
		const tags = normalizeTags([
			{ name: " Java ", category: "Tecnologia" },
			{ name: "Java", category: "Tecnologia" },
			{ name: "Carreira" },
			{ name: "" },
		]);

		expect(tags).toEqual([
			{ name: "Java", category: "Tecnologia" },
			{ name: "Carreira", category: "Outras áreas" },
		]);
	});

	it("rejeita resposta de /tags que não é uma lista", () => {
		expect(() => normalizeTags({ tags: [] })).toThrow("formato inválido");
	});

	it("agrupa tags por categoria em ordem alfabética", () => {
		const groups = groupTagsByCategory([
			{ name: "Java", category: "Tecnologia" },
			{ name: "Liderança", category: "Gestão" },
			{ name: "Python", category: "Tecnologia" },
		]);

		expect(groups.map(g => g.category)).toEqual(["Gestão", "Tecnologia"]);
		expect(groups[1].items.map(i => i.name)).toEqual(["Java", "Python"]);
	});

	it("alterna itens sem mutar o array original", () => {
		const original = ["Java"];
		expect(toggleItem(original, "Dados")).toEqual(["Java", "Dados"]);
		expect(toggleItem(original, "Java")).toEqual([]);
		expect(original).toEqual(["Java"]);
	});

	it("exige ao menos uma área", () => {
		expect(validateMentorshipForm({ expertise: [] })).toEqual({
			expertise: "Selecione ao menos uma área de especialidade.",
		});
		expect(validateMentorshipForm({ expertise: ["Java"] })).toEqual({});
	});

	it("monta o payload preferences conforme docs/API.md", () => {
		expect(
			buildPreferences({
				expertise: ["Java", "Dados"],
				availableTimes: [],
				preferredLanguage: "Português",
				sessionFormat: "online",
			})
		).toEqual({
			expertise: ["Java", "Dados"],
			availableTimes: [],
			preferredLanguage: "Português",
			sessionFormat: "online",
		});
	});

	it("reconhece voucher_required e voucher_not_available pelo código do backend", () => {
		const required = describeSubmitError(
			{ response: { data: { error: "voucher_required" } } },
			"fallback"
		);
		expect(required.code).toBe("voucher_required");
		expect(required.message).toContain("voucher");

		const notAvailable = describeSubmitError(
			{ response: { data: { error: "voucher_not_available" } } },
			"fallback"
		);
		expect(notAvailable.code).toBe("voucher_not_available");

		expect(describeSubmitError({ response: { status: 500 } }, "Erro no servidor")).toEqual({
			code: null,
			message: "Erro no servidor",
		});
	});

	it("não trata status desconhecido como espera", () => {
		expect(getMentorshipStatusInfo("pending_match").label).toBe("Buscando mentor");
		expect(getMentorshipStatusInfo("matched").label).toBe("Mentor definido");
		expect(getMentorshipStatusInfo("alguma_coisa_nova").label).toBe("Solicitação recebida");
		expect(getMentorshipStatusInfo(null).label).toBe("Solicitação recebida");
	});
});
