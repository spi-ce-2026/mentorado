import { api } from "@mentorias/auth";

// Serviços de domínio do app. O `api` do @mentorias/auth já envia o token e renova a sessão em 401.
export const tagService = {
	list: () => api.get("/tags"),
};

export const voucherService = {
	listMine: () => api.get("/admin/vouchers/mine"),
	redeem: code => api.post("/admin/vouchers/redeem", { code }),
};
