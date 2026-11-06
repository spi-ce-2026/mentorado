import { initializeApp } from "firebase/app";
import {
	initializeAuth,
	getReactNativePersistence,
	signOut as firebaseSignOut,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { log } from "./logger";

// Configuração do Firebase
const firebaseConfig = {
	apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Web Client ID do Google OAuth (necessário para Google Sign-In)
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
GoogleSignin.configure({
	webClientId: webClientId,
	offlineAccess: true,
});
log("GoggleSignin configured");
// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase Auth com persistência usando AsyncStorage
const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

/**
 * Configura o Google Sign-In com o webClientId fornecido
 * @param {string} webClientId - Web Client ID do Google OAuth
 */
export const configureGoogleSignIn = webClientId => {
	if (webClientId) {
		GoogleSignin.configure({
			webClientId: webClientId,
			offlineAccess: true,
		});
	}
};

/**
 * Faz logout do usuário do Firebase e do Google Sign-In
 * @returns {Promise<void>}
 * @throws {Error} Se o logout falhar
 */
const signOutFirebaseAndGoogle = async () => {
	log("firebase.js -> signOutFirebaseAndGoogle -> firebaseSignOut");
	await firebaseSignOut(auth);
	log("firebase.js -> signOutFirebaseAndGoogle -> GoogleSignin.signOut");
	await GoogleSignin.signOut();
	log("firebase.js -> signOutFirebaseAndGoogle -> done");
};

// Exportar funções e objetos necessários
export { auth, signOutFirebaseAndGoogle };
