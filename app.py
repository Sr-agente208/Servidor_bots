from flask import Flask, render_template, request, jsonify, send_file
import os
import io
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'bots_storage'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Configuração do Neon (PostgreSQL)
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db():
    """Conectar ao banco de dados Neon"""
    if not DATABASE_URL:
        raise Exception("Configure DATABASE_URL no arquivo .env")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    """Inicializar a tabela de bots"""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS bots (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                filename TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                file_size BIGINT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        ''')
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Banco de dados inicializado com sucesso!")
    except Exception as e:
        print(f"⚠️ Erro ao inicializar banco: {e}")

@app.route('/')
def index():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM bots ORDER BY created_at DESC')
        bots = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        bots = []
        print(f"Erro ao carregar bots: {e}")
    return render_template('index.html', bots=bots)

@app.route('/upload', methods=['POST'])
def upload_bot():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    name = request.form.get('name', 'Bot sem nome')
    description = request.form.get('description', '')
    
    try:
        # Ler o conteúdo do arquivo
        file_content = file.read()
        filename = secure_filename(file.filename)
        
        # Criar nome único para o storage local
        bot_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        storage_filename = f"{timestamp}_{filename}"
        storage_path = os.path.join(app.config['UPLOAD_FOLDER'], storage_filename)
        
        # Salvar arquivo localmente
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        with open(storage_path, 'wb') as f:
            f.write(file_content)
        
        # Salvar metadados no banco Neon
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO bots (id, name, description, filename, storage_path, file_size)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (bot_id, name, description, filename, storage_path, len(file_content)))
        
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'bot_id': bot_id})
        
    except Exception as e:
        print(f"Erro no upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/bots')
def list_bots():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM bots ORDER BY created_at DESC')
        bots = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(bots)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>')
def get_bot(bot_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
        bot = cur.fetchone()
        cur.close()
        conn.close()
        
        if bot:
            return jsonify(bot)
        return jsonify({'error': 'Bot não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>/download')
def download_bot(bot_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
        bot = cur.fetchone()
        cur.close()
        conn.close()
        
        if not bot:
            return jsonify({'error': 'Bot não encontrado'}), 404
        
        if not os.path.exists(bot['storage_path']):
            return jsonify({'error': 'Arquivo não encontrado no servidor'}), 404
        
        return send_file(
            bot['storage_path'],
            as_attachment=True,
            download_name=bot['filename']
        )
        
    except Exception as e:
        print(f"Erro no download: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>', methods=['DELETE'])
def delete_bot(bot_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Buscar metadados do bot
        cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
        bot = cur.fetchone()
        
        if not bot:
            cur.close()
            conn.close()
            return jsonify({'error': 'Bot não encontrado'}), 404
        
        # Deletar arquivo local
        if os.path.exists(bot['storage_path']):
            os.remove(bot['storage_path'])
        
        # Deletar registro do banco
        cur.execute('DELETE FROM bots WHERE id = %s', (bot_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Erro ao deletar: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Inicializar banco de dados
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
