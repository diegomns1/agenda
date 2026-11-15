-- =============================================================================
-- 0032_reenvio_bloqueio_meta.sql — desmarcar as mensagens prontas que não chegaram (15/11/2026)
--   A Meta bloqueou os envios iniciados pela Vaguinha (problema na forma de pagamento da conta do
--   WhatsApp) e o painel marcou tudo como "enviada". Aqui essas mensagens passam a "não foi", para o
--   botão "Chamar no WhatsApp as que só entraram" e o envio automático mandarem de novo.
--   Fica de fora quem ESCREVEU para o número depois de receber: essa pessoa recebeu (ou já está em conversa).
--   Rodar DEPOIS da 0031 e uma vez só. Não apaga nada.
-- =============================================================================

-- 1) Envios de ativação (oferta de ajuda / pedido de feedback) pelo WhatsApp, anteriores ao acompanhamento de entrega
update public.ativacao_envios e
   set ok = false,
       erro = 'bloqueio da Meta: problema na forma de pagamento da conta do WhatsApp'
 where e.canal = 'whatsapp'
   and e.ok
   and e.wamid is null
   and not exists (
         select 1
           from public.whatsapp_contatos c
           join public.whatsapp_mensagens m on m.telefone = c.telefone
          where c.profissional_id = e.profissional_id
            and m.de = 'contato'
            and m.criado_em > e.enviado_em
       );

-- 2) As mesmas mensagens na Central (e as "retomar conversa"): aparecem como "Não foi entregue"
update public.whatsapp_mensagens m
   set status = 'falhou',
       erro = 'bloqueio da Meta: problema na forma de pagamento da conta do WhatsApp'
 where m.status = 'enviada'
   and m.wamid is not null
   and m.de in ('robo', 'equipe')
   and not exists (
         select 1
           from public.whatsapp_mensagens r
          where r.telefone = m.telefone
            and r.de = 'contato'
            and r.criado_em > m.criado_em
       );

-- 3) Resumo: quantas ficaram marcadas como "não foi", por tipo
select e.tipo,
       count(*)                              as mensagens_nao_entregues,
       count(distinct e.profissional_id)     as contas
  from public.ativacao_envios e
 where e.canal = 'whatsapp'
   and not e.ok
   and e.erro like 'bloqueio da Meta%'
 group by e.tipo
 order by e.tipo;
