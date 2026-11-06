/**
 * Formata data/hora no formato brasileiro: dd/mm/aa hh:mm:ss
 * Converte para o fuso horário brasileiro (America/Sao_Paulo)
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
const formatDateTime = (date = new Date()) => {
	// Usa Intl.DateTimeFormat para obter valores no timezone brasileiro
	const formatter = new Intl.DateTimeFormat("pt-BR", {
		timeZone: "America/Sao_Paulo",
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	const parts = formatter.formatToParts(date);
	const day = parts.find(p => p.type === "day").value;
	const month = parts.find(p => p.type === "month").value;
	const year = parts.find(p => p.type === "year").value;
	const hours = parts.find(p => p.type === "hour").value;
	const minutes = parts.find(p => p.type === "minute").value;
	const seconds = parts.find(p => p.type === "second").value;

	return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const log = (message, data = "") => {
	const timestamp = formatDateTime();

	let dataPart = formata(data);

	console.log(`> ${timestamp} - ${message}${dataPart}`);
};

export function formata(data) {
	// log("formata -> data", data);
	let dataPart = "";
	if (data) {
		const isJsonObject = typeof data === "object" && !(data instanceof Date);
		let formattedData;
		if (isJsonObject) {
			formattedData = JSON.stringify(data);
		} else {
			formattedData = data;
		}
		dataPart = ` - ${formattedData}`;
	}
	return dataPart;
}
