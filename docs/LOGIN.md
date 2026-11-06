O login tem quatro etapas: o Google identifica a pessoa, o Firebase transforma isso numa sessão, o `auth-service` troca essa sessão por um JWT próprio, e o app usa esse JWT em todas as chamadas.

```
App (mentoradoApp)                     Google / Firebase            Backend
1. GoogleSignin.signIn()  ───────────► Google: seletor de conta
   ◄─ Google ID token
2. signInWithCredential() ───────────► Firebase Auth
   ◄─ sessão Firebase + Firebase ID token (1h)
3. POST /auth/login {idToken} ─────────────────────────────────► gateway ─► auth-service
                                                                  valida o token no Firebase
                                                                  busca ou cria o usuário no Mongo
   ◄─ { accessToken (1h), refreshToken (24h) }
4. GET /users/me (Bearer accessToken) ─────────────────────────► auth-service
   ◄─ dados do usuário → setUser → tela principal
```

## Etapa 1: Google (nativo)

O botão "Entrar com Google" chama `login()` em [AuthContext.js:127](mobile/mentoradoApp/src/context/AuthContext.js#L127). O `GoogleSignin.signIn()` abre o seletor de contas do Android, que é a tela que você vê.

- Essa parte roda na camada nativa. Ela depende do `google-services.json`, que traz o pacote e o SHA-1, e do `EXPO_PUBLIC_GOOGLE_CLIENT_ID` passado ao `GoogleSignin.configure` em [firebase.js:23](mobile/mentoradoApp/src/config/firebase.js#L23).
- A resposta é `{ type, data }`. Se a pessoa fechar o seletor, `type` vem como `"cancelled"` e o `login()` termina sem erro.
- `data.idToken` é um **Google ID token**, que só serve para provar ao Firebase quem é o usuário.

## Etapa 2: Firebase

- `GoogleAuthProvider.credential(data.idToken)` seguido de `signInWithCredential(auth, credential)` cria a sessão no Firebase Auth.
- A sessão fica persistida no AsyncStorage ([firebase.js:32](mobile/mentoradoApp/src/config/firebase.js#L32)). Por isso o Firebase continua logado depois que o app fecha.
- `firebaseUser.getIdToken()` devolve o **Firebase ID token**. É um JWT assinado pelo Google; no seu log ele traz, entre outros:
  ```json
  { "iss": "https://securetoken.google.com/mentorias-uberhub", "aud": "mentorias-uberhub",
    "email": "angoti@gmail.com", "name": "Edson Angoti Júnior",
    "firebase": { "sign_in_provider": "google.com" }, "exp": "iat + 3600" }
  ```
- O `signInWithCredential` dispara o listener `onIdTokenChanged`. Enquanto o `login()` está em andamento, o listener ignora esse disparo (a flag `loginInProgress` que acabamos de adicionar). Antes da correção, era isso que gerava a chamada dupla.

## Etapa 3: backend (`POST /auth/login`)

`authService.login` ([api.js:163](mobile/mentoradoApp/src/services/api.js#L163)) envia `{ idToken }` ao gateway.

1. **Gateway:** só roteia `/api/v1/auth/**` para `auth-service:8081`. Ele não valida token nenhum.
2. **Segurança do auth-service:** `/api/v1/auth/login` está em `permitAll`, então a requisição chega sem JWT.
3. **`AuthService.loginWithFirebase`:**
   - **Verificação do token:** `firebaseService.verifyIdToken` usa o Firebase Admin SDK, que é inicializado com a conta de serviço do `FIREBASE_CREDENTIALS_JSON`. Ele confere a assinatura com as chaves públicas do Google, o projeto (`iss`/`aud`) e a validade. Token inválido gera **401 `invalid_firebase_token`**. Sem credenciais configuradas, gera **503 `firebase_not_configured`**.
   - **Email:** o email é lido do token. Se faltar, gera 401.
   - **`findOrCreateUser`:** busca o usuário por email. Se não existir, cria com `role: MENTEE` e `status: ACTIVE`. O índice único em `email` e o tratamento de `DuplicateKeyException` evitam o duplicado que causou o 500.
   - **Dados do Google:** sincroniza `name` e `picture`.
   - **Status:** se o status não for `ACTIVE`, gera **401 `user_suspended`**.
   - **Tokens:** emite dois tokens no [JwtService.java:31](backend/auth-service/src/main/java/com/example/auth/jwt/JwtService.java#L31), os dois assinados com HS256 e o `JWT_SECRET`:
     - o **access token** (1h) leva `sub` (email), `roles` (ex.: `"ROLE_MENTEE"` ou `"ROLE_MENTEE,ROLE_MENTOR"`) e `userId` (o `_id` do Mongo);
     - o **refresh token** (24h) leva só `sub`.

O usuário é identificado pelo **email**. O `uid` do Firebase não é guardado.

## Etapa 4: app salva a sessão

- `authService.login` grava `token` e `refreshToken` no AsyncStorage ([api.js:166](mobile/mentoradoApp/src/services/api.js#L166)).
- `GET /users/me` traz `id`, `name`, `email`, `picture`, `role` e `status`. O resultado vai para o AsyncStorage (`user`) e para `setUser`.
- `isAuthenticated = !!user` faz o `RootNavigator` trocar a tela de login pelo `MainTab` ([RootNavigator.js:53](mobile/mentoradoApp/src/navigators/RootNavigator.js#L53)).
- Se algo falhar, o `login()` mostra o alerta "Não foi possível entrar" e o app continua na tela de login.

## Chamadas depois do login

- O interceptor de requisição ([api.js:44](mobile/mentoradoApp/src/services/api.js#L44)) acrescenta `Authorization: Bearer <accessToken>` em toda chamada.
- Cada serviço valida o JWT localmente no seu `JwtAuthFilter`. O filtro confere a assinatura com o mesmo `JWT_SECRET` e transforma o claim `roles` em authorities, que o `@PreAuthorize` e as regras de URL usam. Nenhum serviço consulta o auth-service ou o Firebase nessa etapa. Por isso o `JWT_SECRET` precisa ser idêntico em todos os serviços.

## Os quatro tokens

| Token | Quem emite | Validade | Onde fica | Para que serve |
|---|---|---|---|---|
| Google ID token | Google | ~1h | só na memória | Obter a sessão Firebase |
| Firebase ID token | Firebase | 1h (renovado pelo SDK) | SDK do Firebase | Provar a identidade no `/auth/login` |
| Access token | auth-service | 1h | AsyncStorage `token` | Chamar a API |
| Refresh token | auth-service | 24h | AsyncStorage `refreshToken` | `/auth/refresh` |

## Renovação e reabertura do app

- **Ao abrir o app:** o `restoreSession` ([AuthContext.js:23](mobile/mentoradoApp/src/context/AuthContext.js#L23)) testa o token salvo com `/users/me`. Se ele tiver expirado, limpa a sessão local. Em seguida o `onIdTokenChanged` dispara com o usuário Firebase persistido e refaz o `/auth/login` sozinho. Na prática, o usuário continua logado enquanto a sessão Firebase existir.
- **Com o app aberto:** o SDK do Firebase renova o ID token a cada hora. Cada renovação dispara o listener, que chama `/auth/login` de novo e recebe um par de JWT novo.
- **Logout:** sai do Firebase e do Google e apaga os tokens locais. O backend não tem endpoint de logout, porque os JWTs não ficam registrados em lugar nenhum.
