// Script di test per l'invio di messaggi Telegram via Bot API
// Uso: npm run test:telegram

const tgToken = process.env.WATCHDOG_TELEGRAM_TOKEN
const tgChat = process.env.WATCHDOG_TELEGRAM_CHAT_ID

const TEST_MESSAGE = `🔔 IusMente — Test notifica Telegram

✅ Messaggio di test inviato automaticamente dal watchdog.
Se vedi questo messaggio, la pipeline di notifica Telegram funziona correttamente.

Data: ${new Date().toISOString()}`;

if (!tgToken || !tgChat) {
  console.error('❌ Variabili mancanti: WATCHDOG_TELEGRAM_TOKEN e/o WATCHDOG_TELEGRAM_CHAT_ID')
  process.exit(1)
}

const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${encodeURIComponent(tgChat)}&text=${encodeURIComponent(TEST_MESSAGE)}`

try {
  console.log('Invio messaggio di test a Telegram...')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  
  if (data.ok) {
    console.log('✅ Messaggio di test inviato con successo!')
    console.log('📱 Telegram: messaggio ricevuto')
  } else {
    console.error('❌ Errore Telegram API:', data.description || data)
    process.exit(1)
  }
} catch (e) {
  console.error('❌ Errore invio Telegram:', e.message)
  process.exit(1)
}
