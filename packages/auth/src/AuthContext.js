import { createContext, useState, useContext, useMemo, useEffect, useRef } from "react";
import { signInWithCredential, GoogleAuthProvider, onIdTokenChanged } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";

import { auth, signOutFirebaseAndGoogle } from "./firebase";
import { authService } from "./api";
import { log } from "./logger";
import { showErrorAlert } from "./errorHandler";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inicia como true (carregando sessão)
  const [initializing, setInitializing] = useState(true);
  const loginInProgress = useRef(false);

  // Restaurar sessão ao iniciar o app
  useEffect(() => {
    log("AuthContext -> Restaurando sessão ao iniciar o app");
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const savedUser = await AsyncStorage.getItem("user");
        log("AuthContext -> restoreSession -> token:", token);
        if (token && savedUser) {
          // Valida se o token ainda é válido fazendo uma requisição ao backend
          try {
            log("AuthContext -> restoreSession -> fazendo requisição ao backend getMe");
            const { data: backendUser } = await authService.getMe();
            log("AuthContext -> restoreSession -> backendUser:", backendUser);
            // Token válido - restaura sessão
            setUser({
              ...JSON.parse(savedUser),
              ...backendUser, // Atualiza com dados mais recentes do backend
            });
          } catch (error) {
            // Token expirado ou inválido - limpa sessão
            log("AuthContext -> Token expirado, limpando sessão", error);
            await authService.logout();
            await AsyncStorage.removeItem("user");
            setUser(null);
          }
        }
      } catch (error) {
        log("Erro ao restaurar sessão:", error);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // [Correção 3.3] api.js emite "auth:changed" quando o refresh falha e os tokens são
  // apagados. Não havia ninguém escutando: o app continuava na área logada com todas
  // as requisições falhando. Aqui a sessão é encerrada e o RootNavigator volta ao login.
  useEffect(() => {
    log("AuthContext -> Adicionando listener para 'auth:changed'");
    const subscription = DeviceEventEmitter.addListener("auth:changed", async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        await AsyncStorage.removeItem("user");
        setUser(null);
      }
    });
    return () => subscription.remove();
  }, []);

  // Listener do Firebase para renovação automática
  useEffect(() => {
    log("AuthContext -> Adicionando listener onIdTokenChanged do Firebase");
    log(`AuthContext -> initializing: ${initializing}`);
    const unsubscribe = onIdTokenChanged(auth, async firebaseUser => {
      // Ignora mudanças durante inicialização
      if (initializing) return;
      // login() já autentica no backend; sem isto o signInWithCredential dispara este
      // listener e o /auth/login é chamado duas vezes em paralelo.
      if (loginInProgress.current) return;
      log("AuthContext -> onIdTokenChanged -> firebaseUser:", firebaseUser ? firebaseUser.email : "usuario não autenticado");

      if (firebaseUser) {
        try {
          // Obtém idToken do Firebase (renovado automaticamente)
          const firebaseIdToken = await firebaseUser.getIdToken();

          // Renova JWT no backend
          await authService.login({ idToken: firebaseIdToken });

          // Busca dados atualizados do usuário
          const { data: backendUser } = await authService.getMe();

          // Comparar com user atual antes de atualizar
          if (user?.id !== backendUser?.id) {
            await AsyncStorage.setItem("user", JSON.stringify(backendUser));
            setUser(backendUser);
          } else {
            log("AuthContext -> Dados do usuário não mudaram, não é necessário atualizar estado");
          }

          log("AuthContext -> Token renovado automaticamente");
        } catch (error) {
          log("Erro ao renovar token:", error);

          // Se falhar autenticação, faz logout
          if (error.response?.status === 401 || error.response?.status === 403) {
            await authService.logout();
            await AsyncStorage.removeItem("user");
            setUser(null);
          }
        }
      } else {
        // Usuário deslogado no Firebase
        setUser(null);
      }
    });

    // Cleanup
    return () => unsubscribe();
  }, [initializing]);

  const login = async () => {
    log("AuthContext.js -> login");
    loginInProgress.current = true;
    setLoading(true);
    try {
      // 1. Login com Google
      const { type, data } = await GoogleSignin.signIn();
      // O usuário fechou o seletor de conta: não é erro
      if (type === "cancelled") return;

      // 2. Autenticar no Firebase
      const credential = GoogleAuthProvider.credential(data.idToken);
      const { user: firebaseUser } = await signInWithCredential(auth, credential);

      // 3. Obter Firebase idToken
      const firebaseIdToken = await firebaseUser.getIdToken();

      // 4. Login no backend (tokens JWT retornados pelo backend são salvos no AsyncStorage em authService.login())
      await authService.login({ idToken: firebaseIdToken });

      // 5. Buscar dados completos do usuário
      const { data: backendUser } = await authService.getMe();

      // 6. Salvar dados do backend (não do Firebase!)
      await AsyncStorage.setItem("user", JSON.stringify(backendUser));

      // 7. Atualizar estado com dados do backend
      setUser(backendUser);

      setLoading(false);
    } catch (error) {
      log("Erro ao fazer login:", error);
      setUser(null);
      showErrorAlert(error, "Não foi possível entrar");
    } finally {
      loginInProgress.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    log("AuthContext.js -> logout");
    try {
      // Logout do Firebase e Google
      await signOutFirebaseAndGoogle();

      // Limpar tokens do backend
      await authService.logout();

      // Limpar AsyncStorage
      await AsyncStorage.removeItem("user");

      setUser(null);
    } catch (error) {
      log("Erro ao fazer logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      initializing,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading, initializing],
  );

  // Não renderiza children enquanto estiver inicializando
  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.surface,
        }}>
        <ActivityIndicator size={100} animating={true} color={theme.colors.primary} />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
