from flask import Flask, render_template, request, jsonify, send_file
import os
import io
from datetime import datetime
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Configuração do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
STORAGE_BUCKET = 'bots-files'

supabase: Client = None

def get_supabase():
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise Exception("Configure SUPABASE_URL e SUPABASE_KEY no arquivo .env")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return supabase

@app.route('/')
def index():
    try:
        client = get_supabase()
        response = client.table('bots').select('*').order('created_at', desc=True).execute()
        bots = response.data
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
        client = get_supabase()
        
        # Ler o conteúdo do arquivo
        file_content = file.read()
        filename = secure_filename(file.filename)
        
        # Criar nome único para o storage
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        storage_path = f"{timestamp}_{filename}"
        
        # Upload para o Supabase Storage
        client.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type or "application/octet-stream"}
        )
        
        # Salvar metadados no banco de dados
        bot_data = {
            'name': name,
            'description': description,
            'filename': filename,
            'storage_path': storage_path,
            'file_size': len(file_content)
        }
        
        result = client.table('bots').insert(bot_data).execute()
        bot_id = result.data[0]['id']
        
        return jsonify({'success': True, 'bot_id': bot_id})
        
    except Exception as e:
        print(f"Erro no upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/bots')
def list_bots():
    try:
        client = get_supabase()
        response = client.table('bots').select('*').order('created_at', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>')
def get_bot(bot_id):
    try:
        client = get_supabase()
        response = client.table('bots').select('*').eq('id', bot_id).execute()
        if response.data:
            return jsonify(response.data[0])
        return jsonify({'error': 'Bot não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>/download')
def download_bot(bot_id):
    try:
        client = get_supabase()
        
        # Buscar metadados do bot
        response = client.table('bots').select('*').eq('id', bot_id).execute()
        if not response.data:
            return jsonify({'error': 'Bot não encontrado'}), 404
        
        bot = response.data[0]
        
        # Download do arquivo do Storage
        file_data = client.storage.from_(STORAGE_BUCKET).download(bot['storage_path'])
        
        return send_file(
            io.BytesIO(file_data),
            as_attachment=True,
            download_name=bot['filename'],
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        print(f"Erro no download: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/bots/<bot_id>', methods=['DELETE'])
def delete_bot(bot_id):
    try:
        client = get_supabase()
        
        # Buscar metadados do bot
        response = client.table('bots').select('*').eq('id', bot_id).execute()
        if not response.data:
            return jsonify({'error': 'Bot não encontrado'}), 404
        
        bot = response.data[0]
        
        # Deletar arquivo do Storage
        client.storage.from_(STORAGE_BUCKET).remove([bot['storage_path']])
        
        # Deletar registro do banco
        client.table('bots').delete().eq('id', bot_id).execute()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Erro ao deletar: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
