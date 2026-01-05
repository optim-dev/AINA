# validateStyleTone (versió humana)

Aquest document explica **de manera fàcil** què fa `validateStyleTone`, **per què existeix**, i **com interpretar** els resultats.

**⚠️ Actualitzat (v2.0.0):** La detecció lingüística ara utilitza **intel·ligència artificial (Gemini)** en lloc de diccionaris locals. Això millora la qualitat de detecció i permet explicacions més contextuals.

Si vols els detalls tècnics (càlculs exactes, regles, llindars, etc.), mira [validateToneStyle.md](validateToneStyle.md).

---

## Què és `validateStyleTone`?

És una validació automàtica que revisa un text (normalment en català) i t'avisa si el text:

- sona massa informal per a un context administratiu,
- conté castellanismes o expressions col·loquials,
- pot ser ambigu o poc clar,
- té frases massa llargues o massa veu passiva,
- repeteix massa el vocabulari.

L'objectiu és ajudar-te a escriure textos **més clars, més formals i més coherents**, especialment quan el públic és la ciutadania o quan el document és un decret/notificació.

---

## Com funciona (ara amb IA)?

El sistema combina dues coses:

1. **Intel·ligència artificial (Gemini 2.5 Flash)** per detectar problemes lingüístics:

   - Castellanismes, col·loquialismes, registre inadequat, ambigüitats
   - Anàlisi del to del text

2. **Càlculs locals** per mètriques d'estil:
   - Longitud de frases, percentatge de veu passiva, diversitat de vocabulari

Això vol dir que les alertes lingüístiques ara inclouen **explicacions més riques** i **suggeriments més contextuals** que abans.

---

## Per què serveix (el “per què”)?

Quan un text és administratiu, els problemes típics no solen ser “errors de gramàtica” sinó:

- **to inadequat** (massa col·loquial o massa personal),
- **terminologia inconsistent** (castellanismes o formes no preferides),
- **claredat baixa** (frases molt llargues, passiva, referències vagues),
- **ambigüitat** (quantificadors o temps imprecisos: “aviat”, “diversos”, “alguns”…).

`validateStyleTone` existeix per detectar això de forma ràpida i donar-te **una llista d’alertes i recomanacions**.

---

## Quan l’has d’utilitzar?

- Quan prepares una **notificació a ciutadania**.
- Quan redactes un **decret** o un text formal.
- Quan vols fer una “passada ràpida” abans d’enviar/publicar un document.
- Quan notes que el text és correcte però “no sona administratiu”.

---

## Què introdueixes (inputs)?

Com a mínim:

- `text`: el text a validar.

Opcionalment:

- `documentType`: quin tipus de document és (per aplicar millor algunes regles).
- `targetAudience`: a qui va dirigit.

---

## Què et retorna (outputs)?

Rebràs cinc peces principals:

1. **Scores (puntuacions 0–100)**

- Un resum numèric de com de bé està el text en diverses dimensions.

2. **Tone analysis (anàlisi de to)**

- Una classificació simple de si el text sona formal/semiformal/mixt/informal.

3. **Style metrics (mètriques)**

- Dades de lectura i estil (longitud de frase, passiva, diversitat lèxica…).

4. **Alerts (alertes)**

- La llista de “coses a revisar”, amb fragments del text i suggeriments.

5. **Recommendations (recomanacions)**

- Accions resumides i prioritzades (què convé fer primer).

---

## Com interpretar les puntuacions (scores)

Pensa en els scores com un “semàfor” general:

- **90–100**: molt bé; canvis petits.
- **75–89**: acceptable; hi ha millores clares a fer.
- **< 75**: cal revisar; segurament hi ha massa alertes o mètriques dolentes.

Els scores no són “veritat absoluta”: són una manera d’ordenar prioritats i veure tendència.

---

## Què vol dir cada tipus d’alerta?

- **castellanisme**: s’ha detectat una paraula/expressió en castellà o una forma no preferida; es proposa una alternativa en català.

- **colloquialisme**: expressió massa informal per a un registre administratiu (p. ex. “vale”, “guai”, “al loro”…).

- **registre_inadequat**: el text utilitza un tractament o una construcció massa personal/informal per a un document administratiu (p. ex. “et comuniquem…” en lloc de “Es comunica…”).

- **ambiguitat**: expressions vagues que poden generar dubtes (temps/quantitat/referències poc clares).

- **frase_llarga**: de mitjana, les frases són massa llargues.

- **passiva_excessiva**: hi ha molta veu passiva i això fa el text menys directe.

- **repeticio**: poca varietat de vocabulari (moltes repeticions).

### Severitat

- **error**: problema fort (prioritat alta).
- **warning**: problema rellevant (prioritat mitjana).
- **info**: millora opcional o contextual.

---

## Recomanacions: com usar-les

Les recomanacions t’ajuden a atacar el problema “per blocs”.

Un bon flux de treball és:

1. Arregla primer **errors** (sobretot registre i castellanismes).
2. Després revisa **claredat** (frases llargues, ambigüitats).
3. Finalment polir **estil** (passiva, repeticions).

---

## Limitacions importants (per evitar males interpretacions)

- Utilitza **IA (Gemini)** per detectar problemes lingüístics — la qualitat depèn del model.
- Pot donar **falsos positius** (marca una paraula que en el teu context és acceptable).
- Pot donar **falsos negatius** (no detectar un problema que sí que existeix).
- Si el servei d'IA falla, el sistema continua amb les mètriques locals (degradació elegent).
- El camp `targetAudience` s'envia a la IA però la seva influència depèn del model.

---

## Privacitat / registre (què es guarda)

Per poder fer estadístiques i millores, el sistema registra resultats a BigQuery:

**Logs de validació (style_tone_logs):**

- Scores, mètriques, tipus de document
- Hash del text (no el text complet)
- Alertes detectades (inclouen fragments del text)

**Logs d'IA (llm_logs):**

- El prompt enviat a Gemini (inclou el text complet!)
- La resposta del model
- Tokens utilitzats i cost estimat

⚠️ **Important:** Si el text conté dades sensibles, cal tenir-ho present. El text s'envia al servei Gemini de Google.

---

## Consells pràctics

- Si tens moltes alertes de **registre**, revisa el document complet: sovint és un patró repetit.
- Si baixa la **claredat**, simplifica: frases més curtes i menys passiva.
- Si hi ha castellanismes repetits, crea’t una rutina: “buscar i substituir” i després rellegir.

---

## En una frase

`validateStyleTone` és un “control de qualitat” de registre i claredat: et diu **què grinyola** i **què convé millorar** perquè el text soni administratiu i s’entengui bé.
