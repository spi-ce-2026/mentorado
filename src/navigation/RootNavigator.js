import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useAuth } from "@mentorias/auth";

import AccountScreen from "../screens/AccountScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, color, size }) {
	return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

function MainTabs() {
	const theme = useTheme();

	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: theme.colors.primary },
				headerTintColor: theme.colors.onPrimary,
				tabBarActiveTintColor: theme.colors.primary,
			}}>
			<Tab.Screen
				name="Inicio"
				component={HomeScreen}
				options={{
					title: "Início",
					tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
				}}
			/>
			<Tab.Screen
				name="Conta"
				component={AccountScreen}
				options={{
					tabBarIcon: ({ color, size }) => <TabIcon name="account-circle" color={color} size={size} />,
				}}
			/>
		</Tab.Navigator>
	);
}

// Sem login, só existe a tela de login; depois do login, as abas do app.
export default function RootNavigator() {
	const { isAuthenticated } = useAuth();

	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			{isAuthenticated ? (
				<Stack.Screen name="Main" component={MainTabs} />
			) : (
				<Stack.Screen name="Login" component={LoginScreen} />
			)}
		</Stack.Navigator>
	);
}
