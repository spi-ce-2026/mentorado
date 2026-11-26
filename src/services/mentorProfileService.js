import { api } from "@mentorias/auth";

// Serviço de perfil público/profissional do mentor (UC06).
export const mentorProfileService = {
	getByMentorId: mentorId => api.get(`/profiles/mentor/${encodeURIComponent(mentorId)}`),
};