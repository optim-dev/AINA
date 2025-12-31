/**
 * Informe Tècnic Generator Service
 *
 * Generates a DOCX document for the "Informe Tècnic de Subvenció"
 * using information from the InformeTecnic form.
 * The generated document mirrors the preview shown in DocumentPreview.tsx
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, convertInchesToTwip, BorderStyle, VerticalAlign, TableLayoutType } from "docx"
import { saveAs } from "file-saver"
import type { DocumentSection, PreviewData } from "../components/DocumentPreview"
import type { SubvencioData } from "../types"
import type { SubvencioPreFormData } from "../components/SubvencioPreForm"

// =============================================================================
// CONSTANTS - Colors matching the preview (bg-red-800 = #991B1B)
// =============================================================================

const HEADER_COLOR = "7F1D1D" // Tailwind bg-red-900 (darker for better Word visibility)
const TOTAL_ROW_COLOR = "E5E5E5" // Light gray for total rows
const BORDER_COLOR = "000000" // Black borders for visibility
const WHITE_COLOR = "FFFFFF"

// =============================================================================
// TYPES
// =============================================================================

export interface InformeTecnicGenerationInput {
	preFormData: SubvencioPreFormData
	extractedData: SubvencioData
	documentSections: DocumentSection[]
	previewData: PreviewData
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Strip HTML tags from content
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
 * Format date in Catalan format
 */
function formatDate(dateString: string): string {
	if (!dateString) return ""
	const date = new Date(dateString)
	if (isNaN(date.getTime())) return dateString
	return new Intl.DateTimeFormat("ca-ES", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(date)
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
 * Create header shading (dark red background)
 */
function createHeaderShading() {
	return {
		fill: HEADER_COLOR,
		color: HEADER_COLOR,
		type: ShadingType.CLEAR,
	}
}

/**
 * Create total row shading (light gray background)
 */
function createTotalRowShading() {
	return {
		fill: TOTAL_ROW_COLOR,
		color: TOTAL_ROW_COLOR,
		type: ShadingType.CLEAR,
	}
}

/**
 * Create a styled paragraph with optional bold text
 */
function createParagraph(text: string, options?: { bold?: boolean; size?: number; spacing?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }): Paragraph {
	return new Paragraph({
		children: [
			new TextRun({
				text,
				bold: options?.bold,
				size: options?.size ?? 22, // 11pt
				font: "Arial",
			}),
		],
		spacing: { after: options?.spacing ?? 200 },
		alignment: options?.alignment ?? AlignmentType.JUSTIFIED,
	})
}

/**
 * Create a section heading matching the preview style
 */
function createSectionHeading(text: string): Paragraph {
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
	})
}

// =============================================================================
// TABLE GENERATORS - Matching DocumentPreview.tsx styles
// =============================================================================

/**
 * Create the header data table (Dades Preliminars) - matches preview exactly
 */
function createHeaderTable(data: PreviewData): Table {
	const createRow = (label: string, value: string): TableRow => {
		return new TableRow({
			children: [
				new TableCell({
					width: { size: 3000, type: WidthType.DXA },
					shading: createHeaderShading(),
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: {
						top: convertInchesToTwip(0.05),
						bottom: convertInchesToTwip(0.05),
						left: convertInchesToTwip(0.1),
						right: convertInchesToTwip(0.1),
					},
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: label,
									bold: true,
									size: 20,
									font: "Arial",
									color: "FFFFFF",
								}),
							],
						}),
					],
				}),
				new TableCell({
					width: { size: 6000, type: WidthType.DXA },
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: {
						top: convertInchesToTwip(0.05),
						bottom: convertInchesToTwip(0.05),
						left: convertInchesToTwip(0.1),
						right: convertInchesToTwip(0.1),
					},
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: value,
									size: 20,
									font: "Arial",
								}),
							],
						}),
					],
				}),
			],
		})
	}

	// Import pagament avançat - handle the two options like in preview
	const importPagamentValue = data.importPagamentAvancat ? `${data.importPagamentAvancat} €` : "Opció A: ......... €    Opció B: No s'escau"

	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		layout: TableLayoutType.FIXED,
		rows: [
			createRow("Núm. Expedient", data.numExpedient),
			createRow("Nom de l'Entitat beneficiària", data.nomBeneficiari),
			createRow("NIF", data.nif),
			createRow("Actuació objecte de subvenció", data.actuacioObjecte),
			createRow("Import total actuació", `${data.importTotalActuacio} €`),
			createRow("Import total subvenció", `${data.importTotalSubvencio} €`),
			createRow("Import pagament avançat", importPagamentValue),
			createRow("Data presentació sol·licitud", data.dataPresentacio),
		],
	})
}

/**
 * Create income table (Previsió d'Ingressos) - matches preview exactly
 */
function createIncomeTable(budget: PreviewData["budget"]): Table {
	if (!budget) return new Table({ rows: [] })

	const cellMargins = {
		top: convertInchesToTwip(0.05),
		bottom: convertInchesToTwip(0.05),
		left: convertInchesToTwip(0.1),
		right: convertInchesToTwip(0.1),
	}

	const createHeaderRow = (): TableRow => {
		return new TableRow({
			children: [
				new TableCell({
					width: { size: 6000, type: WidthType.DXA },
					shading: createHeaderShading(),
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: "PREVISIÓ D'INGRESSOS",
									bold: true,
									size: 20,
									font: "Arial",
									color: "FFFFFF",
								}),
							],
						}),
					],
				}),
				new TableCell({
					width: { size: 3000, type: WidthType.DXA },
					shading: createHeaderShading(),
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							alignment: AlignmentType.CENTER,
							children: [
								new TextRun({
									text: "IMPORT (€)",
									bold: true,
									size: 20,
									font: "Arial",
									color: "FFFFFF",
								}),
							],
						}),
					],
				}),
			],
		})
	}

	const createDataRow = (label: string, value: string, isTotal = false): TableRow => {
		return new TableRow({
			children: [
				new TableCell({
					width: { size: 6000, type: WidthType.DXA },
					shading: isTotal ? createTotalRowShading() : undefined,
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: label,
									bold: isTotal,
									size: 20,
									font: "Arial",
								}),
							],
						}),
					],
				}),
				new TableCell({
					width: { size: 3000, type: WidthType.DXA },
					shading: isTotal ? createTotalRowShading() : undefined,
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							alignment: AlignmentType.RIGHT,
							children: [
								new TextRun({
									text: value,
									bold: isTotal,
									size: 20,
									font: "Arial",
								}),
							],
						}),
					],
				}),
			],
		})
	}

	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		layout: TableLayoutType.FIXED,
		rows: [
			createHeaderRow(),
			createDataRow("Recursos propis", budget.ingressos.recursosPropisEur),
			createDataRow("Subvencions d'altres administracions públiques (inclou altres subvencions per a la mateixa actuació Diputació de Barcelona)", budget.ingressos.subvencionsAltresEur),
			createDataRow("Aportacions privades", budget.ingressos.aportacionsPrivadesEur),
			createDataRow("Altres ingressos", budget.ingressos.altresIngressosEur),
			createDataRow("TOTAL", budget.ingressos.totalIngressosEur, true),
		],
	})
}

/**
 * Create expenses table (Previsió de Despeses) - matches preview exactly
 */
function createExpensesTable(budget: PreviewData["budget"]): Table {
	if (!budget) return new Table({ rows: [] })

	const cellMargins = {
		top: convertInchesToTwip(0.05),
		bottom: convertInchesToTwip(0.05),
		left: convertInchesToTwip(0.1),
		right: convertInchesToTwip(0.1),
	}

	const createHeaderRow = (): TableRow => {
		return new TableRow({
			children: [
				new TableCell({
					width: { size: 6000, type: WidthType.DXA },
					shading: createHeaderShading(),
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: "PREVISIÓ DE DESPESES",
									bold: true,
									size: 20,
									font: "Arial",
									color: "FFFFFF",
								}),
							],
						}),
					],
				}),
				new TableCell({
					width: { size: 3000, type: WidthType.DXA },
					shading: createHeaderShading(),
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							alignment: AlignmentType.CENTER,
							children: [
								new TextRun({
									text: "IMPORT (€)",
									bold: true,
									size: 20,
									font: "Arial",
									color: "FFFFFF",
								}),
							],
						}),
					],
				}),
			],
		})
	}

	const createDataRow = (label: string, value: string, isTotal = false): TableRow => {
		return new TableRow({
			children: [
				new TableCell({
					width: { size: 6000, type: WidthType.DXA },
					shading: isTotal ? createTotalRowShading() : undefined,
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							children: [
								new TextRun({
									text: label,
									bold: isTotal,
									size: 20,
									font: "Arial",
								}),
							],
						}),
					],
				}),
				new TableCell({
					width: { size: 3000, type: WidthType.DXA },
					shading: isTotal ? createTotalRowShading() : undefined,
					borders: createTableBorders(),
					verticalAlign: VerticalAlign.CENTER,
					margins: cellMargins,
					children: [
						new Paragraph({
							alignment: AlignmentType.RIGHT,
							children: [
								new TextRun({
									text: value,
									bold: isTotal,
									size: 20,
									font: "Arial",
								}),
							],
						}),
					],
				}),
			],
		})
	}

	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		layout: TableLayoutType.FIXED,
		rows: [
			createHeaderRow(),
			createDataRow("Personal", budget.despeses.personalEur),
			createDataRow("Despeses indirectes", budget.despeses.despesesIndirectesEur),
			createDataRow("TOTAL", budget.despeses.totalDespesesEur, true),
		],
	})
}

/**
 * Create subsidy requested table - matches preview exactly
 */
function createSubsidyTable(budget: PreviewData["budget"]): Table {
	if (!budget) return new Table({ rows: [] })

	const cellMargins = {
		top: convertInchesToTwip(0.05),
		bottom: convertInchesToTwip(0.05),
		left: convertInchesToTwip(0.1),
		right: convertInchesToTwip(0.1),
	}

	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		layout: TableLayoutType.FIXED,
		rows: [
			new TableRow({
				children: [
					new TableCell({
						width: { size: 6000, type: WidthType.DXA },
						shading: createTotalRowShading(),
						borders: createTableBorders(),
						verticalAlign: VerticalAlign.CENTER,
						margins: cellMargins,
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: "SUBVENCIÓ SOL·LICITADA (diferència entre ingressos i despeses)",
										bold: true,
										size: 20,
										font: "Arial",
									}),
								],
							}),
						],
					}),
					new TableCell({
						width: { size: 3000, type: WidthType.DXA },
						shading: createTotalRowShading(),
						borders: createTableBorders(),
						verticalAlign: VerticalAlign.CENTER,
						margins: cellMargins,
						children: [
							new Paragraph({
								alignment: AlignmentType.RIGHT,
								children: [
									new TextRun({
										text: budget.subvencioSolEur,
										bold: true,
										size: 20,
										font: "Arial",
									}),
								],
							}),
						],
					}),
				],
			}),
		],
	})
}

// =============================================================================
// MAIN DOCUMENT GENERATOR
// =============================================================================

/**
 * Generate the Informe Tècnic document - mirrors DocumentPreview.tsx exactly
 */
export async function generateInformeTecnicDocument(input: InformeTecnicGenerationInput): Promise<void> {
	const { preFormData, extractedData, documentSections, previewData } = input

	// Build document sections
	const docChildren: (Paragraph | Table)[] = []

	// Document Title - matches preview "INFORME TÈCNIC RELATIU A SUBVENCIÓ DIRECTA"
	docChildren.push(
		new Paragraph({
			children: [
				new TextRun({
					text: "INFORME TÈCNIC RELATIU A SUBVENCIÓ DIRECTA",
					bold: true,
					size: 28, // 14pt
					font: "Arial",
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: { after: 400 },
			border: {
				bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
			},
		})
	)

	// Header data table (Dades Preliminars)
	docChildren.push(createHeaderTable(previewData))
	docChildren.push(new Paragraph({ spacing: { after: 300 } }))

	// Process sections in the exact order shown in preview
	for (const section of documentSections) {
		if (section.id === "step1-antecedents") {
			// ANTECEDENTS A L'INFORME
			docChildren.push(createSectionHeading("ANTECEDENTS A L'INFORME:"))

			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}

			// Budget tables go right after Antecedents (as in preview)
			if (previewData.budget) {
				docChildren.push(new Paragraph({ spacing: { after: 200 } }))
				docChildren.push(createSectionHeading("PRESSUPOST DE L'ACTUACIÓ"))

				// Income table
				docChildren.push(createIncomeTable(previewData.budget))
				docChildren.push(new Paragraph({ spacing: { after: 200 } }))

				// Expenses table
				docChildren.push(createExpensesTable(previewData.budget))
				docChildren.push(new Paragraph({ spacing: { after: 200 } }))

				// Subsidy requested table
				docChildren.push(createSubsidyTable(previewData.budget))
			}
		} else if (section.id === "step2-resultat-objecte") {
			docChildren.push(createSectionHeading("OBJECTE DE LA SUBVENCIÓ"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		} else if (section.id === "step3-descripcio-actuacions") {
			docChildren.push(createSectionHeading("DESCRIPCIÓ DE LES ACTUACIONS"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		} else if (section.id === "step4-motivacio-concessio") {
			docChildren.push(createSectionHeading("MOTIVACIÓ DE LA CONCESSIÓ DE LA SUBVENCIÓ"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		} else if (section.id === "step5-excepcionalitat-concessio") {
			docChildren.push(createSectionHeading("EXCEPCIONALITAT DE LA CONCESSIÓ DE LA SUBVENCIÓ"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		} else if (section.id === "step6-compromisos-corporacio") {
			docChildren.push(createSectionHeading("COMPROMISOS ASSUMITS PER LA CORPORACIÓ"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		} else if (section.id === "step7-consideracions-concessio") {
			docChildren.push(createSectionHeading("CONSIDERACIONS A TENIR EN COMPTE PER A LA CONCESSIÓ DE LA SUBVENCIÓ"))
			const content = stripHtml(section.content)
			const paragraphs = content.split("\n\n").filter((p) => p.trim())
			for (const para of paragraphs) {
				docChildren.push(createParagraph(para.trim()))
			}
		}
	}

	// Date and signature section
	docChildren.push(new Paragraph({ spacing: { after: 600 } }))
	docChildren.push(
		new Paragraph({
			children: [
				new TextRun({
					text: `Barcelona, ${formatDate(new Date().toISOString())}`,
					size: 22,
					font: "Arial",
				}),
			],
			alignment: AlignmentType.RIGHT,
			spacing: { after: 800 },
		})
	)

	docChildren.push(
		new Paragraph({
			children: [
				new TextRun({
					text: "El/La Tècnic/a responsable",
					size: 22,
					font: "Arial",
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: { before: 600 },
		})
	)

	docChildren.push(
		new Paragraph({
			children: [
				new TextRun({
					text: "Signatura",
					size: 22,
					font: "Arial",
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: { before: 400 },
		})
	)

	// Create the document
	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: convertInchesToTwip(1),
							right: convertInchesToTwip(1),
							bottom: convertInchesToTwip(1),
							left: convertInchesToTwip(1),
						},
					},
				},
				children: docChildren,
			},
		],
	})

	// Generate and download the file
	const blob = await Packer.toBlob(doc)
	const filename = `InformeTecnic_${preFormData.numeroExpedient.replace(/\//g, "_")}_${Date.now()}.docx`
	saveAs(blob, filename)
}
