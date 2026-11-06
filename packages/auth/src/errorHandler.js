import { Alert } from "react-native";

/**
 * Tipos de erros comuns da API
 */
export const ErrorTypes = {
	NETWORK_ERROR: "NETWORK_ERROR",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	SERVER_ERROR: "SERVER_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Analisa um erro e retorna informações estruturadas
 */
export const parseError = error => {
	// Erro de rede (sem resposta do servidor)
	if (!error.response) {
		if (error.message === "Network Error" || error.code === "NETWORK_ERROR") {
			return {
				type: ErrorTypes.NETWORK_ERROR,
				message: "Erro de conexão. Verifique sua internet e tente novamente.",
				statusCode: null,
				originalError: error,
			};
		}
		return {
			type: ErrorTypes.UNKNOWN_ERROR,
			message: error.message || "Ocorreu um erro inesperado. Tente novamente.",
			statusCode: null,
			originalError: error,
		};
	}

	const { status, data } = error.response;

	// Erro 401 - Não autorizado
	if (status === 401) {
		return {
			type: ErrorTypes.UNAUTHORIZED,
			message: data?.message || "Sessão expirada. Faça login novamente.",
			statusCode: 401,
			originalError: error,
		};
	}

	// Erro 403 - Proibido
	if (status === 403) {
		return {
			type: ErrorTypes.FORBIDDEN,
			message: data?.message || "Você não tem permissão para realizar esta ação.",
			statusCode: 403,
			originalError: error,
		};
	}

	// Erro 404 - Não encontrado
	if (status === 404) {
		return {
			type: ErrorTypes.NOT_FOUND,
			message: data?.message || "Recurso não encontrado.",
			statusCode: 404,
			originalError: error,
		};
	}

	// Erro 400 - Validação
	if (status === 400) {
		return {
			type: ErrorTypes.VALIDATION_ERROR,
			message: data?.message || "Dados inválidos. Verifique as informações e tente novamente.",
			statusCode: 400,
			originalError: error,
			validationErrors: data?.errors || null,
		};
	}

	// Erro 500+ - Erro do servidor
	if (status >= 500) {
		return {
			type: ErrorTypes.SERVER_ERROR,
			message: data?.message || "Erro no servidor. Tente novamente mais tarde.",
			statusCode: status,
			originalError: error,
		};
	}

	// Outros erros
	return {
		type: ErrorTypes.UNKNOWN_ERROR,
		message: data?.message || `Erro ${status}. Tente novamente.`,
		statusCode: status,
		originalError: error,
	};
};

/**
 * Exibe um alerta com a mensagem de erro
 */
export const showErrorAlert = (error, customTitle = "Erro") => {
	const parsedError = parseError(error);
	Alert.alert(customTitle, parsedError.message);
	return parsedError;
};

/**
 * Trata erro de forma silenciosa (apenas log)
 */
export const handleErrorSilently = error => {
	const parsedError = parseError(error);
	if (__DEV__) {
		console.error("Erro silencioso:", parsedError);
	}
	return parsedError;
};



/**
 * Retry logic para requisições
 */
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
	let lastError;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await requestFn();
		} catch (error) {
			lastError = error;
			const parsedError = parseError(error);

			// Não tentar novamente para erros de autenticação ou validação
			if (
				parsedError.type === ErrorTypes.UNAUTHORIZED ||
				parsedError.type === ErrorTypes.FORBIDDEN ||
				parsedError.type === ErrorTypes.VALIDATION_ERROR ||
				parsedError.statusCode === 404
			) {
				throw error;
			}

			// Aguardar antes de tentar novamente
			if (i < maxRetries - 1) {
				await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
			}
		}
	}
	throw lastError;
};

