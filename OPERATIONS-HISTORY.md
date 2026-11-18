# Storico operativo — IusMente

Registro degli interventi su scheduler, notifiche Telegram e verifica dei modelli LLM.
Aggiungere le nuove voci **in cima** (dalla più recente alla più vecchia), indicando
data, sintomo, diagnosi, azioni e cosa controllare la volta successiva.
Non inserire chiavi, token o chat ID reali: solo i nomi delle variabili.

---

## 2026-11-18 — Le notifiche settimanali Telegram non arrivano più

### Sintomo
Nessun messaggio di riepilogo dell'audit modelli dal 2 novembre 2026 (ultima
notifica ricevuta: il run manuale di quel giorno). I run schedulati del 9 e del
16 novembre risultavano comunque **verdi** nella UI di GitHub Actions.

### Diagnosi
Il passo `Verifica orario locale (09:00 Europe/Rome)` scartava ogni esecuzione
schedulata: pretendeva `date +%H` = `09` in `Europe/Rome`, ma GitHub Actions ha
consegnato i cron con **9-10 ore di ritardo**.

| Run | Cron previsto | Ora di consegna | Ora locale | Esito |
|---|---|---|---|---|
| 41413998971 | manuale | 02/11 08:33 UTC | 09:33 | audit eseguito (ultima notifica) |
| 42661716747 | 09/11 08:00 UTC | 09/11 17:08 UTC | 18:08 | saltato dal guard |
| 42672395796 | 09/11 07:00 UTC | 09/11 18:15 UTC | 19:15 | failure GitHub, nessun job creato |
| 43910724974 | 16/11 07:00 UTC | 16/11 16:43 UTC | 17:43 | saltato dal guard |
| 43923024367 | 16/11 08:00 UTC | 16/11 17:53 UTC | 18:53 | saltato dal guard |

Nei run saltati i passi `setup-node`, `npm ci` e `Audit modelli free` risultano
`skipped`: il job "passa", quindi il guasto è invisibile senza aprire la run.

Nota: il `.env.local` del PC Windows contiene solo le 5 API key, **non**
`WATCHDOG_TELEGRAM_TOKEN` / `WATCHDOG_TELEGRAM_CHAT_ID`, quindi un audit locale
qui non notificherebbe nulla (`notify()` stampa "nessuna notifica configurata").
Non è la causa del silenzio: l'invio avveniva dai runner GitHub, dove i secret
sono presenti.

### Verifiche eseguite
- `GET /repos/supergino/ailegge/actions/workflows/weekly-models.yml/runs` (API
  pubblica): 5 run totali, orari di consegna come da tabella.
- `GET /repos/.../actions/runs/<id>/jobs` per ogni run: confermato `skipped` sul
  passo di audit nei run del 9 e 16 novembre.
- YAML del workflow validato con `js-yaml`: parsing corretto, permessi
  `contents: write` + `actions: read`.
- `npm run build` (Next 16.4.3): compilazione ok, ma il comando termina con
  `SecurityFatalError` perché la versione di Next.js ha una vulnerabilità nota →
  upgrade di sicurezza da fare (vedi sotto).

### Interventi
1. **Guard sostituito** in `.github/workflows/weekly-models.yml`:
   `Guardia settimanale (dedup esecuzioni)`. L'audit gira alla prima consegna
   utile della settimana (qualunque ora), i run successivi si fermano se un
   altro run ha già eseguito il passo `Audit modelli free` negli ultimi 6 giorni
   (dedup via `gh api` su runs + jobs). `workflow_dispatch` non viene mai saltato.
2. **Permesso `actions: read`** aggiunto ai `permissions` del workflow (serve al
   dedup per leggere le esecuzioni precedenti).
3. **`package-lock.json`** riallineato alla versione del progetto (era a 3.1.3
   mentre `package.json` era a 3.2.0) e versione portata a **v3.2.1**.
4. **Documentazione**: `CHANGELOG.md` e questo storico.

### Prossimo controllo (lunedì 2026-11-23)
- [ ] Arrivo del messaggio Telegram (a fine audit, quindi non alle 09:00 in punto:
      la consegna del cron può slittare di ore).
- [ ] `gh run list --repo supergino/ailegge --workflow weekly-models.yml --limit 5`:
      un run con il passo `Audit modelli free` eseguito (`success`) e, se c'è un
      secondo run lo stesso giorno, i suoi passi devono essere `skipped` (dedup).
- [ ] Se il messaggio ancora non arriva: verificare `gh secret list` (i 3 secret
      watchdog) e lanciare `gh workflow run weekly-models.yml -f apply=false`
      per forzare un audit con notifica.

---

## 2026-11-02 (pomeriggio) — Il test schedulato delle 10:00 non è partito

### Sintomo
Nessuna notifica Telegram alle 10:00. L'utente non sapeva se il job di prova
fosse stato eseguito.

### Diagnosi
- **Job launchd mai caricato**: il plist
  `~/Library/LaunchAgents/com.iusmente.audit-test.plist` è presente, ma
  `launchctl list` non lo contiene e
  `launchctl print gui/$(id -u)/com.iusmente.audit-test` risponde
  *"Could not find service"*. Scrivere il plist nella cartella LaunchAgents
  **non basta**: senza `launchctl bootstrap` viene caricato solo al login
  successivo.
- **Nessuna esecuzione**: il log `iusmente-audit-10.log` non esiste e
  `log show --last 12h` non contiene tracce `iusmente`.
- **Pipeline Telegram OK**: test di invio riuscito.

### Verifiche eseguite
- `node --env-file=.env.local scripts/test-telegram.mjs` → invio OK.
- `node --env-file=.env.local scripts/auto-update-models.mjs --notify=always`
  (dry-run) → gemini, groq-validator, groq-fallback, nvidia `ok`; openrouter
  `degraded` (`nvidia/nemotron-3.5-lightning:free: invalid`); notifica inviata.

### Anomalia separata corretta
Il riepilogo segnava `openrouter` come `degraded` ma concludeva con
"✅ Tutti i modelli configurati rispondono". In `scripts/auto-update-models.mjs`
il verdetto finale ora considera ogni ruolo non `ok`/`fixed`/`skipped` e stampa
"⚠️ Audit completato con provider non pienamente operativi: …".
Verificato con un audit reale: il messaggio Telegram riporta ora
`openrouter (degraded)`. L'exit code resta `0` per un `degraded` (non fa fallire
il workflow); restano `❌` solo gli errori che richiedono intervento
(`run.failed`: auth, no_credits, ritirati senza sostituto, build/commit).

### Interventi
1. **Job launchd riarmato** per domani alle 10:00:
   `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.iusmente.audit-test.plist`
   (verificato con `launchctl print`: `state = not running`, argomenti corretti).
2. **Script e log spostati fuori dalla cartella temporanea** (che può essere
   ripulita e avrebbe fatto fallire il job):
   - script: `~/Library/Application Support/IusMente/audit-test.sh`
   - log: `~/Library/Logs/IusMente/audit-test.log`
   - plist aggiornato di conseguenza.
3. Lo script resta one-shot: al termine esegue `launchctl bootout` di se stesso.

### Prossimo controllo (domani, 2026-11-03, ore 10:00)
- [ ] Verificare l'arrivo del messaggio Telegram delle 10:00.
- [ ] Controllare `~/Library/Logs/IusMente/audit-test.log`: deve contenere
      `inizio audit` e `fine audit, exit=0`.
- [ ] Dopo l'esecuzione il job si rimuove da solo: `launchctl print
      gui/$(id -u)/com.iusmente.audit-test` deve rispondere "Could not find
      service".
- [ ] Nota: `openrouter` risulta `degraded` per
      `nvidia/nemotron-3.5-lightning:free: invalid` (HTTP 200 ma risposta non
      JSON valido). Il meccanismo di sostituzione automatica gestisce solo i
      modelli `gone` (404/410), non gli `invalid`: valutare se estenderlo o
      rimuovere quel modello dalla catena.
- [ ] Dopo ogni creazione di un plist one-shot, verificare **sempre** con
      `launchctl print gui/$(id -u)/<label>` che il job sia registrato.

---

## 2026-11-02 — Nessun messaggio Telegram dall'audit delle 06:00

### Sintomo
L'utente non ha ricevuto il messaggio Telegram previsto per lunedì mattina e non
sapeva se il controllo dei modelli LLM fosse stato eseguito.

### Diagnosi
- **Telegram funzionante**: messaggio di test e audit completo inviati e ricevuti
  (token e chat ID validi).
- **Il workflow GitHub non era mai partito**: `gh run list` e la pagina Actions
  mostravano `0` esecuzioni. Quindi né il controllo LLM né la notifica sono stati
  generati alle 06:00. La causa esatta del mancato trigger dello scheduler non è
  stata determinata (workflow `active`, Actions abilitate, branch default `main`).
- **Nessun secret configurato** nel repository (`actions/secrets` → `total_count: 0`):
  anche un'esecuzione del workflow non avrebbe potuto usare le API key né inviare
  il riepilogo Telegram.
- **Fuso orario sbagliato**: il cron era `0 6 * * 1` = 06:00 UTC = **07:00 italiane**
  in inverno, non le 06:00 attese.

### Verifiche eseguite
- `node --env-file=.env.local scripts/test-telegram.mjs` → invio OK.
- `node --env-file=.env.local scripts/auto-update-models.mjs --notify=always`
  (dry-run) → Gemini, Groq validatore, Groq fallback, NVIDIA e catena OpenRouter
  tutti `ok`; nessuna sostituzione; riepilogo Telegram inviato.
- Test di accesso della cartella progetto da launchd (TCC): superato.

### Interventi
1. **Secrets GitHub Actions creati** (dai valori di `.env.local`, mai committati):
   `GEMINI_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`,
   `WATCHDOG_TELEGRAM_TOKEN`, `WATCHDOG_TELEGRAM_CHAT_ID`.
   `WATCHDOG_WEBHOOK_URL` e `WATCHDOG_TOKEN` sono vuoti e non sono stati creati.
2. **Cron corretto per le 09:00 italiane** (`.github/workflows/weekly-models.yml`):
   - `0 7 * * 1` → 09:00 CEST (ora legale)
   - `0 8 * * 1` → 09:00 CET (ora solare)
   - passo `Verifica orario locale (09:00 Europe/Rome)` che esegue solo se in
     `Europe/Rome` l'ora è `09`; le esecuzioni manuali non vengono mai saltate.
3. **Documentazione aggiornata**: `README.md`, `CLAUDE.md`, `CHANGELOG.md`;
   versione portata a **v3.1.2**.
4. **Commit e push**: `9b9791a` su `main`
   (`fix(ci): audit modelli alle 09:00 italiane + secrets Actions (v3.1.2)`).
5. **Test end-to-end del workflow**: run manuale `41413998971`
   (`gh workflow run weekly-models.yml --ref main -f apply=false`) →
   **successo in 47s**, tutti i modelli `ok`, notifica Telegram inviata dal runner.
6. **Controllo locale di prova alle 10:00 del 2026-11-02** (richiesto dall'utente):
   job launchd one-shot `com.iusmente.audit-test`
   (`~/Library/LaunchAgents/com.iusmente.audit-test.plist`) che esegue l'audit
   dry-run e si auto-rimuove.
   Log: `/private/var/folders/tw/kwgb23tn08d2dzgmym7zpmsw0000gn/T/opencode/iusmente-audit-10.log`
   (il percorso temporaneo può cambiare: se il file non c'è, il job è già stato
   eseguito e rimosso).

### Stato attuale
- Prossima esecuzione automatica attesa: **lunedì 9 novembre 2026 alle 09:00 CET**
  (08:00 UTC). Il run delle 07:00 UTC verrà saltato dal guard (sarebbero le 08:00).
- Il workflow ha ora un'esecuzione manuale riuscita e i secrets sono presenti.

### Prossimo controllo (lunedì 2026-11-09)
- [ ] Verificare che sia arrivato il messaggio Telegram: parte a fine audit,
      quindi pochi minuti **dopo** le 09:00 (non alle 09:00 in punto).
- [ ] `gh run list --repo supergino/ailegge --workflow weekly-models.yml --limit 5`
      → deve comparire un run `schedule` con `success` intorno alle 08:00 UTC.
- [ ] Se non parte, controllare nell'ordine:
      1. `gh api repos/supergino/ailegge/actions/permissions` → `enabled: true`;
      2. `gh secret list --repo supergino/ailegge` → 6 secret presenti;
      3. log del passo `Verifica orario locale` (deve stampare `09` in `Europe/Rome`);
      4. se lo scheduler GitHub continua a non partire, predisporre un trigger
         esterno che chiami `workflow_dispatch` (es. cron-job.org o watchdog locale).
- [ ] Se il guard salta per ritardo dello scheduler (> 1 ora), valutare una finestra
      più tollerante (es. accettare `09:00`–`09:59` o un margine esplicito).

### Comandi utili
```bash
# Stato login e secrets
gh auth status
gh secret list --repo supergino/ailegge

# Esecuzioni del workflow
gh run list --repo supergino/ailegge --workflow weekly-models.yml --limit 10
gh run view <RUN_ID> --repo supergino/ailegge --log

# Lancio manuale (dry-run: non applica/committa nulla)
gh workflow run weekly-models.yml --repo supergino/ailegge --ref main -f apply=false

# Audit e notifica in locale (legge .env.local)
node --env-file=.env.local scripts/auto-update-models.mjs --notify=always

# Test della sola notifica Telegram
node --env-file=.env.local scripts/test-telegram.mjs
```

### Note
- `npm run test:telegram` da solo **non** carica `.env.local`: usare
  `node --env-file=.env.local ...` oppure esportare le variabili.
- L'audit locale crea `data/model-changes.json` (artefatto di runtime, non committato).
- Il workflow committa da solo solo se trova modelli ritirati (`404/410`) e il build
  passa; in caso contrario non tocca il repository.
