from flask import Flask, render_template, request, jsonify, send_file
import os
import io
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'bots_storage'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Configuração do Neon (PostgreSQL)
DATABASE_URL = os.getenv('DATABASE_URL')
BOTS_DB = 'bots.json'

# ============================================================
# Detectar se psycopg está disponível e o Neon acessível
# ============================================================
db_connection = None

def try_connect_db():
    """Tenta conectar ao Neon. Retorna True se conectou."""
    global db_connection
    if not DATABASE_URL:
        return False
    try:
        import psycopg
        conn = psycopg.connect(DATABASE_URL)
        db_connection = conn
        return True
    except Exception:
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            db_connection = conn
            return True
        except Exception:
            return False

USE_DB = try_connect_db()

if USE_DB:
    print("✅ Conectado ao Neon (PostgreSQL)!")
else:
    print("⚠️  Neon indisponível — usando armazenamento local (bots.json)")

# ============================================================
# Funções auxiliares para banco de dados
# ============================================================

def get_db():
    """Obtém conexão com o banco"""
    global db_connection, USE_DB
    if not USE_DB:
        return None
    try:
        # Testar se a conexão ainda está viva
        cur = db_connection.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return db_connection
    except Exception:
        # Reconectar
        try:
            if try_connect_db():
                return db_connection
        except Exception:
            pass
    return None

def init_db():
    """Inicializar a tabela de bots no Neon"""
    conn = get_db()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS bots (
                id TEXT PRIMARY KEY,
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
        print("✅ Tabela 'bots' criada/verificada no Neon!")
    except Exception as e:
        print(f"⚠️  Erro ao criar tabela: {e}")

# ============================================================
# Funções auxiliares para armazenamento local (fallback)
# ============================================================

def load_local_bots():
    if os.path.exists(BOTS_DB):
        with open(BOTS_DB, 'r') as f:
            return json.load(f)
    return {}

def save_local_bots(bots):
    with open(BOTS_DB, 'w') as f:
        json.dump(bots, f, indent=2, default=str)

# ============================================================
# Rotas da aplicação
# ============================================================

@app.route('/')
def index():
    try:
        conn = get_db()
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM bots ORDER BY created_at DESC')
            bots = cur.fetchall()
            cur.close()
        else:
            bots_dict = load_local_bots()
            bots = sorted(bots_dict.values(), key=lambda x: x.get('created_at', ''), reverse=True)
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
        file_content = file.read()
        filename = secure_filename(file.filename)
        
        bot_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        storage_filename = f"{timestamp}_{filename}"
        storage_path = os.path.join(app.config['UPLOAD_FOLDER'], storage_filename)
        
        # Salvar arquivo localmente
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        with open(storage_path, 'wb') as f:
            f.write(file_content)
        
        now = datetime.now().isoformat()
        
        # Tentar salvar no Neon
        conn = get_db()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute('''
                    INSERT INTO bots (id, name, description, filename, storage_path, file_size, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ''', (bot_id, name, description, filename, storage_path, len(file_content), now, now))
                conn.commit()
                cur.close()
            except Exception as e:
                print(f"Erro ao salvar no Neon: {e}")
                # Fallback para local
                bots = load_local_bots()
                bots[bot_id] = {
                    'id': bot_id, 'name': name, 'description': description,
                    'filename': filename, 'storage_path': storage_path,
                    'file_size': len(file_content), 'created_at': now, 'updated_at': now
                }
                save_local_bots(bots)
        else:
            # Salvar localmente
            bots = load_local_bots()
            bots[bot_id] = {
                'id': bot_id, 'name': name, 'description': description,
                'filename': filename, 'storage_path': storage_path,
                'file_size': len(file_content), 'created_at': now, 'updated_at': now
            }
            save_local_bots(bots)
        
        return jsonify({'success': True, 'bot_id': bot_id})
        
    except Exception as e:
        print(f"Erro no upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/bots')
def list_bots():
    try:
        conn = get_db()
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM bots ORDER BY created_at DESC')
            bots = cur.fetchall()
            cur.close()
        else:
            bots_dict = load_local_bots()
            bots = sorted(bots_dict.values(), key=lambda x: x.get('created_at', ''), reverse=True)
        return jsonify(bots)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>')
def get_bot(bot_id):
    try:
        conn = get_db()
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
            bot = cur.fetchone()
            cur.close()
        else:
            bots = load_local_bots()
            bot = bots.get(bot_id)
        
        if bot:
            return jsonify(bot)
        return jsonify({'error': 'Bot não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>/download')
def download_bot(bot_id):
    try:
        conn = get_db()
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
            bot = cur.fetchone()
            cur.close()
        else:
            bots = load_local_bots()
            bot = bots.get(bot_id)
        
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
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM bots WHERE id = %s', (bot_id,))
            bot = cur.fetchone()
            
            if not bot:
                cur.close()
                return jsonify({'error': 'Bot não encontrado'}), 404
            
            if os.path.exists(bot['storage_path']):
                os.remove(bot['storage_path'])
            
            cur.execute('DELETE FROM bots WHERE id = %s', (bot_id,))
            conn.commit()
            cur.close()
        else:
            bots = load_local_bots()
            bot = bots.get(bot_id)
            
            if not bot:
                return jsonify({'error': 'Bot não encontrado'}), 404
            
            if os.path.exists(bot['storage_path']):
                os.remove(bot['storage_path'])
            
            del bots[bot_id]
            save_local_bots(bots)
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Erro ao deletar: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/status')
def status():
    """Endpoint para verificar o status do sistema"""
    return jsonify({
        'neon_connected': USE_DB,
        'storage': 'Neon (PostgreSQL)' if USE_DB else 'Local (bots.json)',
        'upload_folder': app.config['UPLOAD_FOLDER']
    })

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
