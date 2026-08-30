# 🤖 Servidor de Bots WhatsApp

Plataforma para armazenar e gerenciar seus bots de WhatsApp.

## Funcionalidades

- 📤 **Upload** de bots (arquivos de até 50MB)
- 📋 **Listagem** de todos os bots armazenados
- ⬇️ **Download** dos bots a qualquer momento
- 🗑️ **Exclusão** de bots indesejados

## Como usar

### 1. Instale as dependências

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Inicie o servidor

```bash
python app.py
```

### 3. Acesse no navegador

Abra [http://localhost:5000](http://localhost:5000)

## Estrutura do projeto

```
Servidor_bots/
├── app.py              # Servidor Flask
├── requirements.txt    # Dependências Python
├── bots.json           # Banco de dados dos bots
├── bots_storage/       # Pasta onde os arquivos dos bots são salvos
├── templates/
│   └── index.html      # Página principal
└── static/
    ├── css/
    │   └── style.css   # Estilos
    └── js/
        └── main.js     # Lógica do frontend
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Página principal |
| `POST` | `/upload` | Enviar um novo bot |
| `GET` | `/bots` | Listar todos os bots (JSON) |
| `GET` | `/bots/<id>` | Detalhes de um bot |
| `GET` | `/bots/<id>/download` | Download do bot |
| `DELETE` | `/bots/<id>` | Excluir um bot |
