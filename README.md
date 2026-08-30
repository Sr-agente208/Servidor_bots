# 🤖 Servidor de Bots WhatsApp

Plataforma para armazenar e gerenciar seus bots de WhatsApp, usando **Supabase** como banco de dados e storage.

## Funcionalidades

- 📤 **Upload** de bots (arquivos de até 50MB)
- 📋 **Listagem** de todos os bots armazenados
- ⬇️ **Download** dos bots a qualquer momento
- 🗑️ **Exclusão** de bots indesejados
- ☁️ **Armazenamento na nuvem** com Supabase

## Pré-requisitos

1. Conta gratuita no [Supabase](https://supabase.com)
2. Python 3.8+

## Como configurar

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Vá em **Settings > API** e copie:
   - **Project URL** (ex: `https://xyzxyz.supabase.co`)
   - **anon public** key

### 2. Configurar o banco de dados

1. No painel do Supabase, vá em **SQL Editor**
2. Cole e execute o conteúdo do arquivo `supabase_setup.sql`

### 3. Configurar o projeto

```bash
# Clonar e entrar no diretório
cd Servidor_bots

# Criar ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env com suas credenciais
cp .env.example .env
```

Edite o arquivo `.env`:
```
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_KEY=SUA_ANON_KEY_AQUI
```

### 4. Iniciar o servidor

```bash
python app.py
```

### 5. Acessar no navegador

Abra [http://localhost:5000](http://localhost:5000)

## Estrutura do projeto

```
Servidor_bots/
├── app.py              # Servidor Flask
├── requirements.txt    # Dependências Python
├── .env.example        # Modelo de configuração
├── supabase_setup.sql  # Script SQL para configurar o Supabase
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

## Estrutura no Supabase

### Tabela `bots`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome do bot |
| `description` | TEXT | Descrição do bot |
| `filename` | TEXT | Nome do arquivo original |
| `storage_path` | TEXT | Caminho no Supabase Storage |
| `file_size` | BIGINT | Tamanho do arquivo em bytes |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### Storage Bucket

- **Nome:** `bots-files`
- **Acesso:** Público (para download)
