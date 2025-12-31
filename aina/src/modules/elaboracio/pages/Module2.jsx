import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/DashboardLayout"
import SubvencioPreForm from "../components/SubvencioPreForm"
import SubvencioUploader from "../components/SubvencioUploader"
import DadesExtretesSection from "../components/DadesExtretesSection"
import InformeTecnicSection from "../components/InformeTecnicSection"
import Decret from "../components/Decret"
import { StepWizard, StepContent } from "../components/StepWizard"
import { elaboracioApiService } from "../lib/apiService"
import { generateInformeTecnicDocument } from "../lib/informeTecnicGenerator"
import { generateDecretDocument } from "../lib/decretGenerator"

export default function Elaboracio() {
	const [preFormData, setPreFormData] = useState(null)
	// const sampleData11839 = `{"dades_generals":{"codi_bdns":"","codi_convocatoria":"","centre_gestor":"Diputació Barcelona","area_servei":"Àrea d'Esports i Activitat Física","titol_projecte":"ADEQUACIÓ PISCINA MUNICIPAL","any_execucio":"","municip_actuacio":"El Pont de Vilomara i Rocafort"},"ens_solicitant":{"nom_ens":"Ajuntament del Pont de Vilomara i Rocafort","nif":"P0818100J","adreca":{"domicili":"Pl Ajuntament, 1","localitat":"El Pont de Vilomara i Rocafort","codi_postal":"08254"},"contacte":{"telefon":"938318811","email":"pont@elpont.cat"},"representant_legal":{"nom_cognoms":"Enric Campàs Serra","carrec":"Alcalde"}},"modalitat_execucio":{"es_ens_instrumental":false,"dades_ens_instrumental":{"nom_rao_social":"","nif":""}},"documentacio_adjunta_check":{"annex_1_memoria":true,"annex_2_pressupost":true,"annex_3_declaracio_subvencions":true,"annex_4_menors":true,"annex_5_excepcionalitat":true},"pressupost":{"ingressos":{"recursos_propis":{"import_eur":0,"detall":[]},"subvencions_altres_admins":{"import_eur":0,"detall":[]},"total_ingressos_eur":0,"altres_ingressos":{"import_eur":0,"detall":[]},"aportacions_privades":{"import_eur":0,"detall":[]}},"despeses":{"personal":{"import_eur":0,"detall":[]},"contractacio_externa":{"import_eur":127798.23,"detall":[{"concepte":"Contractació externa","import_eur":127798.23}]},"material":{"import_eur":13201.77,"detall":[{"concepte":"Material","import_eur":13201.77}]},"total_despeses_eur":141000,"altres_despeses":{"import_eur":0,"detall":[]},"despeses_indirectes":{"import_eur":0,"detall":[]}},"resum":{"subvencio_solicitada_eur":141000}},"destinacio_final_subvencio":{"existeix_transferencia_a_tercers":false,"beneficiaris":[]},"excepcionalitat":{"justificacio_text":"És sol·licita aquest ajut atès que les obres ha realitzar són necessàries per evitar el malbaratament d'aigua en el context de sequera actual i per garantir l'obertura i la correcte prestació del servei públic de la piscina municipal i l'Ajuntament no disposa de fons suficients per poder fer front a la despesa de manera immediata."},"memoria_actuacio":{"titol_actuacions_i_municipi":"ADEQUACIÓ PISCINA MUNICIPAL - El Pont de Vilomara i Rocafort","descripcio_actuacions":"Reparació de les fuites d'aigua de les dues piscines amb el canvi dels dolls d'impulsió, dels desaigües i les seves canalitzacions. Impermeabilització el desbordant de la piscina i canvi de la reixa protectora, vorada a la resta de paraments de les piscines. Canvi de paviment de la zona de platja per material antilliscant i separació de recollida de l'aigua de pluja de l'aigua desbordant. Adquisició d'una cadira elevadora per a persones amb discapacitat o mobilitat reduïda.","objectius_resultats":"Evitar el malbaratament de l'aigua a causa de les fuites. Separació de la recollida d'aigua de pluja de l'aigua desbordant. Condicionament de la zona de platja amb paviment antilliscant per garantir la seguretat dels usuaris/es. Garantir l'accessibilitat de la instal·lació per a tothom.","actuacions_relacionades_objectius":"","pla_treball_calendaritzat":""}}`
	const [extractedData, setExtractedData] = useState(null)
	// const [extractedData, setExtractedData] = useState(sampleData11839 ? JSON.parse(sampleData11839) : null)

	const [isLoading, setIsLoading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [error, setError] = useState(null)

	// Step wizard state
	const [currentStepIndex, setCurrentStepIndex] = useState(0)
	const [stepValidation, setStepValidation] = useState({
		dadesExtretes: false,
		informeTecnic: false,
		decret: false,
	})

	// Track InformeTecnic form data to pass to Decret
	const [informeTecnicData, setInformeTecnicData] = useState(null)

	// Track document data for download (Informe Tècnic)
	const [documentSections, setDocumentSections] = useState([])
	const [previewData, setPreviewData] = useState(null)

	// Track document data for download (Decret)
	const [decretDocumentSections, setDecretDocumentSections] = useState([])
	const [decretPreviewData, setDecretPreviewData] = useState(null)

	// Handle document data change from InformeTecnicSection
	const handleDocumentDataChange = useCallback((sections, preview) => {
		setDocumentSections(sections)
		setPreviewData(preview)
	}, [])

	// Handle document data change from Decret
	const handleDecretDocumentDataChange = useCallback((sections, preview) => {
		setDecretDocumentSections(sections)
		setDecretPreviewData(preview)
	}, [])

	// Download handler for Informe Tècnic
	const handleDownloadInformeTecnic = useCallback(async () => {
		if (!previewData || !preFormData) return
		await generateInformeTecnicDocument({
			preFormData,
			extractedData,
			documentSections,
			previewData,
		})
	}, [preFormData, extractedData, documentSections, previewData])

	// Download handler for Decret
	const handleDownloadDecret = useCallback(async () => {
		if (!decretPreviewData || !preFormData) return
		await generateDecretDocument({
			preFormData,
			extractedData,
			informeTecnicData,
			documentSections: decretDocumentSections,
			previewData: decretPreviewData,
		})
	}, [preFormData, extractedData, informeTecnicData, decretDocumentSections, decretPreviewData])

	// Compute step statuses based on validation state
	const steps = useMemo(
		() => [
			{
				id: "dades-extretes",
				title: "Dades Extretes",
				status: stepValidation.dadesExtretes ? "validated" : currentStepIndex === 0 ? "current" : "pending",
			},
			{
				id: "informe-tecnic",
				title: "Informe Tècnic",
				status: stepValidation.informeTecnic ? "validated" : stepValidation.dadesExtretes && currentStepIndex === 1 ? "current" : stepValidation.dadesExtretes ? "pending" : "locked",
				onDownload: stepValidation.informeTecnic && previewData ? handleDownloadInformeTecnic : undefined,
			},
			{
				id: "decret",
				title: "Decret",
				status: stepValidation.decret ? "validated" : stepValidation.informeTecnic && currentStepIndex === 2 ? "current" : stepValidation.informeTecnic ? "pending" : "locked",
				onDownload: stepValidation.decret && decretPreviewData ? handleDownloadDecret : undefined,
			},
		],
		[currentStepIndex, stepValidation, previewData, handleDownloadInformeTecnic, decretPreviewData, handleDownloadDecret]
	)

	const handleValidateDadesExtretes = () => {
		setStepValidation((prev) => ({ ...prev, dadesExtretes: true }))
		setCurrentStepIndex(1) // Move to next step
	}

	const handleValidateInformeTecnic = () => {
		setStepValidation((prev) => ({ ...prev, informeTecnic: true }))
		setCurrentStepIndex(2) // Move to next step
	}

	const handleValidateDecret = () => {
		setStepValidation((prev) => ({ ...prev, decret: true }))
	}

	const handleStepClick = (index) => {
		// Can only navigate to validated steps or the next available step
		if (index === 0 || (index === 1 && stepValidation.dadesExtretes) || (index === 2 && stepValidation.informeTecnic)) {
			setCurrentStepIndex(index)
		}
	}

	const handlePreFormComplete = (data) => {
		console.log("📋 Pre-form data completed:", data)
		setPreFormData(data)
	}

	const handleFileUploaded = async (file) => {
		try {
			setIsLoading(true)
			setError(null)
			setUploadProgress(0)
			setExtractedData(null)

			console.log("📤 Uploading and extracting subvencio data:", file.name)

			const data = await elaboracioApiService.uploadAndExtractSubvencio(file, (progress) => {
				setUploadProgress(progress)
			})
			console.log("✅ Subvencio data extracted successfully:", data)
			setExtractedData(data)
		} catch (err) {
			console.error("❌ Error extracting subvencio data:", err)
			setError(err.message || "Error processant el document")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<DashboardLayout>
			<div className='space-y-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Elaboració Decrets</h1>
					<p className='text-muted-foreground'>Extracció automàtica de dades de sol·licituds de subvenció amb IA</p>
				</div>

				{/* Step 1: Pre-form data collection - Hidden once data is extracted and wizard is visible */}
				{!(preFormData && extractedData) && <SubvencioPreForm onFormComplete={handlePreFormComplete} />}

				{/* Step 2: PDF Upload - Only enabled after pre-form is completed, hidden after data is extracted */}
				{preFormData && !extractedData && (
					<>
						<SubvencioUploader onFileUploaded={handleFileUploaded} isLoading={isLoading} uploadProgress={uploadProgress} />

						{error && (
							<Card className='border-red-200 bg-red-50'>
								<CardContent className='pt-6'>
									<p className='text-red-600 font-medium'>❌ {error}</p>
								</CardContent>
							</Card>
						)}
					</>
				)}

				{/* Step 3: Display step wizard with 3 steps: Dades Extretes, Informe Tècnic, Decret */}
				{preFormData && extractedData && (
					<StepWizard steps={steps} currentStepIndex={currentStepIndex} onStepClick={handleStepClick}>
						{/* Step 1: Dades Extretes */}
						<StepContent isActive={currentStepIndex === 0}>
							<DadesExtretesSection data={extractedData} preFormData={preFormData} isValidated={stepValidation.dadesExtretes} onValidate={handleValidateDadesExtretes} onDataChange={setExtractedData} />
						</StepContent>

						{/* Step 2: Informe Tècnic */}
						<StepContent isActive={currentStepIndex === 1}>
							<InformeTecnicSection
								preFormData={preFormData}
								extractedData={extractedData}
								isValidated={stepValidation.informeTecnic}
								onValidate={handleValidateInformeTecnic}
								onInformeTecnicDataChange={setInformeTecnicData}
								onDocumentDataChange={handleDocumentDataChange}
								initialFormData={informeTecnicData}
							/>
						</StepContent>

						{/* Step 3: Decret */}
						<StepContent isActive={currentStepIndex === 2}>
							<Decret
								preFormData={preFormData}
								extractedData={extractedData}
								informeTecnicData={informeTecnicData}
								onDocumentDataChange={handleDecretDocumentDataChange}
								isValidated={stepValidation.decret}
								onValidate={handleValidateDecret}
								onDownload={stepValidation.decret && decretPreviewData ? handleDownloadDecret : undefined}
							/>
						</StepContent>
					</StepWizard>
				)}
			</div>
		</DashboardLayout>
	)
}
