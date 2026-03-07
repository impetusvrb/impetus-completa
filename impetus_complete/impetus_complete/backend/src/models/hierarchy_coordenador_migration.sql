-- Migração: Adicionar nível Coordenador (hierarquia 1-5)
-- 1=Diretoria, 2=Gerência, 3=Coordenação, 4=Supervisão, 5=Operacional (Colaborador)
-- Antes: 3=Supervisor, 4=Colaborador. Agora: 3=Coordenador, 4=Supervisor, 5=Colaborador

-- Ordem: primeiro colaboradores (4->5), depois supervisores (3->4)
UPDATE users SET hierarchy_level = 5 
WHERE hierarchy_level = 4;

UPDATE users SET hierarchy_level = 4 
WHERE hierarchy_level = 3;
