# API para os apps

Referência do backend para quem escreve as telas. Todas as chamadas passam pelo API Gateway:

```
https://mentorias-api-gateway-10fcbc088ede.herokuapp.com/api/v1
```

O `api` do pacote `@mentorias/auth` já usa esse endereço (ou o de `EXPO_PUBLIC_API_BASE_URL`), acrescenta o prefixo `/api/v1` e envia o header `Authorization: Bearer <accessToken>`. Nos exemplos abaixo, os caminhos já estão sem o prefixo, do jeito que se passa ao `api`: `api.get("/tags")`.

## Papéis

| Papel | Como é obtido | Uso |
|---|---|---|
| `ROLE_MENTEE` | Automático no primeiro login (todo usuário) | Resgatar voucher, solicitar e avaliar mentoria, criar perfil de mentor |
| `ROLE_MENTOR` | Adicionado quando o administrador aprova o perfil | Atualizar o perfil, agendar, dar o feedback da sessão |
| `ROLE_ADMIN` | Atribuído pelo professor | App do administrador |

O campo `role` de `GET /users/me` traz os papéis separados por vírgula, como `"MENTEE,MENTOR"`.

## Status de resposta e erros

| Status | Significado |
|---|---|
| 401 | Sessão vencida ou token inválido. O `api` tenta renovar a sessão sozinho; se não conseguir, o app volta ao login |
| 403 | A conta não tem o papel exigido |
| 404 | Recurso inexistente, ou de outra pessoa (o backend não revela que ele existe) |
| 400 | Regra de negócio violada; o corpo traz o código no campo `error` |

Formato do corpo de erro:

```json
{ "status": 400, "error": "voucher_required", "message": "Resgate um voucher antes de solicitar uma mentoria", "path": "/api/v1/mentorships" }
```

O campo `error` traz um código estável para escolher a mensagem. Os principais:

| Código | Quando |
|---|---|
| `invalid_or_expired_voucher` | Resgate de código inexistente, já usado ou vencido |
| `voucher_required` | Solicitar mentoria sem crédito de voucher |
| `voucher_not_available` | Voucher informado já usado, vencido ou de outra pessoa |
| `invalid_status_transition` | Mudança de status que o ciclo da mentoria não permite |
| `no_scheduled_session` | Confirmar horário sem agendamento |
| `mentorship_not_in_progress` | Avaliar antes de o mentor informar que a sessão aconteceu |
| `feedback_already_submitted` | Segunda avaliação da mesma mentoria |
| `profile_already_exists` | Segundo perfil de mentor para o mesmo usuário |
| `profile_not_found` | Aprovar um mentor sem perfil |

## Login e sessão (prontos no starter)

| Para quê | Chamada | Observação |
|---|---|---|
| Entrar | `POST /auth/login {"idToken"}` | Feito pelo `login()` do `useAuth` |
| Renovar | `POST /auth/refresh {"refreshToken"}` | Automático quando a API responde 401 |
| Usuário logado | `GET /users/me` | Vira o `user` do `useAuth`: `id`, `name`, `email`, `picture`, `role`, `status` |

## App do mentorado

| Para quê | Chamada | Observação |
|---|---|---|
| Resgatar voucher | `POST /admin/vouchers/redeem {"code"}` | Erro `invalid_or_expired_voucher` |
| Meus vouchers | `GET /admin/vouchers/mine` | Crédito = voucher com `status` `redeemed` |
| Tags | `GET /tags` | `name`, `category`, `description` |
| Solicitar mentoria | `POST /mentorships {"preferences": {"expertise": [nomes das tags], "availableTimes": [], "preferredLanguage", "sessionFormat"}}` | Erros `voucher_required` e `voucher_not_available`; a mentoria volta `matched` ou `pending_match` |
| Minhas mentorias | `GET /mentorships/mentee` | Cada uma traz `status`, `mentorId`, `menteeFeedbackSubmitted` e `scheduledSession` |
| Perfil do mentor | `GET /profiles/mentor/{mentorId}` | `miniBio`, `areas`, `schedulingLink` |
| Confirmar horário | `POST /mentorships/{id}/schedule/confirm {"confirmed": true}` | `false` recusa, e a mentoria volta a `matched` |
| Avaliar | `POST /mentorships/{id}/feedback/mentee {"rating", "feedback", "mentorHelpfulness", "goalAchievement"}` | Só em `in_progress`, uma vez; leva a `completed` |
| Pedir troca | `POST /mentorships/{id}/request-change {"changeType": "mentor_change", "reason"}` | Leva a `change_requested` |

## Ciclos de status

**Mentoria:** `pending_match` (procurando mentor) → `matched` (mentor atribuído, aguardando agendamento) → `scheduled` (horário registrado) → `in_progress` (o mentor informou que a sessão aconteceu, aguardando avaliação) → `completed`. De `matched`, `scheduled` ou `in_progress`, o pedido de troca leva a `change_requested`; antes da sessão, a mentoria pode ser `cancelled`.

**Voucher:** `active` (gerado) → `redeemed` (resgatado pelo mentorado, vale 1 crédito) → `used` (consumido ao solicitar mentoria). Um voucher vencido passa a `expired`.

**Perfil de mentor:** `PENDING` → `APPROVED` ou `REJECTED`. Um perfil reprovado não pode ser editado nem reenviado.

## Armadilhas

- **Papel novo só no próximo token.** Depois da aprovação, o mentor só recebe o `ROLE_MENTOR` ao refazer o `POST /auth/login`. Até lá, agendar e dar feedback respondem 403.
- **Horário sem fuso.** O backend guarda `scheduledAt` sem fuso. Envie o horário local, como `2026-12-01T14:00:00`; com `toISOString()`, que converte para UTC, a sessão aparece 3 h deslocada.
- **A confirmação não muda o status.** Ela fica em `scheduledSession.confirmationStatus` (`pending`, `confirmed` ou `rejected`). Não existe status `confirmed`.
- **Tags pelo nome.** `preferences.expertise` e `areas` levam o nome da tag, e o matchmaking compara esses nomes.
- **A descrição da necessidade é descartada.** `preferences` não tem campo para texto livre, e um campo a mais é ignorado sem erro.
- **Voucher de recompensa.** Só é criado quando a avaliação tem `rating` e `goalAchievement` iguais ou maiores que 4. Ele chega `active`, e o mentorado ainda precisa resgatá-lo pelo código.
- **Na aprovação, use o `mentorId`.** É o id do usuário. O `id` do perfil é outro valor e faz a aprovação falhar.
- **O mentor não tem nome no perfil.** O perfil guarda minibio, áreas e link, sem nome nem foto, e o mentorado não pode consultar o usuário do mentor.
- **Validações que ficam com o app.** O backend não confere: data de agendamento futura, estrelas entre 1 e 5, justificativa da troca com 20 caracteres ou mais, pelo menos uma área no perfil e link de agendamento com URL válida.
- **Backend compartilhado.** Todas as equipes usam o mesmo banco, e o matchmaking escolhe entre todos os mentores aprovados. Para testar com o seu próprio mentor, use áreas que outras equipes não estejam usando.
