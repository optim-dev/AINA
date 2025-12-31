# Guia de Desenvolupament - Component Decret

## Visió General

El component `Decret.tsx` genera el **Decret d'Atorgament de Subvenció Directa**. Segueix la mateixa arquitectura que `InformeTecnic.tsx`: formulari a l'esquerra i vista prèvia editable a la dreta.

## Estructura del Document

El decret es divideix en **tres parts principals**:

| Part | Nom                   | Descripció                                     |
| ---- | --------------------- | ---------------------------------------------- |
| I    | **FETS**              | Antecedents i circumstàncies de la sol·licitud |
| II   | **FONAMENTS DE DRET** | Base legal i normativa aplicable               |
| III  | **RESOLUCIÓ**         | Decisions i condicions de l'atorgament         |

---

## Arquitectura del Codi

### Fitxers Principals

```
aina/src/modules/elaboracio/components/
├── Decret.tsx              # Component principal
├── DocumentPreview.tsx     # Vista prèvia (suporta "decret" i "informe-tecnic")
└── InformeTecnicSection.tsx # Component germà (referència)
```

### Tipus Principals

```typescript
// Part del decret
export type PartDecret = "fets" | "fonaments" | "resolucio"

// Configuració d'un pas
export interface StepConfig {
	id: string
	title: string
	part: PartDecret
	generateContent: (formData: DecretFormData, extractedData: any, informeTecnicData: any, preFormData: any) => string
}

// Tipus d'òrgan emissor (per Step 5)
export type OrganEmissor = "oficina" | "servei" | "gerencia" | null

// Opcions de pressupost (per Step 6)
export type OpcioPressupost = "opcio1" | "opcio2" | null
```

### Arrays de Passos

```typescript
// Part I: FETS
const STEPS_FETS: StepConfig[] = [...]

// Part II: FONAMENTS DE DRET (pendent)
const STEPS_FONAMENTS: StepConfig[] = []

// Part III: RESOLUCIÓ (pendent)
const STEPS_RESOLUCIO: StepConfig[] = []

// Combinació de tots
const ALL_STEPS = [...STEPS_FETS, ...STEPS_FONAMENTS, ...STEPS_RESOLUCIO]
```

---

## Passos Implementats (Part I: FETS)

### Step 1: Aprovació i inici de l'expedient

- **ID:** `step1-aprovacio`
- **Camps:** tipusBeneficiari, nomBeneficiari, denominacioFinancament, numeroExpedient, dataSolicitud (dia/mes/any)

### Step 2: Objecte de la subvenció

- **ID:** `step2-objecte`
- **Camps:** explicacioProjecte, pressupostTotal, recursosPropisImport, altresFinancadorsImport, subvencioSolicitadaImport

### Step 3: Competències de la Diputació

- **ID:** `step3-competencies`
- **Camps:** Cap (text fix)

### Step 4: Objectius de Mandat i línies estratègiques

- **ID:** `step4-objectius`
- **Camps:** nomArea, siglesArea, descripcioLiniesEstrategiques, liniaEstrategicaConcreta

### Step 5: Excepcionalitat i singularitat

- **ID:** `step5-excepcionalitat`
- **Camps:** organEmissorIT, dataInformeTecnic, textVoluntatDiba

### Step 6: Previsió pressupostària i PES

- **ID:** `step6-pressupost`
- **Camps:** opcioPressupost + camps específics per cada opció

---

## Com Afegir un Nou Pas

### 1. Afegir camps a `DecretFormData`

```typescript
export interface DecretFormData {
	// ... camps existents ...

	// Nous camps per al teu pas
	nouCamp1: string
	nouCamp2: string
}
```

### 2. Inicialitzar els camps a `initialFormData`

```typescript
const initialFormData: DecretFormData = {
	// ... camps existents ...
	nouCamp1: "",
	nouCamp2: "",
}
```

### 3. Crear el component del formulari

```typescript
interface StepFormProps {
	formData: DecretFormData
	setFormData: React.Dispatch<React.SetStateAction<DecretFormData>>
	extractedData: any
	informeTecnicData: any
	preFormData: any
}

function StepXForm({ formData, setFormData, extractedData, informeTecnicData, preFormData }: StepFormProps) {
	return (
		<div className='space-y-4 border-t pt-4'>
			<h3 className='font-semibold text-sm'>X. Títol del pas</h3>

			<div className='space-y-2'>
				<Label htmlFor='nouCamp1'>Etiqueta del camp</Label>
				<Input id='nouCamp1' value={formData.nouCamp1} onChange={(e) => setFormData((prev) => ({ ...prev, nouCamp1: e.target.value }))} placeholder='Placeholder...' />
			</div>

			{/* Més camps... */}
		</div>
	)
}
```

### 4. Afegir la configuració del pas a l'array corresponent

```typescript
// Per Part I (FETS)
const STEPS_FETS: StepConfig[] = [
	// ... passos existents ...
	{
		id: "stepX-identificador",
		title: "X. Títol del pas",
		part: "fets", // o "fonaments" o "resolucio"
		generateContent: (formData, extractedData, informeTecnicData, preFormData) => {
			if (!formData.nouCamp1) return ""
			return `<p>Text generat amb ${formData.nouCamp1} i ${formData.nouCamp2}.</p>`
		},
	},
]

// Per Part II (FONAMENTS DE DRET)
const STEPS_FONAMENTS: StepConfig[] = [
	{
		id: "stepX-fonament",
		title: "X. Títol",
		part: "fonaments",
		generateContent: (formData, extractedData, informeTecnicData, preFormData) => {
			return `<p>Contingut del fonament...</p>`
		},
	},
]

// Per Part III (RESOLUCIÓ)
const STEPS_RESOLUCIO: StepConfig[] = [
	{
		id: "stepX-resolucio",
		title: "X. Títol",
		part: "resolucio",
		generateContent: (formData, extractedData, informeTecnicData, preFormData) => {
			return `<p>Contingut de la resolució...</p>`
		},
	},
]
```

### 5. Afegir el component al render

Al JSX principal, dins de la secció corresponent:

```tsx
{/* PART I: FETS */}
<div className='bg-zinc-50 p-3 rounded-lg border'>
  <h2 className='text-sm font-bold text-zinc-600 mb-3'>PART I: FETS</h2>
  {/* ... passos existents ... */}
  <StepXForm formData={formData} setFormData={setFormData} extractedData={extractedData} informeTecnicData={informeTecnicData} preFormData={preFormData} />
</div>

{/* PART II: FONAMENTS DE DRET */}
<div className='bg-zinc-50 p-3 rounded-lg border'>
  <h2 className='text-sm font-bold text-zinc-600 mb-3'>PART II: FONAMENTS DE DRET</h2>
  <StepXFonamentForm ... />
</div>
```

---

## Flux de Dades

```
┌─────────────────────────────────────────────────────────────┐
│                        Module2.jsx                          │
│  - Gestiona l'estat global                                  │
│  - Conté extractedData (dades del PDF)                      │
│  - Conté preFormData (dades pre-formulari)                  │
│  - Recull informeTecnicData via callback                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Decret.tsx                             │
│  Props rebudes:                                             │
│  - extractedData: dades extretes del PDF                    │
│  - informeTecnicData: dades de l'informe tècnic             │
│  - preFormData: dades del pre-formulari                     │
│                                                             │
│  Estat intern:                                              │
│  - formData: DecretFormData (camps del formulari)           │
│  - sections: DocumentSection[] (seccions generades)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DocumentPreview.tsx                       │
│  Props rebudes:                                             │
│  - sections: DocumentSection[] (amb part assignada)         │
│  - documentType: "decret"                                   │
│  - onChange: callback per edicions                          │
│                                                             │
│  Renderitza les tres parts amb capçaleres                   │
└─────────────────────────────────────────────────────────────┘
```

---

## DocumentPreview: Suport per Decret

El component `DocumentPreview.tsx` detecta el `documentType` i renderitza diferent:

```typescript
// Separar seccions per part
const sectionsByPart = {
  fets: sections.filter((s) => s.part === "fets"),
  fonaments: sections.filter((s) => s.part === "fonaments"),
  resolucio: sections.filter((s) => s.part === "resolucio"),
}

// Renderitzar cada part amb capçalera
if (documentType === "decret") {
  return (
    <>
      <h2>PART I: FETS</h2>
      {sectionsByPart.fets.map(...)}

      <h2>PART II: FONAMENTS DE DRET</h2>
      {sectionsByPart.fonaments.map(...)}

      <h2>PART III: RESOLUCIÓ</h2>
      {sectionsByPart.resolucio.map(...)}
    </>
  )
}
```

---

## Patrons Comuns

### Pre-omplir camps des de dades externes

```typescript
useEffect(() => {
	if (informeTecnicData?.nomBeneficiari && !formData.nomBeneficiari) {
		setFormData((prev) => ({
			...prev,
			nomBeneficiari: informeTecnicData.nomBeneficiari,
		}))
	}
}, [informeTecnicData])
```

### Camps amb opcions (RadioGroup)

```typescript
<RadioGroup value={formData.opcio || ""} onValueChange={(value) => setFormData((prev) => ({ ...prev, opcio: value as TipusOpcio }))}>
	<div className='flex items-center space-x-2'>
		<RadioGroupItem value='opcio1' id='opcio1' />
		<Label htmlFor='opcio1'>Primera opció</Label>
	</div>
	<div className='flex items-center space-x-2'>
		<RadioGroupItem value='opcio2' id='opcio2' />
		<Label htmlFor='opcio2'>Segona opció</Label>
	</div>
</RadioGroup>
```

### Camps condicionals

```typescript
{formData.opcio === "opcio1" && (
  <div className='space-y-2'>
    <Label>Camp específic per opció 1</Label>
    <Input ... />
  </div>
)}
```

### Generar contingut HTML

```typescript
generateContent: (formData) => {
	if (!formData.camp) return ""

	return `
    <p><strong>Primer.</strong> ${formData.camp}</p>
    <p>Text addicional amb <em>format</em>.</p>
  `
}
```

---

## Consells

1. **Validació:** Retorna string buit si els camps requerits no estan omplerts
2. **HTML:** Utilitza tags HTML senzills (`<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`)
3. **IDs únics:** Cada pas ha de tenir un `id` únic (ex: `step7-titol`)
4. **Part correcta:** Assigna sempre la `part` correcta ("fets", "fonaments", "resolucio")
5. **Ordre:** L'ordre dins l'array determina l'ordre de renderització

---

## Pendents d'Implementar

- [ ] **Part II: FONAMENTS DE DRET** - Base legal i normativa
- [ ] **Part III: RESOLUCIÓ** - Decisions finals i condicions

---

## Contacte

Per dubtes sobre aquesta guia, contacta amb l'equip de desenvolupament d'Aina.
