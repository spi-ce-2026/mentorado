import Constants from "expo-constants";

/**
 * Obtém a URL base da API
 * Prioridade:
 * 1. Variável de ambiente (expo-constants)
 * 2. Valor padrão baseado na plataforma
 */
export const getApiBaseUrl = () => {
	// Tentar obter da configuração do Expo
	const apiUrl = Constants.expoConfig?.extra?.API_BASE_URL;

	if (apiUrl) {
		// Garantir que termina com /api/v1
		return apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
	}

	// Valores padrão baseados na plataforma
	if (__DEV__) {
		// Em desenvolvimento, usar valores padrão para emuladores
		const platform = Constants.platform?.ios ? "ios" : "android";
		if (platform === "ios") {
			return "http://localhost:8080/api/v1";
		}
		return "http://10.0.2.2:8080/api/v1"; // Android emulator
	}

	// [Correção 5.3] Mesma URL de produção do app.json (extra.API_BASE_URL). Antes cada
	// lugar apontava para um backend diferente (outro app do Heroku, Railway).
	return "https://mentorias-api-gateway-10fcbc088ede.herokuapp.com/api/v1";
};

/**
 * Obtém o Project ID do Expo
 */
export const getExpoProjectId = () => {
	return (
		Constants.expoConfig?.extra?.EXPO_PUBLIC_PROJECT_ID || Constants.expoConfig?.extra?.projectId
	);
};

/**
 * Obtém o ambiente atual
 */
export const getEnvironment = () => {
	return Constants.expoConfig?.extra?.ENV || (__DEV__ ? "development" : "production");
};

/**
 * Valida se as variáveis de ambiente obrigatórias estão configuradas
 */
export const validateEnv = () => {
	const apiUrl = getApiBaseUrl();
	if (!apiUrl) {
		console.warn("⚠️ API_BASE_URL não configurada. Usando valor padrão.");
	}
	return {
		apiUrl,
		projectId: getExpoProjectId(),
		environment: getEnvironment(),
	};
};
