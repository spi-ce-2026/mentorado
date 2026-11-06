import { parseError, ErrorTypes } from "../errorHandler";
// [Correção 5.1] shouldRefreshToken fica em api.js; importado de errorHandler
// ele chegava undefined e estes testes nunca passavam (o CI não chegava a rodá-los).
import { shouldRefreshToken } from "../api";

describe("errorHandler", () => {
	describe("parseError", () => {
		it("deve identificar erro de rede", () => {
			const error = { message: "Network Error" };
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.NETWORK_ERROR);
		});

		it("deve identificar erro 401 (não autorizado)", () => {
			const error = {
				response: {
					status: 401,
					data: { message: "Token inválido" },
				},
			};
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.UNAUTHORIZED);
			expect(result.statusCode).toBe(401);
		});

		it("deve identificar erro 403 (proibido)", () => {
			const error = {
				response: {
					status: 403,
					data: { message: "Sem permissão" },
				},
			};
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.FORBIDDEN);
		});

		it("deve identificar erro 404 (não encontrado)", () => {
			const error = {
				response: {
					status: 404,
					data: { message: "Recurso não encontrado" },
				},
			};
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.NOT_FOUND);
		});

		it("deve identificar erro de validação (400)", () => {
			const error = {
				response: {
					status: 400,
					data: { message: "Dados inválidos", errors: {} },
				},
			};
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.VALIDATION_ERROR);
			expect(result.validationErrors).toBeDefined();
		});

		it("deve identificar erro do servidor (500+)", () => {
			const error = {
				response: {
					status: 500,
					data: { message: "Erro interno" },
				},
			};
			const result = parseError(error);
			expect(result.type).toBe(ErrorTypes.SERVER_ERROR);
		});
	});

	describe("shouldRefreshToken", () => {
		it("deve retornar true para erro 401", () => {
			const error = {
				response: {
					status: 401,
				},
			};
			expect(shouldRefreshToken(error)).toBe(true);
		});

		it("deve retornar false para outros erros", () => {
			const error = {
				response: {
					status: 403,
				},
			};
			expect(shouldRefreshToken(error)).toBe(false);
		});
	});
});

