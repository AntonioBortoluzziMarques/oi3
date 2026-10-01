# Dashboard de Monitoramento Ambiental

Frontend em HTML, CSS e JavaScript, sem dados simulados.

## Estrutura

- `index.html` - estrutura da interface
- `style.css` - estilos e responsividade
- `app.js` - integração com o backend/API

## Como conectar ao banco

O navegador não deve acessar diretamente o banco de dados. O fluxo recomendado é:

Banco de dados -> API/backend -> Dashboard

No `app.js`, altere:

```js
const DATA_ENDPOINT = "";
```

para o endpoint da sua API, por exemplo:

```js
const DATA_ENDPOINT = "http://localhost:8000/api/readings";
```

A API deve retornar JSON no formato:

```json
[
  {
    "timestamp": "2026-10-01T14:30:00Z",
    "temperature": 24.5,
    "humidity": 61.2,
    "pressure": 1012.8,
    "wind": 4.1
  }
]
```

Os nomes alternativos já aceitos pelo frontend incluem:

- temperatura: `temperature`, `temperatura`, `temp`
- umidade: `humidity`, `umidade`
- pressão: `pressure`, `pressao`
- vento: `wind`, `wind_speed`, `velocidade_vento`, `vento`
- data: `timestamp`, `datetime`, `created_at`, `data_hora`

## Observação

Não há fallback para dados falsos. Se a API estiver vazia ou não configurada, o dashboard mostra explicitamente "Sem dados".

## Próximo passo

Se você estiver usando FastAPI, Flask, Node ou outro backend, basta adaptar o endpoint para consultar o banco e retornar o JSON esperado.
