# DecretDownloadButton Component

## Descripció

Component que genera i descarrega un decret d'atorgament de subvenció en format PDF amb tota la informació extreta del PDF i proporcionada per l'usuari.

## Ubicació

`/aina/src/modules/elaboracio/components/DecretDownloadButton.tsx`

## Funcionalitat

### Generació del Decret

El component genera un document HTML professional amb l'estructura completa d'un decret d'atorgament que inclou:

#### Seccions del Decret:

1. **Capçalera**

   - Títol del document
   - Centre gestor
   - Número d'expedient

2. **I. Antecedents**

   - Data de presentació
   - Identificació del beneficiari
   - Descripció de l'actuació
   - Context de la sol·licitud

3. **II. Dades del Beneficiari**

   - Nom/Raó social
   - NIF
   - Tipus (Entitat/Ens Local)
   - Representant legal (si disponible)

4. **III. Objecte de la Subvenció**

   - Actuació a realitzar
   - Tipus d'actuació
   - Descripció del projecte

5. **IV. Pressupost i Finançament**

   - Taula amb imports:
     - Pressupost total de l'actuació
     - Import sol·licitat
     - Import de la subvenció atorgada
     - Import pagament avançat

6. **V. Resolució**

   - Text legal de la resolució
   - Acords (Primer, Segon, Tercer)
   - Data de la resolució

7. **Signatura**
   - Espai per a signatura i segell

### Fonts de Dades

El component combina informació de dues fonts:

#### Del `SubvencioPreForm` (dades introduïdes per l'usuari):

- `numeroExpedient`
- `nomEntitat`
- `nif`
- `tipusBeneficiari` / `tipusEntitat`
- `tipusActuacio`
- `actuacioObjecte`
- `importTotalActuacio`
- `importTotalSubvencio`
- `importPagamentAvancat`
- `dataPresentacio`

#### Del PDF analitzat (`extractedData`):

- `subvencio.centre_gestor`
- `subvencio.titol_projecte_actuacio`
- `subvencio.any_execucio_actuacions`
- `subvencio.import_solicitat_eur`
- `subvencio.municipi_realitzacio`
- `ens_public.representant_legal.*`

## Ús

```jsx
import DecretDownloadButton from "../components/DecretDownloadButton"

;<DecretDownloadButton preFormData={preFormData} extractedData={extractedData} />
```

## Props

```typescript
interface DecretDownloadButtonProps {
	preFormData: SubvencioPreFormData
	extractedData: SubvencioData
}
```

## Funcionalitats

### Generació del Document

1. Crea un document HTML amb estils CSS professional
2. Format A4 amb marges adequats
3. Tipografia Times New Roman (formal)
4. Taules amb borders per a informació financera
5. Estructuració clara per seccions

### Descàrrega

El component ofereix dues opcions:

1. **Diàleg d'impressió**: S'obre el diàleg d'impressió del navegador on l'usuari pot:

   - Guardar com a PDF
   - Imprimir directament
   - Configurar la pàgina

2. **Descàrrega HTML**: També es genera un fitxer HTML descarregable amb nom:
   - Format: `Decret_{numeroExpedient}_{timestamp}.html`
   - Es pot obrir posteriorment i convertir a PDF

### Formatació

#### Imports monetaris

- Format: Català (ca-ES)
- Moneda: EUR (€)
- Exemple: 15.000,00 €

#### Dates

- Format: Català (ca-ES)
- Estil: dia de mes de any
- Exemple: 27 d'octubre de 2025

## Estils Visuals

### Component UI

- Caixa destacada amb fons blau clar
- Icona de document
- Títol i descripció
- Botó prominent amb icona de descàrrega
- Estat de càrrega amb spinner
- Nota informativa sobre el procés

### Document PDF

- Capçalera amb border inferior
- Seccions amb títols subratllats
- Taula amb capçalera grisa
- Imports destacats en negreta
- Espai per signatura al final

## Estats

- **Normal**: Botó actiu per descarregar
- **Generant**: Spinner mentre es processa
- **Error**: Alert si falla la generació

## Millores Futures Possibles

1. **Generació PDF al Backend**: Utilitzar una llibreria com Puppeteer o wkhtmltopdf per generar PDFs directament
2. **Plantilles Personalitzables**: Permetre diferents plantilles segons el tipus d'actuació
3. **Marca d'aigua**: Afegir logos oficials i marques d'aigua
4. **Signatura Digital**: Integració amb sistemes de signatura electrònica
5. **Múltiples idiomes**: Suport per català, castellà, etc.
6. **Preview**: Previsualització del document abans de descarregar

## Notes Tècniques

- El component utilitza un `iframe` temporal per renderitzar el HTML abans de descarregar
- Compatible amb tots els navegadors moderns
- No requereix dependències externes (jspdf, etc.)
- Funciona completament al client-side
