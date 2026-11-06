module.exports = {
	preset: "jest-expo",
	transformIgnorePatterns: [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
	],
	testMatch: ["**/__tests__/**/*.test.js", "**/?(*.)+(spec|test).js"],
	collectCoverageFrom: [
		"src/**/*.{js,jsx}",
		"!src/**/*.example.js",
		"!src/**/__tests__/**",
	],
	// Os testes do pacote rodam com a configuração dele: npm test -w @mentorias/auth
	testPathIgnorePatterns: ["/node_modules/", "<rootDir>/packages/"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};

