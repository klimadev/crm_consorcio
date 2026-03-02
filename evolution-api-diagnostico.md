# Evolution API - Diagnóstico: Mensagens Recebidas Não Aparece no Manager

## ✅ RESUMO DA ANÁLISE

**PROBLEMA:** Mensagens recebidas não aparecem no painel/manager da Evolution API.

**CAUSA REAL:** O manager oficial da Evolution é limitado. A API funciona perfeitamente e salva as mensagens corretamente no banco.

---

## 🔍 TESTES REALIZADOS

### 1. Banco de Dados (PostgreSQL)
```sql
-- Mensagens encontradas no banco para o número
SELECT id, key->>'remoteJid' as remote_jid, key->>'id' as msg_id, 
       key->>'fromMe' as from_me, "messageType", "messageTimestamp" 
FROM "evolution_api"."Message" 
WHERE key->>'remoteJid' LIKE '%555199309404%' 
ORDER BY "messageTimestamp" DESC LIMIT 20;
```

**Resultado:** ✅ Mensagens encontradas e salvas corretamente.

### 2. Teste via API Correta
```bash
# Endpoint CORRETO (POST, não GET!)
curl -X POST "http://localhost:8080/chat/findMessages/crm_31c2e0f8_1772316414931" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_APIKEY" \
  -d '{"where":{"key":{"remoteJid":"105085065506872@lid"}},"limit":20}'
```

**Resultado:** ✅ API retorna as mensagens corretamente (259 mensagens encontradas).

---

## 📡 ENDPOINT CORRETO

### Buscar Mensagens
```
POST /chat/findMessages/{instanceName}
```

**Headers:**
- `Content-Type: application/json`
- `apikey: SUA_APIKEY`

**Body (JSON):**
```json
{
  "where": {
    "key": {
      "remoteJid": "NUMERO@lid"
    }
  },
  "limit": 50
}
```

**Parâmetros de filtro (opcionais):**
```json
{
  "where": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "messageTimestamp": {
      "gte": 1699000000,
      "lte": 1699999999
    }
  },
  "limit": 100
}
```

### Resposta (sucesso)
```json
{
  "messages": {
    "total": 259,
    "pages": 6,
    "currentPage": 1,
    "records": [
      {
        "id": "cmm8a6jhb12y1o14ucyuldti8",
        "key": {
          "id": "ACD13A42756C07E5A90A190306596108",
          "fromMe": false,
          "remoteJid": "105085065506872@lid",
          "participant": "",
          "remoteJidAlt": "555199309404@s.whatsapp.net"
        },
        "pushName": "Lima",
        "messageType": "conversation",
        "message": {
          "conversation": "Testeeeeeee"
        },
        "messageTimestamp": 1772401652,
        "instanceId": "48ff7412-fd85-4671-b3c9-f31b241f8d59",
        "source": "android"
      }
    ]
  }
}
```

---

## ❌ ENDPOINTS ERRADOS (não funcionam)

| Tentativa | Problema |
|-----------|----------|
| `GET /message/findMessages/{instance}` | 404 - Não existe |
| `GET /chat/findMessages/{instance}` | 404 - Precisa ser POST |
| `GET /message/list/{instance}` | 404 - Endpoint não existe |
| `/api/findMessages/{instance}` | 404 - Caminho incorreto |

---

## 🔧 CONFIGURAÇÃO DO AMBIENTE

### Variáveis de Ambiente (evolution.env)
```bash
# Salvamento de dados
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_HISTORIC=true

# Cache
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6
CACHE_REDIS_TTL=604800

# Logs (para debug)
LOG_BAILEYS=info
LOG_LEVEL=ERROR,WARN,DEBUG,INFO
```

---

## 📊 ESTRUTURA DO BANCO

### Tabela Message
```sql
Column          | Type
----------------|------------------
id              | text (PK)
key             | jsonb
pushName        | varchar(100)
participant     | varchar(100)
messageType     | varchar(100)
message         | jsonb
contextInfo     | jsonb
source          | enum
messageTimestamp| integer
instanceId      | text (FK)
status          | varchar(30)
```

### Query útil para debug
```sql
SELECT m.key->>'remoteJid', m.key->>'fromMe', m."messageType", m."messageTimestamp", i.name as instance
FROM "evolution_api"."Message" m
JOIN "evolution_api"."Instance" i ON m."instanceId" = i.id
WHERE i.name = 'crm_31c2e0f8_1772316414931'
ORDER BY m."messageTimestamp" DESC
LIMIT 50;
```

---

## 🐛 DEBUGANDO PROBLEMAS

### 1. Verificar se mensagem chegou no Evolution
```bash
docker-compose logs -f evolution-api | grep -i "update.*not.*read\|message"
```

### 2. Verificar logs de mensagens ignoradas
```bash
docker-compose logs evolution-api | grep -i "duplicat\|ignored\|decrypt"
```

### 3. Testar API diretamente
```bash
curl -X POST "http://localhost:8080/chat/findMessages/NOME_INSTANCIA" \
  -H "apikey: SUA_APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"where":{"key":{"remoteJid":"NUMERO@s.whatsapp.net"}}}'
```

### 4. Verificar Redis
```bash
docker exec -it klimadev_redis redis-cli ping
```

---

## 📝 CONCLUSÃO

- **A API salva corretamente** as mensagens recebidas no banco PostgreSQL
- **O manager oficial é limitado** e não mostra as mensagens corretamente
- **A solução** é usar a API diretamente com POST /chat/findMessages

---

## Referências
- Doc: https://doc.evolution-api.com
- Repo: https://github.com/EvolutionAPI/evolution-api
