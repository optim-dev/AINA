/**
 * @typedef {import('jspdf').default} jsPDF
 */

/**
 * @typedef {Object} TableColumn
 * @property {string} header
 * @property {number} width
 * @property {'left'|'center'|'right'} [align]
 */

/**
 * @typedef {Object} TableRow
 * @property {string[]} cells
 */

export class PDFTableUtils {
	/**
	 * @param {jsPDF} doc
	 * @param {number} margin
	 * @param {number} contentWidth
	 */
	constructor(doc, margin, contentWidth) {
		this.doc = doc
		this.margin = margin
		this.contentWidth = contentWidth
	}

	/**
	 * @param {string} text
	 * @returns {string}
	 */
	cleanText(text) {
		return text
			.replace(/[^\x20-\x7E\u00C0-\u017F]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	}

	/**
	 * @param {TableColumn[]} columns
	 * @param {TableRow[]} rows
	 * @param {number} startY
	 * @param {Object} options
	 * @returns {number}
	 */
	drawTable(
		columns,
		rows,
		startY,
		options = {}
	) {
		const {
			headerHeight = 12,
			rowHeight = 10,
			fontSize = 8,
			headerFontSize = 9,
			maxRowsPerPage = 20,
		} = options

		let currentY = startY

		const totalTableWidth = Math.min(
			this.contentWidth,
			columns.reduce((sum, col) => sum + col.width, 0)
		)

		const scaleFactor = this.contentWidth / totalTableWidth
		const scaledColumns = columns.map((col) => ({
			...col,
			width: col.width * scaleFactor,
		}))

		this.drawTableHeader(scaledColumns, currentY, headerHeight, headerFontSize)
		currentY += headerHeight

		let rowCount = 0
		for (const row of rows) {
			if (rowCount >= maxRowsPerPage) {
				break
			}

			this.drawTableRow(scaledColumns, row, currentY, rowHeight, fontSize)
			currentY += rowHeight
			rowCount++
		}

		this.drawTableBorders(scaledColumns, startY, currentY)

		return currentY
	}

	/**
	 * @param {TableColumn[]} columns
	 * @param {number} y
	 * @param {number} height
	 * @param {number} fontSize
	 */
	drawTableHeader(columns, y, height, fontSize) {
		this.doc.setFillColor(223, 231, 230)
		this.doc.rect(this.margin, y, this.contentWidth, height, "F")

		this.doc.setFontSize(fontSize)
		this.doc.setTextColor(28, 28, 28)
		this.doc.setFont("helvetica", "bold")

		let currentX = this.margin
		columns.forEach((column) => {
			const cleanHeader = this.cleanText(column.header)
			const lines = this.doc.splitTextToSize(cleanHeader, column.width - 4)

			let textX = currentX + 2
			if (column.align === "center") {
				textX = currentX + column.width / 2
			} else if (column.align === "right") {
				textX = currentX + column.width - 2
			}

			this.doc.text(lines[0] || "", textX, y + height - 3, {
				align: column.align || "left",
			})

			currentX += column.width
		})
	}

	/**
	 * @param {TableColumn[]} columns
	 * @param {TableRow} row
	 * @param {number} y
	 * @param {number} height
	 * @param {number} fontSize
	 */
	drawTableRow(columns, row, y, height, fontSize) {
		this.doc.setFontSize(fontSize)
		this.doc.setTextColor(28, 28, 28)
		this.doc.setFont("helvetica", "normal")

		let currentX = this.margin
		columns.forEach((column, index) => {
			if (index < row.cells.length) {
				const cleanCell = this.cleanText(row.cells[index])
				const lines = this.doc.splitTextToSize(cleanCell, column.width - 4)

				let textX = currentX + 2
				if (column.align === "center") {
					textX = currentX + column.width / 2
				} else if (column.align === "right") {
					textX = currentX + column.width - 2
				}

				this.doc.text(lines[0] || "", textX, y + height - 3, {
					align: column.align || "left",
				})
			}

			currentX += column.width
		})
	}

	/**
	 * @param {TableColumn[]} columns
	 * @param {number} startY
	 * @param {number} endY
	 */
	drawTableBorders(columns, startY, endY) {
		this.doc.setDrawColor(200, 200, 200)
		this.doc.setLineWidth(0.5)

		this.doc.rect(this.margin, startY, this.contentWidth, endY - startY)

		let currentX = this.margin
		columns.forEach((column, index) => {
			if (index > 0) {
				this.doc.line(currentX, startY, currentX, endY)
			}
			currentX += column.width
		})
	}

	/**
	 * @param {Array<{criterion: string, proposals: Array<{proposalName: string, companyName: string|null, score: string, position: number}>}>} criteriaComparisons
	 * @param {string[]} proposalNames
	 * @param {number} startY
	 * @returns {number}
	 */
	createComparisonTable(criteriaComparisons, proposalNames, startY) {
		const cleanProposalNames = proposalNames.map((name) => this.cleanText(name))

		const criterionColWidth = Math.min(80, this.contentWidth * 0.5)
		const proposalColWidth = (this.contentWidth - criterionColWidth) / proposalNames.length

		const columns = [
			{ header: "Criteri", width: criterionColWidth, align: "left" },
			...cleanProposalNames.map((name) => ({
				header: name,
				width: proposalColWidth,
				align: "center",
			})),
		]

		const rows = criteriaComparisons.map((criterionComp) => {
			const cells = [criterionComp.criterion]

			criterionComp.proposals.forEach((proposal) => {
				const positionIcon = this.getPositionText(proposal.position)
				const scoreText = this.getScoreText(proposal.score)
				cells.push(`${positionIcon} ${scoreText}`)
			})

			return { cells }
		})

		return this.drawTable(columns, rows, startY, {
			headerHeight: 15,
			rowHeight: 16,
			fontSize: 7,
			headerFontSize: 8,
			maxRowsPerPage: 25,
		})
	}

	/**
	 * @param {number} position
	 * @returns {string}
	 */
	getPositionText(position) {
		switch (position) {
			case 1:
				return "1r"
			case 2:
				return "2n"
			case 3:
				return "3r"
			default:
				return `${position}è`
		}
	}

	/**
	 * @param {string} score
	 * @returns {string}
	 */
	getScoreText(score) {
		switch (score) {
			case "COMPLEIX_EXITOSAMENT":
				return "COMP"
			case "REGULAR":
				return "REG"
			case "INSUFICIENT":
				return "INS"
			default:
				return score.substring(0, 4)
		}
	}
}
