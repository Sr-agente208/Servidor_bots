-- =====================================================
-- Script SQL para configurar o Supabase
-- Execute este script no SQL Editor do seu projeto
-- =====================================================

-- 1. Criar a tabela de bots
CREATE TABLE IF NOT EXISTS bots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_bots_name ON bots(name);
CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at DESC);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (permite leitura/escrita pública para começar)
-- Você pode restringir depois com autenticação
CREATE POLICY "Permitir leitura pública de bots"
    ON bots FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção pública de bots"
    ON bots FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir exclusão pública de bots"
    ON bots FOR DELETE
    USING (true);

CREATE POLICY "Permitir atualização pública de bots"
    ON bots FOR UPDATE
    USING (true);

-- 5. Criar o bucket de storage para os arquivos dos bots
INSERT INTO storage.buckets (id, name, public)
VALUES ('bots-files', 'bots-files', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Criar políticas de storage (acesso público)
CREATE POLICY "Permitir upload público de arquivos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'bots-files');

CREATE POLICY "Permitir leitura pública de arquivos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bots-files');

CREATE POLICY "Permitir exclusão pública de arquivos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'bots-files');

-- 7. Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Trigger para atualizar updated_at
CREATE TRIGGER update_bots_updated_at
    BEFORE UPDATE ON bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
