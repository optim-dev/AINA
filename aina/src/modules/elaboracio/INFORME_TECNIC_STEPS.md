# Sistema de Passos per a l'Informe Tècnic

Aquest document descriu el sistema modular per afegir nous passos al formulari de l'Informe Tècnic.

## Arquitectura

El sistema es basa en tres elements principals:

1. **`InformeTecnicFormData`**: Interfície que defineix tots els camps del formulari
2. **`STEPS`**: Array de configuracions de cada pas que genera el contingut del document
3. **Components `StepXForm`**: Components de React per a cada pas del formulari

## Fitxers involucrats

- `InformeTecnic.tsx` - Component principal amb formularis i lògica
- `DocumentPreview.tsx` - Vista prèvia del document amb seccions editables

---

## Com afegir un nou pas

### Pas 1: Definir els camps del formulari

Afegir els nous camps a la interfície `InformeTecnicFormData`:

```typescript
export interface InformeTecnicFormData {
	// Step 1: Tipus de subvenció (ja existent)
	tipusSubvencio: TipusSubvencio
	textNomBeneficiari: string
	textOrdreInici: string

	// Step 2: Nous camps
	step2Camp1: string
	step2Camp2: string
	step2Opcio: "opcioA" | "opcioB" | null
}
```

### Pas 2: Inicialitzar els camps

Afegir valors inicials al `useState` del component principal:

```typescript
const [formData, setFormData] = useState<InformeTecnicFormData>({
	// Step 1
	tipusSubvencio: "nominativa",
	textNomBeneficiari: extractedData.ens_solicitant?.nom_ens || "",
	textOrdreInici: "",

	// Step 2 - nous camps
	step2Camp1: "",
	step2Camp2: "",
	step2Opcio: null,
})
```

### Pas 3: Crear la configuració del pas a `STEPS`

Afegir un nou objecte a l'array `STEPS`:

```typescript
const STEPS: StepConfig[] = [
	// Step 1 ja existent...

	{
		id: "step2-nom-del-pas",
		title: "Títol del pas",
		generateContent: (formData) => {
			// Retorna string buit si el pas no està completat
			if (!formData.step2Camp1) return ""

			// Genera el text segons les opcions seleccionades
			if (formData.step2Opcio === "opcioA") {
				return `Text per a l'opció A amb ${formData.step2Camp1}.`
			} else if (formData.step2Opcio === "opcioB") {
				return `Text per a l'opció B amb ${formData.step2Camp1} i ${formData.step2Camp2}.`
			}
			return ""
		},
	},
]
```

### Pas 4: Crear el component del formulari

Crear una funció `StepXForm` seguint el patró existent:

```typescript
function Step2Form({ formData, setFormData, extractedData }: StepFormProps) {
	return (
		<Card className='h-fit'>
			<CardHeader className='pb-3'>
				<CardTitle className='text-base'>2. Títol del pas</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Selector d'opció */}
				<div className='space-y-3'>
					<Label className='font-semibold'>Seleccioneu una opció</Label>
					<RadioGroup value={formData.step2Opcio || ""} onValueChange={(v) => setFormData((prev) => ({ ...prev, step2Opcio: v as any }))}>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='opcioA' id='opcioA' />
							<Label htmlFor='opcioA' className='font-normal cursor-pointer'>
								Opció A
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='opcioB' id='opcioB' />
							<Label htmlFor='opcioB' className='font-normal cursor-pointer'>
								Opció B
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Camp de text condicional */}
				{formData.step2Opcio && (
					<div className='space-y-2'>
						<Label htmlFor='step2-camp1'>Camp 1</Label>
						<Input id='step2-camp1' placeholder='Introduïu el valor...' value={formData.step2Camp1} onChange={(e) => setFormData((prev) => ({ ...prev, step2Camp1: e.target.value }))} />
					</div>
				)}

				{/* Camp addicional només per opcioB */}
				{formData.step2Opcio === "opcioB" && (
					<div className='space-y-2'>
						<Label htmlFor='step2-camp2'>Camp 2</Label>
						<Textarea id='step2-camp2' placeholder='Introduïu el text...' value={formData.step2Camp2} onChange={(e) => setFormData((prev) => ({ ...prev, step2Camp2: e.target.value }))} className='min-h-[60px]' />
					</div>
				)}
			</CardContent>
		</Card>
	)
}
```

### Pas 5: Afegir el component al render

Al `return` del component principal, afegir el nou component:

```tsx
return (
	<div className='grid grid-cols-2 gap-6'>
		<div className='space-y-4'>
			<CardDescription>Introduïu les dades necessàries...</CardDescription>

			{/* Step 1 */}
			<Step1Form formData={formData} setFormData={setFormData} extractedData={extractedData} />

			{/* Step 2 - NOU */}
			<Step2Form formData={formData} setFormData={setFormData} extractedData={extractedData} />

			{/* Step 3, 4, etc. */}
		</div>

		<DocumentPreview sections={documentSections} onChange={handleDocumentChange} />
	</div>
)
```

---

## Components disponibles per als formularis

| Component                           | Ús                                |
| ----------------------------------- | --------------------------------- |
| `RadioGroup` + `RadioGroupItem`     | Selecció exclusiva (un o l'altre) |
| `Input`                             | Camp de text curt (una línia)     |
| `Textarea`                          | Camp de text llarg (multilínia)   |
| `Label`                             | Etiqueta per als camps            |
| `Card`, `CardHeader`, `CardContent` | Contenidor visual del pas         |

---

## Flux de dades

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   StepXForm     │────▶│  formData state  │────▶│      STEPS        │
│   (formulari)   │     │  (InformeTecnic) │     │  generateContent  │
└─────────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                           │
                                                           ▼
                                                 ┌───────────────────┐
                                                 │ documentSections  │
                                                 │     (useMemo)     │
                                                 └─────────┬─────────┘
                                                           │
                                                           ▼
                                                 ┌───────────────────┐
                                                 │ DocumentPreview   │
                                                 │   (editable)      │
                                                 └───────────────────┘
```

---

## Notes importants

1. **Ordre dels passos**: L'ordre a l'array `STEPS` determina l'ordre de les seccions al document
2. **Seccions buides**: Si `generateContent` retorna una string buida, la secció no es mostra al document
3. **Edició manual**: L'usuari pot editar directament el text al `DocumentPreview`
4. **Dades extretes**: Utilitza `extractedData` per pre-omplir camps amb dades de la sol·licitud
