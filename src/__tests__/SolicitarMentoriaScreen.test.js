import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { tagService } from "../services/api";
import { mentorshipService } from "../services/mentorshipService";
import SolicitarMentoriaScreen from "../screens/SolicitarMentoriaScreen";
import AcompanhamentoMentoriaScreen from "../screens/AcompanhamentoMentoriaScreen";

// parseError real (sem carregar o Firebase do pacote de autenticação).
jest.mock("@mentorias/auth", () => ({
	parseError: require("@mentorias/auth/src/errorHandler").parseError,
}));

jest.mock("@expo/vector-icons", () => ({
	MaterialCommunityIcons: () => null,
}));

jest.mock("../services/api", () => ({
	tagService: { list: jest.fn() },
}));

jest.mock("../services/mentorshipService", () => ({
	mentorshipService: { create: jest.fn() },
}));

const TAGS = [
	{ name: "Java", category: "Tecnologia" },
	{ name: "Dados", category: "Tecnologia" },
	{ name: "Liderança", category: "Gestão" },
];

const renderScreen = (navigation = { navigate: jest.fn(), replace: jest.fn() }) => {
	render(
		<PaperProvider>
			<SolicitarMentoriaScreen navigation={navigation} />
		</PaperProvider>
	);
	return navigation;
};

const submit = () => fireEvent.press(screen.getByRole("button", { name: "Solicitar mentoria" }));

describe("SolicitarMentoriaScreen UC05", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	// 1. Carregamento bem-sucedido de GET /tags
	it("carrega as áreas de GET /tags e as exibe agrupadas por categoria", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });

		renderScreen();

		expect(await screen.findByRole("checkbox", { name: "Java" })).toBeTruthy();
		expect(screen.getByRole("checkbox", { name: "Dados" })).toBeTruthy();
		expect(screen.getByRole("checkbox", { name: "Liderança" })).toBeTruthy();
		expect(screen.getByText("Gestão")).toBeTruthy();
		expect(tagService.list).toHaveBeenCalledTimes(1);
	});

	// 2. Erro ao consultar as áreas, com "Tentar novamente"
	it("mostra erro ao consultar as áreas e permite tentar novamente", async () => {
		tagService.list
			.mockRejectedValueOnce(new Error("Network Error"))
			.mockResolvedValueOnce({ data: TAGS });

		renderScreen();

		await screen.findByText("Erro de conexão. Verifique sua internet e tente novamente.");
		fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));

		expect(await screen.findByRole("checkbox", { name: "Java" })).toBeTruthy();
		expect(tagService.list).toHaveBeenCalledTimes(2);
	});

	// 3. Lista de áreas vazia
	it("trata lista de áreas vazia", async () => {
		tagService.list.mockResolvedValue({ data: [] });

		renderScreen();

		expect(await screen.findByText("Nenhuma área está disponível no momento.")).toBeTruthy();
		expect(screen.queryByRole("checkbox")).toBeNull();
	});

	// 4. Seleção e desmarcação de áreas
	it("permite selecionar e desmarcar áreas", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		renderScreen();

		const java = await screen.findByRole("checkbox", { name: "Java" });
		fireEvent.press(java);
		fireEvent.press(screen.getByRole("checkbox", { name: "Dados" }));

		expect(screen.getByRole("checkbox", { name: "Java" }).props.accessibilityState.checked).toBe(true);
		expect(screen.getByText("2 áreas selecionadas")).toBeTruthy();

		fireEvent.press(screen.getByRole("checkbox", { name: "Java" }));
		expect(screen.getByRole("checkbox", { name: "Java" }).props.accessibilityState.checked).toBe(false);
		expect(screen.getByText("1 área selecionada")).toBeTruthy();
	});

	// 5. Envio sem selecionar área
	it("não envia sem área selecionada e mostra a validação", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		renderScreen();
		await screen.findByRole("checkbox", { name: "Java" });

		submit();

		expect(await screen.findByText("Selecione ao menos uma área de especialidade.")).toBeTruthy();
		expect(mentorshipService.create).not.toHaveBeenCalled();
	});

	// 6. Payload montado conforme docs/API.md
	it("envia o payload preferences com áreas, idioma, formato e disponibilidade", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create.mockResolvedValue({ data: { status: "pending_match" } });
		renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Dados" }));
		fireEvent.press(screen.getByRole("checkbox", { name: "Java" }));
		fireEvent.press(screen.getByRole("radio", { name: "Inglês" }));
		fireEvent.press(screen.getByRole("radio", { name: "Presencial" }));
		submit();

		await waitFor(() =>
			expect(mentorshipService.create).toHaveBeenCalledWith({
				expertise: ["Dados", "Java"],
				availableTimes: [],
				preferredLanguage: "Inglês",
				sessionFormat: "presencial",
			})
		);
	});

	// 7. Solicitação criada com sucesso -> acompanhamento
	it("navega para o acompanhamento com o status retornado pela API", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create.mockResolvedValue({ data: { status: "pending_match" } });
		const navigation = renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();

		await waitFor(() =>
			expect(navigation.replace).toHaveBeenCalledWith("AcompanhamentoMentoria", {
				status: "pending_match",
				expertise: ["Java"],
			})
		);
	});

	// 8. Erro voucher_required
	it("explica a necessidade de voucher quando a API responde voucher_required", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create.mockRejectedValue({
			response: { status: 400, data: { status: 400, error: "voucher_required" } },
		});
		renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();

		expect(await screen.findByText(/Para solicitar uma mentoria, você precisa ter um crédito de voucher/)).toBeTruthy();
		expect(screen.getByRole("button", { name: "Resgatar voucher" })).toBeTruthy();
	});

	// 9. Navegação para o resgate de voucher e retorno ao fluxo
	it("navega para o resgate de voucher e mantém as escolhas ao voltar", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create
			.mockRejectedValueOnce({ response: { status: 400, data: { error: "voucher_required" } } })
			.mockResolvedValueOnce({ data: { status: "pending_match" } });
		const navigation = renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();
		await screen.findByRole("button", { name: "Resgatar voucher" });

		fireEvent.press(screen.getByRole("button", { name: "Resgatar voucher" }));
		expect(navigation.navigate).toHaveBeenCalledWith("Inicio");

		// Ao voltar, a tela ainda tem a seleção: basta reenviar.
		expect(screen.getByRole("checkbox", { name: "Java" }).props.accessibilityState.checked).toBe(true);
		fireEvent.press(screen.getByRole("button", { name: "Já resgatei, enviar novamente" }));

		await waitFor(() =>
			expect(navigation.replace).toHaveBeenCalledWith("AcompanhamentoMentoria", {
				status: "pending_match",
				expertise: ["Java"],
			})
		);
	});

	// 11. Prevenção de envios duplicados
	it("impede múltiplas requisições simultâneas", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		let resolveCreate;
		mentorshipService.create.mockImplementation(
			() => new Promise(resolve => (resolveCreate = resolve))
		);
		renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();
		submit();
		submit();

		expect(mentorshipService.create).toHaveBeenCalledTimes(1);
		await act(async () => resolveCreate({ data: { status: "pending_match" } }));
	});

	// Durante o envio as escolhas ficam travadas: o formulário não pode divergir do payload enviado.
	it("bloqueia a alteração de áreas enquanto a solicitação está em andamento", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		let resolveCreate;
		mentorshipService.create.mockImplementation(
			() => new Promise(resolve => (resolveCreate = resolve))
		);
		renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();
		fireEvent.press(screen.getByRole("checkbox", { name: "Dados" }));

		expect(screen.getByRole("checkbox", { name: "Dados" }).props.accessibilityState.checked).toBe(false);
		expect(screen.getByRole("checkbox", { name: "Dados" }).props.accessibilityState.disabled).toBe(true);
		await act(async () => resolveCreate({ data: { status: "pending_match" } }));
	});

	// 12. Falha de rede durante a solicitação
	it("mostra mensagem de falha de rede", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create.mockRejectedValue(new Error("Network Error"));
		renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Java" }));
		submit();

		expect(
			await screen.findByText("Erro de conexão. Verifique sua internet e tente novamente.")
		).toBeTruthy();
	});

	// 13. Preservação dos campos após erro
	it("preserva áreas, idioma, formato e disponibilidade depois de um erro", async () => {
		tagService.list.mockResolvedValue({ data: TAGS });
		mentorshipService.create.mockRejectedValue(new Error("Network Error"));
		const navigation = renderScreen();

		fireEvent.press(await screen.findByRole("checkbox", { name: "Dados" }));
		fireEvent.press(screen.getByRole("radio", { name: "Inglês" }));
		fireEvent.press(screen.getByRole("radio", { name: "Presencial" }));
		submit();

		await screen.findByText("Erro de conexão. Verifique sua internet e tente novamente.");
		expect(screen.getByRole("checkbox", { name: "Dados" }).props.accessibilityState.checked).toBe(true);
		expect(screen.getByRole("radio", { name: "Inglês" }).props.accessibilityState.checked).toBe(true);
		expect(screen.getByRole("radio", { name: "Presencial" }).props.accessibilityState.checked).toBe(true);
		expect(navigation.replace).not.toHaveBeenCalled();
	});
});

describe("AcompanhamentoMentoriaScreen UC05", () => {
	const renderTracking = (params, navigation = { navigate: jest.fn() }) => {
		render(
			<PaperProvider>
				<AcompanhamentoMentoriaScreen route={{ params }} navigation={navigation} />
			</PaperProvider>
		);
		return navigation;
	};

	// 10. Estado pending_match
	it("exibe o estado pending_match com título, status e áreas solicitadas", () => {
		renderTracking({ status: "pending_match", expertise: ["Java", "Dados"] });

		expect(screen.getByText("Estamos procurando um mentor para você")).toBeTruthy();
		expect(screen.getByText("Buscando mentor")).toBeTruthy();
		expect(screen.getByText("Áreas solicitadas")).toBeTruthy();
		expect(screen.getByText("Java")).toBeTruthy();
		expect(screen.getByText("Dados")).toBeTruthy();
	});

	it("não promete prazo de atendimento no estado pending_match", () => {
		renderTracking({ status: "pending_match", expertise: [] });
		expect(screen.queryByText(/minuto|hora|dia|imediat/i)).toBeNull();
	});

	it("não força o estado de espera quando a API retorna outro status", () => {
		renderTracking({ status: "matched", expertise: ["Java"] });

		expect(screen.queryByText("Buscando mentor")).toBeNull();
		expect(screen.getByText("Mentor definido")).toBeTruthy();
	});

	it("o botão Voltar ao início navega para a aba Início", () => {
		const navigation = renderTracking({ status: "pending_match", expertise: [] });

		fireEvent.press(screen.getByRole("button", { name: "Voltar ao início" }));

		expect(navigation.navigate).toHaveBeenCalledWith("Inicio");
	});
});
