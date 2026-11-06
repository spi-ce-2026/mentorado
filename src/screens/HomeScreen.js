import { useAuth } from "@mentorias/auth";

import EmptyState from "../components/EmptyState";

export default function HomeScreen() {
	const { user } = useAuth();
	const firstName = user?.name?.split(" ")[0] || "";

	return (
		<EmptyState
			icon="🏠"
			title={`Olá, ${firstName}`}
			message="Aqui entram os créditos de voucher (UC04) e as mentorias do usuário (UC05 e UC09)."
		/>
	);
}
