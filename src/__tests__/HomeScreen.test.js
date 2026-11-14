import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { useAuth } from "@mentorias/auth";

import { voucherService } from "../services/api";
import HomeScreen from "../screens/HomeScreen";

jest.mock("@mentorias/auth", () => ({
	useAuth: jest.fn(),
	parseError: error => ({ message: error?.message || "Não foi possível carregar os dados." }),
}));

jest.mock("@expo/vector-icons", () => ({
	MaterialCommunityIcons: () => null,
}));

jest.mock("../services/api", () => ({
	voucherService: {
		listMine: jest.fn(),
		redeem: jest.fn(),
	},
}));

const renderHome = () =>
	render(
		<PaperProvider>
			<HomeScreen />
		</PaperProvider>
	);

describe("HomeScreen UC04", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		useAuth.mockReturnValue({ user: { name: "Ana Exemplo" } });
	});

	it("exibe os créditos calculados a partir dos vouchers resgatados", async () => {
		voucherService.listMine.mockResolvedValue({
			data: [
				{ id: "voucher-1", code: "ABC123", status: "redeemed" },
				{ id: "voucher-2", code: "DEF456", status: "used" },
			],
		});

		renderHome();

		await waitFor(() => expect(screen.getByText("1", { exact: true })).toBeTruthy());
		expect(screen.getByText("crédito disponível")).toBeTruthy();
		expect(screen.getByText("ABC123")).toBeTruthy();
		expect(screen.getByText("Utilizado")).toBeTruthy();
	});

	it("resgata o código e atualiza o saldo e o histórico", async () => {
		voucherService.listMine
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({
				data: [{ id: "voucher-new", code: "NOVO123", status: "redeemed" }],
			});
		voucherService.redeem.mockResolvedValue({ data: { status: "redeemed" } });

		renderHome();
		await waitFor(() => expect(screen.getByText("Nenhum voucher resgatado. Insira um código para adicionar seu primeiro crédito.")).toBeTruthy());

		fireEvent.changeText(screen.getByLabelText("Código do voucher"), "  novo123  ");
		fireEvent.press(screen.getByRole("button", { name: "Resgatar voucher" }));

		await waitFor(() => expect(voucherService.redeem).toHaveBeenCalledWith("novo123"));
		await waitFor(() => expect(screen.getByText("NOVO123")).toBeTruthy());
		expect(screen.getByText("1", { exact: true })).toBeTruthy();
		expect(screen.getByText("Voucher resgatado. Você recebeu 1 crédito.")).toBeTruthy();
	});

	it("explica quando o voucher é inválido, expirou ou já foi resgatado", async () => {
		voucherService.listMine.mockResolvedValue({ data: [] });
		voucherService.redeem.mockRejectedValue({
			response: { data: { error: "invalid_or_expired_voucher" } },
		});

		renderHome();
		await waitFor(() => expect(screen.getByText("Nenhum voucher resgatado. Insira um código para adicionar seu primeiro crédito.")).toBeTruthy());

		fireEvent.changeText(screen.getByLabelText("Código do voucher"), "INVÁLIDO");
		fireEvent.press(screen.getByRole("button", { name: "Resgatar voucher" }));

		await waitFor(() =>
			expect(screen.getByText("Este código é inválido, expirou ou já foi resgatado.")).toBeTruthy()
		);
	});
});
