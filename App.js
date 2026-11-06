import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, adaptNavigationTheme } from "react-native-paper";
import { AuthProvider } from "@mentorias/auth";

import RootNavigator from "./src/navigation/RootNavigator";
import { theme } from "./src/theme";

const { LightTheme: navigationTheme } = adaptNavigationTheme({
	reactNavigationLight: DefaultTheme,
	materialLight: theme,
});

// O AuthProvider usa componentes do React Native Paper, por isso fica dentro do PaperProvider.
export default function App() {
	return (
		<PaperProvider theme={theme}>
			<AuthProvider>
				<NavigationContainer theme={navigationTheme}>
					<StatusBar style="light" />
					<RootNavigator />
				</NavigationContainer>
			</AuthProvider>
		</PaperProvider>
	);
}
