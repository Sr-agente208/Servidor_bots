// Verificar status do banco de dados
async function checkStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        const badge = document.getElementById('dbStatus');
        if (data.neon_connected) {
            badge.textContent = '☁️ Neon (PostgreSQL)';
            badge.style.background = 'rgba(62, 207, 142, 0.15)';
            badge.style.color = '#3ecf8e';
            badge.style.borderColor = '#3ecf8e';
        } else {
            badge.textContent = '💾 Armazenamento Local';
            badge.style.background = 'rgba(255, 193, 7, 0.15)';
            badge.style.color = '#ffc107';
            badge.style.borderColor = '#ffc107';
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// Verificar status ao carregar a página
checkStatus();

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('botName').value);
    formData.append('description', document.getElementById('botDescription').value);
    formData.append('file', document.getElementById('botFile').files[0]);
    
    const statusDiv = document.getElementById('uploadStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.textContent = '✅ Bot enviado com sucesso!';
            statusDiv.className = 'success';
            document.getElementById('uploadForm').reset();
            setTimeout(() => location.reload(), 1000);
        } else {
            statusDiv.textContent = '❌ Erro: ' + data.error;
            statusDiv.className = 'error';
        }
    } catch (error) {
        statusDiv.textContent = '❌ Erro ao enviar o bot';
        statusDiv.className = 'error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Bot';
    }
});

async function deleteBot(botId) {
    if (!confirm('Tem certeza que deseja excluir este bot?')) {
        return;
    }
    
    try {
        const response = await fetch(`/bots/${botId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const card = document.querySelector(`[data-id="${botId}"]`);
            if (card) {
                card.remove();
            }
            if (document.querySelectorAll('.bot-card').length === 0) {
                location.reload();
            }
        } else {
            alert('Erro ao excluir o bot: ' + data.error);
        }
    } catch (error) {
        alert('Erro ao excluir o bot');
    }
}
