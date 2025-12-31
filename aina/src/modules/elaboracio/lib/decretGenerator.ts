/**
 * Decret Generator Service
 *
 * Generates a DOCX document for the "Decret d'Atorgament de Subvenció Directa"
 * using information from the Decret form.
 * The generated document mirrors the preview shown in DocumentPreview.tsx
 */

import { Document, Packer, Paragraph, TextRun, WidthType, AlignmentType, ShadingType, BorderStyle, convertInchesToTwip, TableLayoutType, LevelFormat } from "docx"
import { saveAs } from "file-saver"
import type { DocumentSection, PreviewData } from "../components/DocumentPreview"
import type { DecretFormData } from "../components/Decret"

// =============================================================================
// CONSTANTS - Colors matching the preview (consistent with informeTecnicGenerator)
// =============================================================================

const HEADER_COLOR = "7F1D1D" // Tailwind bg-red-900 (darker for better Word visibility)
const BORDER_COLOR = "000000" // Black borders for visibility

// =============================================================================
// TYPES
// =============================================================================

export interface DecretGenerationInput {
	preFormData: any
	extractedData: any
	informeTecnicData?: any
	documentSections: DocumentSection[]
	previewData: PreviewData
	formData?: DecretFormData
}

export interface DecretSectionsByPart {
	fets: DocumentSection[]
	fonaments: DocumentSection[]
	resolucio: DocumentSection[]
	all: DocumentSection[]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Strip HTML tags from content and convert to plain text
 */
function stripHtml(html: string): string {
	if (!html) return ""
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.trim()
}

/**
 * Create standard table borders
 */
function createTableBorders() {
	return {
		top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
		bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
		left: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
		right: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
	}
}

/**
 * Create header shading (dark red background) - Word compatible
 */
function createHeaderShading() {
	return {
		fill: HEADER_COLOR,
		color: HEADER_COLOR,
		type: ShadingType.CLEAR,
	}
}

/**
 * Create a styled paragraph with optional formatting
 */
function createParagraph(text: string, options?: { bold?: boolean; italic?: boolean; size?: number; spacing?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }): Paragraph {
	return new Paragraph({
		children: [
			new TextRun({
				text,
				bold: options?.bold,
				italics: options?.italic,
				size: options?.size ?? 22, // 11pt
				font: "Arial",
			}),
		],
		spacing: { after: options?.spacing ?? 200 },
		alignment: options?.alignment ?? AlignmentType.JUSTIFIED,
	})
}

/**
 * Create a section heading matching the preview style (e.g., "PART I: FETS")
 */
function createPartHeading(text: string): Paragraph {
	return new Paragraph({
		children: [
			new TextRun({
				text,
				bold: true,
				size: 24, // 12pt
				font: "Arial",
			}),
		],
		spacing: { before: 400, after: 200 },
		alignment: AlignmentType.LEFT,
		shading: {
			fill: "F4F4F5", // zinc-100 equivalent
			color: "F4F4F5",
			type: ShadingType.CLEAR,
		},
	})
}

/**
 * Parse content with HTML formatting (bold, italic, paragraphs) into TextRuns
 */
function parseHtmlContent(html: string): TextRun[] {
	if (!html) return []

	const runs: TextRun[] = []

	// First, strip paragraph tags - they just wrap content
	let cleanedHtml = html
		.replace(/<p>/gi, "")
		.replace(/<\/p>/gi, "\n")
		.replace(/<div>/gi, "")
		.replace(/<\/div>/gi, "\n")

	// Simple HTML parsing for <strong>, <em>, <br>
	const tagRegex = /<(strong|em|br|b|i|\/strong|\/em|\/b|\/i)>/gi
	const parts = cleanedHtml.split(tagRegex)

	let isBold = false
	let isItalic = false

	for (const part of parts) {
		const lowerPart = part.toLowerCase()

		if (lowerPart === "strong" || lowerPart === "b") {
			isBold = true
		} else if (lowerPart === "/strong" || lowerPart === "/b") {
			isBold = false
		} else if (lowerPart === "em" || lowerPart === "i") {
			isItalic = true
		} else if (lowerPart === "/em" || lowerPart === "/i") {
			isItalic = false
		} else if (lowerPart === "br") {
			runs.push(
				new TextRun({
					text: "",
					break: 1,
				})
			)
		} else if (part.trim()) {
			// Clean up HTML entities and remaining tags
			const cleanText = part
				.replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
				.replace(/&nbsp;/g, " ")
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")

			if (cleanText.trim()) {
				runs.push(
					new TextRun({
						text: cleanText,
						bold: isBold,
						italics: isItalic,
						size: 22,
						font: "Arial",
					})
				)
			}
		}
	}

	return runs
}

/**
 * Parse list items from HTML <ul><li> content
 */
function parseListItems(html: string): string[] {
	const items: string[] = []
	// Match all <li>...</li> content
	const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
	let match
	while ((match = liRegex.exec(html)) !== null) {
		// Clean up the content inside <li>
		let itemText = match[1]
			.replace(/<[^>]*>/g, "") // Remove any HTML tags inside
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.trim()
		if (itemText) {
			items.push(itemText)
		}
	}
	return items
}

/**
 * Check if content contains a list
 */
function containsList(content: string): boolean {
	return /<ul[^>]*>/i.test(content) || /<ol[^>]*>/i.test(content)
}

/**
 * Create a content section from DocumentSection - handles HTML formatting and lists
 */
function createSectionParagraphs(section: DocumentSection): Paragraph[] {
	const paragraphs: Paragraph[] = []
	const content = section.content

	// Check if content contains lists
	if (containsList(content)) {
		// Split content by <ul> or <ol> tags to handle mixed content
		const parts = content.split(/(<ul[^>]*>[\s\S]*?<\/ul>|<ol[^>]*>[\s\S]*?<\/ol>)/gi)

		for (const part of parts) {
			if (!part.trim()) continue

			if (/<ul[^>]*>/i.test(part) || /<ol[^>]*>/i.test(part)) {
				// This is a list - parse list items and create bullet paragraphs
				const listItems = parseListItems(part)
				for (const item of listItems) {
					paragraphs.push(
						new Paragraph({
							children: [
								new TextRun({
									text: item,
									size: 22,
									font: "Arial",
								}),
							],
							bullet: {
								level: 0,
							},
							spacing: { after: 100 },
							alignment: AlignmentType.JUSTIFIED,
						})
					)
				}
			} else {
				// Regular content - parse as before
				// Split by double newlines (paragraphs) or by <p> tags
				const contentParagraphs = part.split(/\n\n+|<\/p>\s*<p[^>]*>/gi)

				for (const para of contentParagraphs) {
					if (!para.trim()) continue

					const runs = parseHtmlContent(para)

					if (runs.length > 0) {
						paragraphs.push(
							new Paragraph({
								children: runs,
								spacing: { after: 200 },
								alignment: AlignmentType.JUSTIFIED,
							})
						)
					}
				}
			}
		}
	} else {
		// No lists - original behavior
		// Split content by double newlines (paragraphs)
		const contentParagraphs = content.split(/\n\n+/)

		for (const para of contentParagraphs) {
			if (!para.trim()) continue

			const runs = parseHtmlContent(para)

			if (runs.length > 0) {
				paragraphs.push(
					new Paragraph({
						children: runs,
						spacing: { after: 200 },
						alignment: AlignmentType.JUSTIFIED,
					})
				)
			}
		}
	}

	return paragraphs
}

// =============================================================================
// MAIN DOCUMENT GENERATION
// =============================================================================

/**
 * Generate the complete Decret DOCX document
 */
async function createDecretDocument(input: DecretGenerationInput): Promise<Document> {
	const { documentSections, previewData } = input

	// Separate sections by part
	const sectionsByPart: DecretSectionsByPart = {
		fets: documentSections.filter((s) => s.part === "fets"),
		fonaments: documentSections.filter((s) => s.part === "fonaments"),
		resolucio: documentSections.filter((s) => s.part === "resolucio"),
		all: documentSections,
	}

	const children: Paragraph[] = []

	// Document Title
	children.push(
		new Paragraph({
			children: [
				new TextRun({
					text: "DECRET D'ATORGAMENT DE SUBVENCIÓ DIRECTA",
					bold: true,
					size: 28, // 14pt
					font: "Arial",
				}),
			],
			spacing: { after: 400 },
			alignment: AlignmentType.CENTER,
			border: {
				bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER_COLOR },
			},
		})
	)

	// Add spacing after title
	children.push(
		new Paragraph({
			children: [],
			spacing: { after: 200 },
		})
	)

	// PART I: FETS
	if (sectionsByPart.fets.length > 0) {
		children.push(createPartHeading("PART I: FETS"))

		for (const section of sectionsByPart.fets) {
			const sectionParagraphs = createSectionParagraphs(section)
			children.push(...sectionParagraphs)

			// Add spacing between sections
			children.push(
				new Paragraph({
					children: [],
					spacing: { after: 100 },
				})
			)
		}
	}

	// PART II: FONAMENTS DE DRET
	if (sectionsByPart.fonaments.length > 0) {
		children.push(createPartHeading("PART II: FONAMENTS DE DRET"))

		for (const section of sectionsByPart.fonaments) {
			const sectionParagraphs = createSectionParagraphs(section)
			children.push(...sectionParagraphs)

			// Add spacing between sections
			children.push(
				new Paragraph({
					children: [],
					spacing: { after: 100 },
				})
			)
		}
	}

	// PART III: RESOLUCIÓ
	if (sectionsByPart.resolucio.length > 0) {
		children.push(createPartHeading("PART III: RESOLUCIÓ"))

		for (const section of sectionsByPart.resolucio) {
			const sectionParagraphs = createSectionParagraphs(section)
			children.push(...sectionParagraphs)

			// Add spacing between sections
			children.push(
				new Paragraph({
					children: [],
					spacing: { after: 100 },
				})
			)
		}
	}

	// If no sections, add placeholder
	if (documentSections.length === 0) {
		children.push(createParagraph("Document pendent de completar. Ompliu el formulari per generar el contingut."))
	}

	return new Document({
		numbering: {
			config: [
				{
					reference: "bullet-numbering",
					levels: [
						{
							level: 0,
							format: LevelFormat.BULLET,
							text: "\u2022", // Bullet character •
							alignment: AlignmentType.LEFT,
							style: {
								paragraph: {
									indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
								},
							},
						},
					],
				},
			],
		},
		styles: {
			default: {
				document: {
					run: {
						font: "Arial",
						size: 22,
					},
				},
			},
		},
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: 1440, // 1 inch = 1440 twips
							right: 1440,
							bottom: 1440,
							left: 1440,
						},
					},
				},
				children,
			},
		],
	})
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Generate and download the Decret document
 */
export async function generateDecretDocument(input: DecretGenerationInput): Promise<void> {
	try {
		const doc = await createDecretDocument(input)
		const blob = await Packer.toBlob(doc)

		// Generate filename with expedient number
		const expedient = input.previewData.numExpedient || "expedient"
		const safeExpedient = expedient.replace(/[^a-zA-Z0-9-]/g, "_")
		const filename = `Decret_${safeExpedient}.docx`

		saveAs(blob, filename)
		console.log("✅ Decret document generated successfully:", filename)
	} catch (error) {
		console.error("❌ Error generating Decret document:", error)
		throw error
	}
}
