# Storico operativo — IusMente

Registro degli interventi su scheduler, notifiche Telegram e verifica dei modelli LLM.
Aggiungere le nuove voci **in cima** (dalla più recente alla più vecchia), indicando
data, sintomo, diagnosi, azioni e cosa controllare la volta successiva.
Non inserire chiavi, token o chat ID reali: solo i nomi delle variabili.

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
- [ ] Verificare che sia arrivato il messaggio Telegram delle 09:00.
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
