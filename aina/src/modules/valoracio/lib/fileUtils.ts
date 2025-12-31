// Utilitats per a fitxers

/**
 * Normalitza noms de fitxers corregint problemes de codificació de caràcters
 * Específicament dissenyat per corregir problemes amb caràcters catalans i espanyols
 */
export function normalizeFileName(fileName: string): string {
	try {
		let normalized = fileName

		// Taula de reemplaçaments per a caràcters mal codificats
		const charReplacements = {
			// Caràcters amb codificació UTF-8 incorrecta
			"Ã¨": "è",
			"Ã©": "é",
			"Ã¡": "á",
			"Ã­": "í",
			"Ã³": "ó",
			Ãº: "ú",
			"Ã¼": "ü",
			"Ã±": "ñ",
			"Ã§": "ç",
			"Ã ": "à",
			"Ã²": "ò",
			"Ã¿": "ÿ",
			Ãµ: "õ",
			"Ã¦": "æ",
			"Ã°": "ð",
			"Ã¾": "þ",

			// Caràcters amb combinacions especials
			TeÌcnic: "Tècnic",
			teÌcnic: "tècnic",
			TeÌ: "Tè",
			teÌ: "tè",

			// Caràcters amb símbol euro (€) mal interpretat
			"Tè€cnic": "Tècnic",
			"tè€cnic": "tècnic",
			"è€": "è",
			"é€": "é",
			"à€": "à",
			"ò€": "ò",
			"ú€": "ú",
			"í€": "í",
			"ó€": "ó",
			"ñ€": "ñ",
			"ç€": "ç",
			"ü€": "ü",
			"á€": "á",

			// Seqüències problemàtiques addicionals
			"Ã\u008c": "È",
			"Ã\u0081": "Á",
			"Ã\u0089": "É",
			"Ã\u008d": "Í",
			"Ã\u0093": "Ó",
			"Ã\u009a": "Ú",

			// Caràcters especials que poden aparèixer mal
			"\u2019": "'", // Apòstrof
			"\u201c": '"', // Cometes esquerra
			"\u201d": '"', // Cometes dreta
			"\u2013": "-", // Guió
		}

		// Aplicar reemplaçaments de caràcters
		for (const [badChar, goodChar] of Object.entries(charReplacements)) {
			normalized = normalized.replace(new RegExp(badChar, "g"), goodChar)
		}

		// Intentar decodificar URI si és necessari
		try {
			const decoded = decodeURIComponent(escape(normalized))
			if (decoded !== normalized && isValidString(decoded)) {
				normalized = decoded
			}
		} catch (e) {
			console.warn("No s'ha pogut decodificar URI component:", e)
		}

		// Normalitzar usant NFC (Canonical Decomposition, followed by Canonical Composition)
		normalized = normalized.normalize("NFC")

		// Netejar espais extra i caràcters de control
		// eslint-disable-next-line no-control-regex
		normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
		normalized = normalized.replace(/\s+/g, " ").trim()

		return normalized
	} catch (error) {
		console.warn("Error normalitzant nom de fitxer:", error)
		return fileName
	}
}

/**
 * Verifica si una cadena és vàlida (no conté caràcters estranys)
 */
function isValidString(str: string): boolean {
	// Verifica que no contingui caràcters de control estranys
	// eslint-disable-next-line no-control-regex
	return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(str)
}

/**
 * Detecta si un fitxer té problemes de codificació
 */
export function hasEncodingIssues(fileName: string): boolean {
	const problematicPatterns = [
		/Ã[¨©¡­³º¼±§ ²¿µ¦°¾]/g, // Caràcters UTF-8 mal codificats
		/[a-zA-Z]€[a-zA-Z]/g, // Lletres amb símbol euro al mig
		/[a-zA-Z]Ì[a-zA-Z]/g, // Lletres amb Ì al mig
		/â€[™œ\u009d"]/g, // Caràcters especials mal codificats
	]

	return problematicPatterns.some((pattern) => pattern.test(fileName))
}

/**
 * Obté informació detallada sobre un fitxer
 */
export function getFileInfo(file: File) {
	const extension = file.name.split(".").pop()?.toLowerCase() || ""
	const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
	const normalizedName = normalizeFileName(file.name)
	const hasIssues = hasEncodingIssues(file.name)

	return {
		originalName: file.name,
		normalizedName,
		baseName: normalizeFileName(baseName),
		extension,
		size: file.size,
		type: file.type,
		hasEncodingIssues: hasIssues,
		isSupported: ["pdf", "doc", "docx", "txt"].includes(extension),
	}
}

/**
 * Valida si un fitxer és suportat
 */
export function isSupportedFile(file: File): boolean {
	const supportedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"]

	const supportedExtensions = ["pdf", "doc", "docx", "txt"]

	const extension = file.name.split(".").pop()?.toLowerCase() || ""

	return supportedTypes.includes(file.type) || supportedExtensions.includes(extension)
}

/**
 * Formata la mida d'un fitxer per a visualització
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes"

	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
