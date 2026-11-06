jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-constants", () => ({
	default: {
		expoConfig: {
			extra: {
				API_BASE_URL: "http://localhost:8080",
				ENV: "test",
			},
		},
		platform: {
			ios: false,
		},
	},
}));

jest.mock("react-native", () => {
	const RN = jest.requireActual("react-native");
	RN.DeviceEventEmitter = {
		emit: jest.fn(),
		addListener: jest.fn(() => ({ remove: jest.fn() })),
	};
	return RN;
});
