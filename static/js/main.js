document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('botName').value);
    formData.append('description', document.getElementById('botDescription').value);
    formData.append('file', document.getElementById('botFile').files[0]);
    
    const statusDiv = document.getElementById('uploadStatus');
    
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
            // Recarregar se não houver mais bots
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
