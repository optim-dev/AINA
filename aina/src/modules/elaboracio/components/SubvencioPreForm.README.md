# SubvencioPreForm Component

## Overview

A new form component that collects preliminary data before allowing PDF analysis in the Elaboració module.

## Location

`/aina/src/modules/elaboracio/components/SubvencioPreForm.tsx`

## Features

### Hidden Dropdowns (Collapsible Section)

1. **Tipus de beneficiari** (required)

   - Entitat
   - Ens Local

2. **Tipus d'entitat** (required if "Entitat" is selected)

   - Associació
   - Fundació
   - Federació

3. **Tipus d'actuació** (required)
   - Activitat
   - Esdeveniment
   - Obra

### Header Fields (8 required fields)

1. **Número d'expedient tècnic**
2. **Nom de l'Entitat beneficiària**
3. **NIF**
4. **Actuació objecte de subvenció**
5. **Import total actuació**
6. **Import total subvenció (tècnic)**
7. **Import pagament avançat**
8. **Data presentació sol·licitud**

## Integration

The form is integrated into the `Module2.jsx` page with a two-step workflow:

**Step 1:** User completes the pre-form with all required fields
**Step 2:** PDF upload section becomes available after form submission

## Usage

```jsx
import SubvencioPreForm from "../components/SubvencioPreForm"

;<SubvencioPreForm
	onFormComplete={(data) => {
		console.log("Form data:", data)
		// Enable PDF analysis
	}}
/>
```

## Data Structure

```typescript
interface SubvencioPreFormData {
	// Desplegables
	tipusBeneficiari: "entitat" | "ens-local" | ""
	tipusEntitat: "associacio" | "fundacio" | "federacio" | ""
	tipusActuacio: "activitat" | "esdeveniment" | "obra" | ""

	// Camps capçalera
	numeroExpedient: string
	nomEntitat: string
	nif: string
	actuacioObjecte: string
	importTotalActuacio: string
	importTotalSubvencio: string
	importPagamentAvancat: string
	dataPresentacio: string
}
```

## Validation

- All fields are required
- Form validation ensures all data is collected before enabling PDF upload
- Submit button is disabled until all required fields are filled
- Conditional validation for `tipusEntitat` (only when `tipusBeneficiari` is "entitat")
