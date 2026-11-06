import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { useAuth } from "@mentorias/auth";

import LoginScreen from "../screens/LoginScreen";

// O pacote real carrega o Google Sign-In e o Firebase, que não rodam no Jest.
jest.mock("@mentorias/auth", () => ({ useAuth: jest.fn() }));

const renderLogin = () =>
	render(
		<PaperProvider>
			<LoginScreen />
		</PaperProvider>
	);

describe("LoginScreen", () => {
	it("chama o login ao tocar em Entrar com Google", () => {
		const login = jest.fn();
		useAuth.mockReturnValue({ login, loading: false });

		renderLogin();
		fireEvent.press(screen.getByText("Entrar com Google"));

		expect(login).toHaveBeenCalledTimes(1);
	});

	it("não chama o login enquanto ele está em andamento", () => {
		const login = jest.fn();
		useAuth.mockReturnValue({ login, loading: true });

		renderLogin();
		fireEvent.press(screen.getByText("Entrar com Google"));

		expect(login).not.toHaveBeenCalled();
	});
});
