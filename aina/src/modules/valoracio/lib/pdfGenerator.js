import jsPDF from "jspdf"
import { PDFTableUtils } from "./pdfTableUtils"
import { STRINGS } from "./strings"

/**
 * @typedef {import('../types').EvaluationResult} EvaluationResult
 * @typedef {import('../types').LotEvaluation} LotEvaluation
 * @typedef {import('../types').ProposalComparison} ProposalComparison
 * @typedef {Object} BasicInfo
 * @property {string} title
 * @property {string} expedient
 * @property {string} entity
 * @property {string} context
 */

const getDisplayName = (companyName, proposalName) => {
	return companyName && companyName.trim().length > 0 ? companyName : proposalName
}

const hasCompanyInfo = (evaluation) => {
	return evaluation.companyName && evaluation.companyName.trim().length > 0
}

const getCompanyNameOrDefault = (companyName, defaultName) => {
	return companyName && companyName.trim().length > 0 ? companyName : defaultName
}

export class PDFGeneratorService {
	/**
	 * @param {Object} translations
	 */
	constructor(translations) {
		this.doc = new jsPDF()
		this.pageWidth = this.doc.internal.pageSize.getWidth()
		this.pageHeight = this.doc.internal.pageSize.getHeight()
		this.margin = 20
		this.contentWidth = this.pageWidth - 2 * this.margin
		this.currentY = 25
		this.t = translations
	}

	/**
	 * Normalize basicInfo with defaults for empty fields
	 * @param {BasicInfo} basicInfo
	 * @returns {BasicInfo}
	 */
	normalizeBasicInfo(basicInfo) {
		return {
			title: basicInfo.title || "Licitació",
			expedient: basicInfo.expedient || `EXP-${Date.now().toString().slice(-8)}`,
			entity: basicInfo.entity || "",
			context: basicInfo.context || "",
		}
	}

	formatDate(date = new Date()) {
		return date.toLocaleDateString("ca-ES")
	}

	getScoreText(score) {
		const scoreTexts = {
			COMPLEIX_EXITOSAMENT: "Compleix exitosament",
			REGULAR: "Regular",
			INSUFICIENT: "Insuficient",
		}
		return scoreTexts[score] || score
	}

	getPositionText(position) {
		if (position === 1) return "1r"
		if (position === 2) return "2n"
		if (position === 3) return "3r"
		return `${position}è`
	}

	/**
	 * @param {EvaluationResult} evaluationResult
	 * @param {BasicInfo} basicInfo
	 * @param {LotEvaluation} [specificEvaluation]
	 */
	generateEvaluationReport(evaluationResult, basicInfo, specificEvaluation) {
		const normalizedInfo = this.normalizeBasicInfo(basicInfo)

		this.addFirstPageTitle()
		this.currentY = 90

		if (specificEvaluation) {
			this.addGeneralInfoForSingleEvaluation(normalizedInfo, specificEvaluation)
			this.addSingleEvaluationContent(specificEvaluation)
		} else {
			this.addGeneralInfo(normalizedInfo, evaluationResult)

			if (evaluationResult.overallSummary && evaluationResult.overallSummary.trim()) {
				this.addOverallSummary(evaluationResult)
			}

			this.addLotsEvaluation(evaluationResult)

			if (evaluationResult.overallRecommendation && evaluationResult.overallRecommendation.trim()) {
				this.addOverallRecommendation(evaluationResult)
			}
		}

		this.addAIDeclaration()
		this.addFooter()

		const fileName = specificEvaluation ? this.generateFileName(normalizedInfo, specificEvaluation) : `avaluacio_${normalizedInfo.expedient}_${new Date().toISOString().split("T")[0]}.pdf`

		this.doc.save(fileName)
	}

	/**
	 * @param {ProposalComparison} comparison
	 * @param {BasicInfo} basicInfo
	 */
	generateComparisonReport(comparison, basicInfo) {
		const normalizedInfo = this.normalizeBasicInfo(basicInfo)

		this.addFirstPageTitle()
		this.currentY = 90

		this.addComparisonGeneralInfo(normalizedInfo, comparison)
		this.addComparisonSummary(comparison)
		this.addGlobalRanking(comparison)
		this.addCriteriaComparisonTable(comparison)
		this.addDetailedCriteriaAnalysis(comparison)

		this.addAIDeclaration()
		this.addFooter()

		const fileName = `comparacio_lot_${comparison.lotNumber}_${new Date().toISOString().split("T")[0]}.pdf`
		this.doc.save(fileName)
	}

	addAIDeclaration() {
		const declarationText =
			"Declaració sobre l'ús d'intel·ligència artificial: Aquest informe ha estat generat parcialment mitjançant l'ús d'un sistema d'intel·ligència artificial, en compliment del Reglament (UE) 2024/1083 del Parlament Europeu i del Consell. El sistema utilitzat no actua de manera autònoma ni substitueix la responsabilitat humana. El contingut ha de ser revisat abans de prendre decisions vinculants, i no pot ser emprat com a documentació definitiva sense aquesta revisió."

		const lines = this.doc.splitTextToSize(declarationText, this.contentWidth)
		const totalSpaceNeeded = 30 + lines.length * 4

		const footerSpace = 60
		if (this.currentY + totalSpaceNeeded > this.pageHeight - footerSpace) {
			this.addFooter()
			this.doc.addPage()
			this.addSmallHeader()
			this.currentY = 60
		}

		this.currentY += 10

		this.doc.setDrawColor(200, 200, 200)
		this.doc.setLineWidth(0.5)
		this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
		this.currentY += 10

		this.doc.setFontSize(9)
		this.doc.setTextColor(100, 100, 100)
		this.doc.setFont("helvetica", "italic")

		this.doc.text(lines, this.margin, this.currentY)
		this.currentY += lines.length * 4 + 20
	}

	/**
	 * @param {BasicInfo} basicInfo
	 * @param {LotEvaluation} evaluation
	 * @returns {string}
	 */
	generateFileName(basicInfo, evaluation) {
		const dateStr = new Date().toISOString().split("T")[0]
		const companyPart = getCompanyNameOrDefault(evaluation.companyName, `proposta_${evaluation.proposalName.substring(0, 20)}`)
		const cleanCompanyPart = this.cleanFileName(companyPart)

		return `avaluacio_${basicInfo.expedient}_${cleanCompanyPart}_${dateStr}.pdf`
	}

	/**
	 * @param {number} lotNumber
	 * @param {string} lotTitle
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} maxWidth
	 * @returns {number}
	 */
	addLotInfoWithLineBreak(lotNumber, lotTitle, startX, startY, maxWidth) {
		const fullLotText = `${lotNumber} - ${lotTitle}`
		const lines = this.doc.splitTextToSize(fullLotText, maxWidth)
		this.doc.text(lines, startX, startY)
		return lines.length * 5
	}

	/**
	 * @param {LotEvaluation} evaluation
	 */
	addSingleEvaluationContent(evaluation) {
		this.checkPageBreak(30)
		this.addSectionTitle("AVALUACIÓ DETALLADA")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "bold")
		this.doc.text("Resum de la Proposta:", this.margin, this.currentY)
		this.currentY += 8

		this.doc.setFont("helvetica", "normal")
		const summaryHeight = this.addFormattedText(evaluation.summary, this.margin, this.currentY, this.contentWidth)
		this.currentY += summaryHeight + 15

		if (evaluation.criteria.length > 0) {
			this.addSubSectionTitle("CRITERIS AVALUATS")

			evaluation.criteria.forEach((criterion, index) => {
				this.checkPageBreak(80)
				this.addCriterionEvaluation(criterion, index + 1)
			})
		}

		const lines = this.doc.splitTextToSize(evaluation.recommendation, this.contentWidth)
		const totalSpaceNeeded = 12 + 10 + lines.length * 5 + 10

		this.checkPageBreak(totalSpaceNeeded)

		this.doc.setFontSize(12)
		this.doc.setTextColor(3, 105, 161)
		this.doc.setFont("helvetica", "bold")
		this.doc.text("Anàlisi de la Proposta:", this.margin, this.currentY)
		this.currentY += 10

		this.doc.setFontSize(10)
		this.doc.setTextColor(3, 105, 161)
		this.doc.setFont("helvetica", "normal")
		const recommendationHeight = this.addFormattedText(evaluation.recommendation, this.margin, this.currentY, this.contentWidth)
		this.currentY += recommendationHeight + 10
	}

	/**
	 * @param {BasicInfo} basicInfo
	 * @param {LotEvaluation} evaluation
	 */
	addGeneralInfoForSingleEvaluation(basicInfo, evaluation) {
		this.addSectionTitle("INFORMACIÓ GENERAL")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "normal")

		const displayName = getDisplayName(evaluation.companyName, evaluation.proposalName)
		const showCompanyInfo = hasCompanyInfo(evaluation)

		const lotText = `Lot ${evaluation.lotNumber}: ${evaluation.lotTitle}`

		const infoItems = [
			["Títol:", basicInfo.title],
			["Expedient:", basicInfo.expedient],
			["Entitat Contractant:", basicInfo.entity || "No especificat"],
			["Data d'avaluació:", this.formatDate()],
			[showCompanyInfo ? "Empresa avaluada:" : "Document avaluat:", displayName],
			["Lot:", lotText],
			["Criteris avaluats:", evaluation.criteria.length.toString()],
			["Identificació empresa:", showCompanyInfo ? displayName : "No identificada automàticament"],
		]

		infoItems.forEach(([label, value]) => {
			this.doc.setFont("helvetica", "bold")
			this.doc.text(label, this.margin, this.currentY)
			this.doc.setFont("helvetica", "normal")

			const valueHeight = this.addWrappedText(value, this.margin + 80, this.currentY, this.contentWidth - 80)
			this.currentY += Math.max(6, valueHeight + 1)
		})

		if (basicInfo.context) {
			this.currentY += 5
			this.doc.setFont("helvetica", "bold")
			this.doc.text("Context Addicional:", this.margin, this.currentY)
			this.currentY += 5
			this.doc.setFont("helvetica", "normal")
			const contextHeight = this.addWrappedText(basicInfo.context, this.margin, this.currentY, this.contentWidth)
			this.currentY += contextHeight + 5
		}

		this.currentY += 20
	}

	/**
	 * @param {BasicInfo} basicInfo
	 * @param {ProposalComparison} comparison
	 */
	addComparisonGeneralInfo(basicInfo, comparison) {
		this.addSectionTitle("INFORMACIÓ GENERAL")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "normal")

		const displayNames = comparison.proposalNames.map((name, index) => {
			const companyName = comparison.companyNames[index]
			return this.cleanFileName(getDisplayName(companyName, name))
		})

		const companiesIdentified = comparison.companyNames.filter((name) => name !== null && name.trim().length > 0).length

		const infoItems = [
			["Títol:", basicInfo.title],
			["Expedient:", basicInfo.expedient],
			["Entitat Contractant:", basicInfo.entity || "No especificat"],
			["Data d'avaluació:", this.formatDate()],
			["Propostes comparades:", displayNames.join(", ")],
			["Empreses identificades:", `${companiesIdentified}/${comparison.proposalNames.length}`],
		]

		infoItems.forEach(([label, value]) => {
			this.doc.setFont("helvetica", "bold")
			this.doc.text(label, this.margin, this.currentY)
			this.doc.setFont("helvetica", "normal")
			const valueHeight = this.addWrappedText(value, this.margin + 100, this.currentY, this.contentWidth - 100)
			this.currentY += Math.max(6, valueHeight + 1)
		})

		this.doc.setFont("helvetica", "bold")
		this.doc.text("Lot comparat:", this.margin, this.currentY)
		this.doc.setFont("helvetica", "normal")

		const lotHeight = this.addLotInfoWithLineBreak(comparison.lotNumber, comparison.lotTitle, this.margin + 100, this.currentY, this.contentWidth - 100)
		this.currentY += Math.max(6, lotHeight + 1)
	}

	/**
	 * @param {ProposalComparison} comparison
	 */
	addGlobalRanking(comparison) {
		this.checkPageBreak(50)
		this.addSectionTitle("RÀNKING GLOBAL D'EMPRESES")

		comparison.globalRanking.forEach((ranking) => {
			this.checkPageBreak(80)

			const displayName = this.cleanFileName(getDisplayName(ranking.companyName, ranking.proposalName))
			const showCompanyInfo = ranking.companyName !== null && ranking.companyName.trim().length > 0

			this.doc.setFontSize(12)
			this.doc.setTextColor(25, 152, 117)
			this.doc.setFont("helvetica", "bold")

			const positionIcon = this.getPositionText(ranking.position)
			const companyStatus = showCompanyInfo ? "[EMPRESA]" : "[DOCUMENT]"
			this.doc.text(`${positionIcon} - ${displayName} ${companyStatus}`, this.margin, this.currentY)
			this.currentY += 8

			this.doc.setFontSize(10)
			this.doc.setTextColor(60, 60, 60)
			this.doc.setFont("helvetica", "bold")
			this.doc.text(`Puntuació Global: ${ranking.overallScore}`, this.margin, this.currentY)
			this.currentY += 8

			if (!showCompanyInfo) {
				this.doc.setFontSize(9)
				this.doc.setTextColor(140, 140, 140)
				this.doc.setFont("helvetica", "italic")
				this.doc.text("Nota: Empresa no identificada automàticament", this.margin, this.currentY)
				this.currentY += 6
			}

			if (ranking.strengths.length > 0) {
				this.doc.setFont("helvetica", "bold")
				this.doc.setTextColor(25, 152, 117)
				this.doc.text("Punts Forts:", this.margin, this.currentY)
				this.currentY += 5

				this.doc.setFont("helvetica", "normal")
				this.doc.setTextColor(24, 136, 105)
				ranking.strengths.forEach((strength) => {
					const strengthHeight = this.addWrappedText(`• ${strength}`, this.margin + 5, this.currentY, this.contentWidth - 5)
					this.currentY += Math.max(5, strengthHeight)
				})
				this.currentY += 3
			}

			if (ranking.weaknesses.length > 0) {
				this.doc.setFont("helvetica", "bold")
				this.doc.setTextColor(220, 38, 38)
				this.doc.text("Punts Febles:", this.margin, this.currentY)
				this.currentY += 5

				this.doc.setFont("helvetica", "normal")
				this.doc.setTextColor(185, 28, 28)
				ranking.weaknesses.forEach((weakness) => {
					const weaknessHeight = this.addWrappedText(`• ${weakness}`, this.margin + 5, this.currentY, this.contentWidth - 5)
					this.currentY += Math.max(5, weaknessHeight)
				})
				this.currentY += 3
			}

			this.doc.setFontSize(10)
			this.doc.setTextColor(3, 105, 161)
			this.doc.setFont("helvetica", "bold")
			this.doc.text("Recomanacions:", this.margin, this.currentY)
			this.currentY += 5

			this.doc.setFont("helvetica", "normal")
			const recHeight = this.addFormattedText(ranking.recommendation, this.margin, this.currentY, this.contentWidth)
			this.currentY += recHeight + 10

			this.doc.setDrawColor(200, 200, 200)
			this.doc.setLineWidth(0.5)
			this.doc.line(this.margin, this.currentY + 5, this.pageWidth - this.margin, this.currentY + 5)
			this.currentY += 15
		})
	}

	/**
	 * @param {ProposalComparison} comparison
	 */
	addCriteriaComparisonTable(comparison) {
		this.checkPageBreak(80)
		this.addSectionTitle("TAULA COMPARATIVA PER CRITERIS")

		const tableUtils = new PDFTableUtils(this.doc, this.margin, this.contentWidth)

		const displayNames = comparison.proposalNames.map((name, index) => {
			const companyName = comparison.companyNames[index]
			const displayName = getDisplayName(companyName, name)
			const showCompanyInfo = companyName !== null && companyName.trim().length > 0

			const shortName = displayName.length > 20 ? `${displayName.substring(0, 17)}...` : displayName

			return showCompanyInfo ? `${shortName} [E]` : `${shortName} [D]`
		})

		const endY = tableUtils.createComparisonTable(comparison.criteriaComparisons, displayNames, this.currentY)

		this.currentY = endY + 10
		this.doc.setFontSize(8)
		this.doc.setTextColor(100, 100, 100)
		this.doc.setFont("helvetica", "italic")
		this.doc.text("[E] = Empresa identificada | [D] = Document sense empresa", this.margin, this.currentY)
		this.currentY += 15
	}

	/**
	 * @param {ProposalComparison} comparison
	 */
	addDetailedCriteriaAnalysis(comparison) {
		this.checkPageBreak(50)
		this.addSectionTitle("ANÀLISI DETALLADA PER CRITERIS")

		comparison.criteriaComparisons.forEach((criterionComp, index) => {
			this.checkPageBreak(80)

			this.doc.setFontSize(12)
			this.doc.setTextColor(0, 0, 0)
			this.doc.setFont("helvetica", "bold")
			const titleHeight = this.addWrappedText(`${index + 1}. ${criterionComp.criterion}`, this.margin, this.currentY, this.contentWidth)
			this.currentY += titleHeight + 8

			criterionComp.proposals.forEach((proposal) => {
				this.checkPageBreak(40)

				const displayName = this.cleanFileName(getDisplayName(proposal.companyName, proposal.proposalName))
				const showCompanyInfo = proposal.companyName !== null && proposal.companyName.trim().length > 0

				this.doc.setFontSize(10)
				this.doc.setTextColor(25, 152, 117)
				this.doc.setFont("helvetica", "bold")

				const positionIcon = this.getPositionText(proposal.position)
				const scoreText = this.getScoreText(proposal.score)
				const companyStatus = showCompanyInfo ? "[EMPRESA]" : "[DOCUMENT]"
				this.doc.text(`${positionIcon} ${displayName} ${companyStatus} - ${scoreText}`, this.margin, this.currentY)
				this.currentY += 8

				if (!showCompanyInfo) {
					this.doc.setFontSize(9)
					this.doc.setTextColor(140, 140, 140)
					this.doc.setFont("helvetica", "italic")
					this.doc.text("Nota: Empresa no identificada automàticament", this.margin + 5, this.currentY)
					this.currentY += 6
				}

				this.doc.setFontSize(9)
				this.doc.setTextColor(60, 60, 60)
				this.doc.setFont("helvetica", "normal")

				proposal.arguments.forEach((argument) => {
					const argHeight = this.addWrappedText(`• ${argument}`, this.margin + 5, this.currentY, this.contentWidth - 5)
					this.currentY += Math.max(5, argHeight)
				})

				this.currentY += 5
			})

			this.doc.setDrawColor(200, 200, 200)
			this.doc.setLineWidth(0.5)
			this.doc.line(this.margin, this.currentY + 5, this.pageWidth - this.margin, this.currentY + 5)
			this.currentY += 15
		})
	}

	/**
	 * @param {BasicInfo} basicInfo
	 * @param {EvaluationResult} evaluationResult
	 */
	addGeneralInfo(basicInfo, evaluationResult) {
		this.addSectionTitle("INFORMACIÓ GENERAL")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "normal")

		const totalCriteria = evaluationResult.lots.reduce((sum, lot) => sum + lot.criteria.length, 0)

		const companiesIdentified = evaluationResult.lots.filter((lot) => lot.hasProposal && hasCompanyInfo(lot)).length

		const totalProposals = evaluationResult.lots.filter((lot) => lot.hasProposal).length

		const infoItems = [
			["Títol:", basicInfo.title],
			["Expedient:", basicInfo.expedient],
			["Entitat Contractant:", basicInfo.entity || "No especificat"],
			["Data d'avaluació:", this.formatDate()],
			["Lots avaluats:", evaluationResult.extractedLots.length.toString()],
			["Total propostes avaluades:", totalProposals.toString()],
			["Empreses identificades:", `${companiesIdentified}/${totalProposals}`],
			["Total criteris avaluats:", totalCriteria.toString()],
		]

		infoItems.forEach(([label, value]) => {
			this.doc.setFont("helvetica", "bold")
			this.doc.text(label, this.margin, this.currentY)
			this.doc.setFont("helvetica", "normal")
			const valueHeight = this.addWrappedText(value, this.margin + 50, this.currentY, this.contentWidth - 50)
			this.currentY += Math.max(6, valueHeight + 1)
		})

		if (basicInfo.context) {
			this.currentY += 5
			this.doc.setFont("helvetica", "bold")
			this.doc.text("Context Addicional:", this.margin, this.currentY)
			this.currentY += 5
			this.doc.setFont("helvetica", "normal")
			const contextHeight = this.addWrappedText(basicInfo.context, this.margin, this.currentY, this.contentWidth)
			this.currentY += contextHeight + 5
		}

		this.currentY += 20
	}

	/**
	 * @param {EvaluationResult} evaluationResult
	 */
	addLotsEvaluation(evaluationResult) {
		const hasMultipleLots = evaluationResult.extractedLots.length > 1

		const evaluationsByLot = new Map()
		evaluationResult.lots.forEach((evaluation) => {
			if (!evaluationsByLot.has(evaluation.lotNumber)) {
				evaluationsByLot.set(evaluation.lotNumber, [])
			}
			evaluationsByLot.get(evaluation.lotNumber).push(evaluation)
		})

		evaluationResult.extractedLots.forEach((lotInfo) => {
			const lotEvaluations = evaluationsByLot.get(lotInfo.lotNumber) || []

			this.checkPageBreak(50)

			if (hasMultipleLots) {
				this.addSectionTitle(`LOT ${lotInfo.lotNumber}: ${lotInfo.title}`)
			} else {
				this.addSectionTitle("AVALUACIÓ DETALLADA PER CRITERIS")
			}

			if (lotEvaluations.length === 0) {
				this.doc.setFillColor(255, 243, 205)
				this.doc.rect(this.margin, this.currentY - 2.5, this.contentWidth, 20, "F")

				this.doc.setFontSize(10)
				this.doc.setTextColor(133, 100, 4)
				this.doc.setFont("helvetica", "bold")
				this.doc.text("No s'ha presentat proposta per aquest lot", this.margin + 5, this.currentY + 5)
				this.currentY += 25
				return
			}

			lotEvaluations.forEach((evaluation) => {
				const displayName = getDisplayName(evaluation.companyName, evaluation.proposalName)
				const showCompanyInfo = hasCompanyInfo(evaluation)

				if (lotEvaluations.length > 1) {
					this.checkPageBreak(20)
					const companyStatus = showCompanyInfo ? "[EMPRESA]" : "[DOCUMENT]"
					this.addSubSectionTitle(`${displayName} ${companyStatus}`)

					if (!showCompanyInfo) {
						this.doc.setFontSize(9)
						this.doc.setTextColor(140, 140, 140)
						this.doc.setFont("helvetica", "italic")
						this.doc.text("Nota: Empresa no identificada automàticament", this.margin, this.currentY)
						this.currentY += 8
					}
				}

				if (hasMultipleLots || lotEvaluations.length > 1) {
					this.addSubSectionTitle(lotEvaluations.length > 1 ? `Avaluació - ${displayName}` : "Avaluació per Criteris")
				}

				evaluation.criteria.forEach((criterion, criterionIndex) => {
					this.checkPageBreak(80)
					this.addCriterionEvaluation(criterion, criterionIndex + 1)
				})

				if (hasMultipleLots || lotEvaluations.length > 1) {
					this.checkPageBreak(30)

					this.doc.setFontSize(12)
					this.doc.setTextColor(3, 105, 161)
					this.doc.setFont("helvetica", "bold")
					this.doc.text(lotEvaluations.length > 1 ? `Anàlisi - ${displayName}:` : `Anàlisi per Lot ${evaluation.lotNumber}:`, this.margin, this.currentY)
					this.currentY += 10

					this.doc.setFontSize(10)
					this.doc.setTextColor(3, 105, 161)
					this.doc.setFont("helvetica", "normal")
					const contentHeight = this.addFormattedText(evaluation.recommendation, this.margin, this.currentY, this.contentWidth)
					this.currentY += contentHeight + 10
				} else {
					this.checkPageBreak(30)

					this.doc.setFontSize(12)
					this.doc.setTextColor(3, 105, 161)
					this.doc.setFont("helvetica", "bold")
					this.doc.text("Anàlisi de la Proposta:", this.margin, this.currentY)
					this.currentY += 10

					this.doc.setFontSize(10)
					this.doc.setTextColor(3, 105, 161)
					this.doc.setFont("helvetica", "normal")
					const contentHeight = this.addFormattedText(evaluation.recommendation, this.margin, this.currentY, this.contentWidth)
					this.currentY += contentHeight + 10
				}
			})
		})
	}

	/**
	 * @param {ProposalComparison} comparison
	 */
	addComparisonSummary(comparison) {
		this.checkPageBreak(40)
		this.addSectionTitle("RESUM EXECUTIU DE LA COMPARACIÓ")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "normal")
		const summaryHeight = this.addFormattedText(comparison.summary, this.margin, this.currentY, this.contentWidth)
		this.currentY += summaryHeight + 15
	}

	/**
	 * @param {EvaluationResult} evaluationResult
	 */
	addOverallSummary(evaluationResult) {
		this.checkPageBreak(40)
		this.addSectionTitle("RESUM GENERAL")

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "normal")
		const summaryHeight = this.addFormattedText(evaluationResult.overallSummary, this.margin, this.currentY, this.contentWidth)
		this.currentY += summaryHeight + 15
	}

	/**
	 * @param {EvaluationResult} evaluationResult
	 */
	addOverallRecommendation(evaluationResult) {
		this.checkPageBreak(50)

		this.doc.setFontSize(14)
		this.doc.setTextColor(25, 152, 117)
		this.doc.setFont("helvetica", "bold")
		this.doc.text("ANÀLISI GENERAL", this.margin, this.currentY)
		this.currentY += 12

		this.doc.setFontSize(10)
		this.doc.setTextColor(3, 105, 161)
		this.doc.setFont("helvetica", "normal")

		const lines = this.doc.splitTextToSize(evaluationResult.overallRecommendation, this.contentWidth)
		const contentHeight = lines.length * 5
		this.checkPageBreak(contentHeight + 10)

		this.addFormattedText(evaluationResult.overallRecommendation, this.margin, this.currentY, this.contentWidth)
	}

	/**
	 * @param {number} requiredSpace
	 */
	checkPageBreak(requiredSpace) {
		const footerSpace = 60
		if (this.currentY + requiredSpace > this.pageHeight - footerSpace) {
			this.addFooter()
			this.doc.addPage()
			this.addSmallHeader()
			this.currentY = 60
		}
	}

	/**
	 * @param {string} [customTitle]
	 */
	addFirstPageTitle(customTitle) {
		this.doc.setFontSize(24)
		this.doc.setTextColor(25, 152, 117)
		this.doc.setFont("helvetica", "bold")

		const title = customTitle || "INFORME D'AVALUACIÓ"
		const subtitle = customTitle ? "DE PROPOSTES DE LICITACIÓ" : "DE PROPOSTA DE LICITACIÓ"

		this.doc.text(title, this.pageWidth / 2, 40, {
			align: "center",
		})
		this.doc.text(subtitle, this.pageWidth / 2, 55, {
			align: "center",
		})

		this.doc.setDrawColor(25, 152, 117)
		this.doc.setLineWidth(1)
		this.doc.line(this.margin, 65, this.pageWidth - this.margin, 65)
	}

	addSmallHeader() {
		this.doc.setFontSize(10)
		this.doc.setTextColor(25, 152, 117)
		this.doc.setFont("helvetica", "bold")
		this.doc.text("INFORME D'AVALUACIÓ DE PROPOSTA DE LICITACIÓ", this.margin, 25)

		this.doc.setDrawColor(25, 152, 117)
		this.doc.setLineWidth(0.5)
		this.doc.line(this.margin, 35, this.pageWidth - this.margin, 35)
	}

	addFooter() {
		const footerY = this.pageHeight - 25

		this.doc.setFontSize(8)
		this.doc.setTextColor(100, 100, 100)
		this.doc.setFont("helvetica", "normal")

		this.doc.text("OPTIMPEOPLE S.L.", this.margin, footerY)
		this.doc.text("www.optimpeople.com", this.pageWidth / 2, footerY, {
			align: "center",
		})
		this.doc.text(`Pàgina ${this.doc.getCurrentPageInfo().pageNumber}`, this.pageWidth - this.margin, footerY, { align: "right" })

		this.doc.text("c/Doctor Letamendi, 29, baixos 1a  08031 Barcelona", this.margin, footerY + 8)
		this.doc.text("B67585539", this.pageWidth / 2, footerY + 8, {
			align: "center",
		})
		this.doc.text("+34 650 891 296", this.pageWidth - this.margin, footerY + 8, { align: "right" })

		this.doc.setDrawColor(200, 200, 200)
		this.doc.setLineWidth(0.5)
		this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5)
	}

	/**
	 * @param {string} fileName
	 * @returns {string}
	 */
	cleanFileName(fileName) {
		return fileName
			.replace(/[^\x20-\x7E\u00C0-\u017F]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	}

	/**
	 * @param {string} text
	 * @param {number} x
	 * @param {number} y
	 * @param {number} maxWidth
	 * @param {number} [lineHeight]
	 * @returns {number}
	 */
	addWrappedText(text, x, y, maxWidth, lineHeight = 5) {
		const lines = this.doc.splitTextToSize(text, maxWidth)
		this.doc.text(lines, x, y)
		return lines.length * lineHeight
	}

	/**
	 * @param {string} title
	 */
	addSectionTitle(title) {
		this.doc.setFontSize(14)
		this.doc.setTextColor(25, 152, 117)
		this.doc.setFont("helvetica", "bold")
		this.doc.text(title, this.margin, this.currentY)
		this.currentY += 10
	}

	/**
	 * @param {string} title
	 */
	addSubSectionTitle(title) {
		this.doc.setFontSize(12)
		this.doc.setTextColor(25, 152, 117)
		this.doc.setFont("helvetica", "bold")
		this.doc.text(title, this.margin, this.currentY)
		this.currentY += 8
	}

	/**
	 * @param {string} text
	 * @param {number} x
	 * @param {number} y
	 * @param {number} maxWidth
	 * @param {number} [lineHeight]
	 * @returns {number}
	 */
	addFormattedText(text, x, y, maxWidth, lineHeight = 5) {
		const parts = this.parseFormattedText(text)
		let currentY = y

		for (const part of parts) {
			this.doc.setFont("helvetica", part.isBold ? "bold" : "normal")

			const lines = this.doc.splitTextToSize(part.text, maxWidth)
			this.doc.text(lines, x, currentY)
			currentY += lines.length * lineHeight
		}

		return currentY - y
	}

	/**
	 * @param {string} text
	 * @returns {Array<{text: string, isBold: boolean}>}
	 */
	parseFormattedText(text) {
		const parts = []

		let cleanText = text
			.replace(/\*\s+/g, "")
			.replace(/\s+\*/g, "")
			.replace(/\*{1}([^*]+)\*{1}/g, "$1")
			.replace(/\*{3,}/g, "")

		const regex = /\*\*(.*?)\*\*/g
		let lastIndex = 0
		let match

		while ((match = regex.exec(cleanText)) !== null) {
			if (match.index > lastIndex) {
				const beforeText = cleanText.substring(lastIndex, match.index)
				if (beforeText.trim()) {
					parts.push({ text: beforeText, isBold: false })
				}
			}

			parts.push({ text: match[1], isBold: true })
			lastIndex = regex.lastIndex
		}

		if (lastIndex < cleanText.length) {
			const remainingText = cleanText.substring(lastIndex)
			if (remainingText.trim()) {
				parts.push({ text: remainingText, isBold: false })
			}
		}

		if (parts.length === 0) {
			parts.push({ text: cleanText, isBold: false })
		}

		return parts
	}

	/**
	 * @param {any} criterion
	 * @param {number} index
	 */
	addCriterionEvaluation(criterion, index) {
		this.doc.setFontSize(12)
		this.doc.setTextColor(0, 0, 0)
		this.doc.setFont("helvetica", "bold")
		const criterionTitle = `${index}. ${criterion.criterion}`
		const titleHeight = this.addWrappedText(criterionTitle, this.margin, this.currentY, this.contentWidth)
		this.currentY += titleHeight + 5

		const scoreTexts = {
			COMPLEIX_EXITOSAMENT: "Compleix exitosament",
			REGULAR: "Regular",
			INSUFICIENT: "Insuficient",
		}

		this.doc.setFontSize(10)
		this.doc.setTextColor(0, 0, 0)
		this.doc.setFont("helvetica", "bold")
		this.doc.text(`Puntuació: ${scoreTexts[criterion.score]}`, this.margin, this.currentY)
		this.currentY += 10

		this.doc.setFontSize(10)
		this.doc.setTextColor(60, 60, 60)
		this.doc.setFont("helvetica", "bold")
		this.doc.text("Explicació:", this.margin, this.currentY)
		this.currentY += 5

		this.doc.setFont("helvetica", "normal")
		const justificationHeight = this.addFormattedText(criterion.justification, this.margin, this.currentY, this.contentWidth)
		this.currentY += justificationHeight + 8

		if (criterion.strengths.length > 0) {
			this.checkPageBreak(20 + criterion.strengths.length * 5)

			this.doc.setFontSize(10)
			this.doc.setTextColor(25, 152, 117)
			this.doc.setFont("helvetica", "bold")
			this.doc.text("Punts Forts:", this.margin, this.currentY)
			this.currentY += 5

			this.doc.setFontSize(9)
			this.doc.setTextColor(24, 136, 105)
			this.doc.setFont("helvetica", "normal")

			criterion.strengths.forEach((strength) => {
				this.checkPageBreak(8)
				const strengthHeight = this.addWrappedText(`• ${strength}`, this.margin + 5, this.currentY, this.contentWidth - 5)
				this.currentY += Math.max(5, strengthHeight)
			})

			this.currentY += 5
		}

		if (criterion.improvements.length > 0) {
			this.checkPageBreak(20 + criterion.improvements.length * 5)

			this.doc.setFontSize(10)
			this.doc.setTextColor(220, 38, 38)
			this.doc.setFont("helvetica", "bold")
			this.doc.text("Àrees de Millora:", this.margin, this.currentY)
			this.currentY += 5

			this.doc.setFontSize(9)
			this.doc.setTextColor(185, 28, 28)
			this.doc.setFont("helvetica", "normal")

			criterion.improvements.forEach((improvement) => {
				this.checkPageBreak(8)
				const improvementHeight = this.addWrappedText(`• ${improvement}`, this.margin + 5, this.currentY, this.contentWidth - 5)
				this.currentY += Math.max(5, improvementHeight)
			})

			this.currentY += 5
		}

		if (criterion.references && criterion.references.length > 0) {
			this.checkPageBreak(20)

			const validReferences = criterion.references.filter((ref) => {
				const cleanRef = ref.toLowerCase().trim()
				return !cleanRef.includes("error") && !cleanRef.includes("revisió manual") && !cleanRef.includes("processament automàtic") && cleanRef.length > 10 && cleanRef.length < 200
			})

			if (validReferences.length > 0) {
				this.doc.setFontSize(9)
				this.doc.setTextColor(100, 100, 100)
				this.doc.setFont("helvetica", "italic")

				const referencesText = "Referències: " + validReferences.join(", ")
				const referencesHeight = this.addWrappedText(referencesText, this.margin, this.currentY, this.contentWidth)
				this.currentY += referencesHeight
			}
		}

		this.checkPageBreak(15)
		this.doc.setDrawColor(200, 200, 200)
		this.doc.setLineWidth(0.5)
		this.doc.line(this.margin, this.currentY + 5, this.pageWidth - this.margin, this.currentY + 5)
		this.currentY += 15
	}
}

/**
 * @returns {PDFGeneratorService}
 */
export const createPDFGenerator = () => {
	return new PDFGeneratorService(STRINGS.pdf || {})
}
