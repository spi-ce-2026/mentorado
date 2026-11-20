// Opções das preferências de mentoria enviadas em POST /mentorships.
//
// PENDENTE DE CONFIRMAÇÃO COM O BACKEND (docs/design/proposta-redesign-mentorado.txt, decisão 7.8):
// - docs/API.md não lista os valores aceitos por sessionFormat e preferredLanguage.
// - availableTimes não tem formato definido; por isso a lista abaixo está vazia.
// Os valores de SESSION_FORMAT_OPTIONS e PREFERRED_LANGUAGE_OPTIONS vêm da proposta de
// redesign ("online" e "presencial" são exemplos ali citados) e precisam ser confirmados
// antes da demonstração. Ajuste somente esta lista quando o backend responder.

export const SESSION_FORMAT_OPTIONS = [
	{ value: "online", label: "Online" },
	{ value: "presencial", label: "Presencial" },
];

export const PREFERRED_LANGUAGE_OPTIONS = [
	{ value: "Português", label: "Português" },
	{ value: "Inglês", label: "Inglês" },
];

// Vazia até o backend informar os valores aceitos. Com a lista vazia a tela não oferece
// escolha e envia "availableTimes": [].
export const AVAILABLE_TIME_OPTIONS = [];

export const DEFAULT_SESSION_FORMAT = SESSION_FORMAT_OPTIONS[0].value;
export const DEFAULT_PREFERRED_LANGUAGE = PREFERRED_LANGUAGE_OPTIONS[0].value;
