from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'bots_storage'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Arquivo de metadados dos bots
BOTS_DB = 'bots.json'

def load_bots():
    if os.path.exists(BOTS_DB):
        with open(BOTS_DB, 'r') as f:
            return json.load(f)
    return {}

def save_bots(bots):
    with open(BOTS_DB, 'w') as f:
        json.dump(bots, f, indent=2)

@app.route('/')
def index():
    bots = load_bots()
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
    
    bot_id = str(uuid.uuid4())[:8]
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{bot_id}_{filename}")
    file.save(filepath)
    
    bots = load_bots()
    bots[bot_id] = {
        'id': bot_id,
        'name': name,
        'description': description,
        'filename': filename,
        'filepath': filepath,
        'uploaded_at': datetime.now().isoformat(),
        'size': os.path.getsize(filepath)
    }
    save_bots(bots)
    
    return jsonify({'success': True, 'bot_id': bot_id})

@app.route('/bots')
def list_bots():
    bots = load_bots()
    return jsonify(list(bots.values()))

@app.route('/bots/<bot_id>')
def get_bot(bot_id):
    bots = load_bots()
    if bot_id in bots:
        return jsonify(bots[bot_id])
    return jsonify({'error': 'Bot não encontrado'}), 404

@app.route('/bots/<bot_id>/download')
def download_bot(bot_id):
    bots = load_bots()
    if bot_id in bots:
        bot = bots[bot_id]
        directory = os.path.dirname(bot['filepath'])
        filename = os.path.basename(bot['filepath'])
        return send_from_directory(directory, filename, as_attachment=True)
    return jsonify({'error': 'Bot não encontrado'}), 404

@app.route('/bots/<bot_id>', methods=['DELETE'])
def delete_bot(bot_id):
    bots = load_bots()
    if bot_id in bots:
        bot = bots[bot_id]
        if os.path.exists(bot['filepath']):
            os.remove(bot['filepath'])
        del bots[bot_id]
        save_bots(bots)
        return jsonify({'success': True})
    return jsonify({'error': 'Bot não encontrado'}), 404

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
