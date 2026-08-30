# 🤖 Servidor de Bots WhatsApp

Plataforma para armazenar e gerenciar seus bots de WhatsApp, usando **Neon** (PostgreSQL gratuito) como banco de dados.

## Funcionalidades

- 📤 **Upload** de bots (arquivos de até 50MB)
- 📋 **Listagem** de todos os bots armazenados
- ⬇️ **Download** dos bots a qualquer momento
- 🗑️ **Exclusão** de bots indesejados
- ☁️ **Banco de dados na nuvem** com Neon (PostgreSQL)

## Pré-requisitos

1. Conta gratuita no [Neon](https://neon.tech)
2. Python 3.8+

## Como configurar

### 1. Criar conta no Neon (gratuito)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto
3. No Dashboard, copie a **Connection String** (formato: `postgresql://user:password@host/database?sslmode=require`)

### 2. Configurar o projeto

```bash
# Clonar e entrar no diretório
cd Servidor_bots

# Criar ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env com sua connection string
cp .env.example .env
```

Edite o arquivo `.env`:
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 3. Iniciar o servidor

```bash
python app.py
```

O servidor criará a tabela `bots` automaticamente na primeira execução.

### 4. Acessar no navegador

Abra [http://localhost:5000](http://localhost:5000)

## Estrutura do projeto

```
Servidor_bots/
├── app.py              # Servidor Flask
├── requirements.txt    # Dependências Python
├── .env.example        # Modelo de configuração
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

## Estrutura no Neon (PostgreSQL)

### Tabela `bots`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome do bot |
| `description` | TEXT | Descrição do bot |
| `filename` | TEXT | Nome do arquivo original |
| `storage_path` | TEXT | Caminho do arquivo no servidor |
| `file_size` | BIGINT | Tamanho do arquivo em bytes |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

## Vantagens do Neon

- ✅ **Gratuito**: 512MB de storage + 24/7 compute
- ✅ **PostgreSQL completo**: Sem limitações de queries
- ✅ **Serverless**: Escala automaticamente
- ✅ **SSL**: Conexão segura por padrão
