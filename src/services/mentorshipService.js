import { api } from "@mentorias/auth";

// Serviço de mentorias do app do mentorado. O `api` já envia o JWT e renova a sessão em 401.
export const mentorshipService = {
	create: preferences => api.post("/mentorships", { preferences }),
};
