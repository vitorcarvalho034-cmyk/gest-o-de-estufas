-- Flores da Terra — Correção definitiva de hastes nas colheitas
--
-- O script faz duas coisas:
-- 1. Recupera registros existentes com cestos, mas hastes/pressas zeradas.
-- 2. Cria um trigger para preencher hastes e pressas automaticamente
--    em todo novo insert ou update, mesmo que a aplicação envie apenas cestos.

BEGIN;

CREATE OR REPLACE FUNCTION public.preencher_hastes_colheita()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  fator_hastes integer := 0;
  hastes_calculadas integer := 0;
  variedade_normalizada text := lower(coalesce(NEW.variedade, ''));
BEGIN
  -- Mantém o maior valor válido já informado em hastes ou no campo legado pressas.
  hastes_calculadas := greatest(coalesce(NEW.hastes, 0), coalesce(NEW.pressas, 0));

  -- Quando houver cestos, mas nenhuma haste informada, calcula pelo padrão comercial.
  IF hastes_calculadas = 0 AND coalesce(NEW.cestos, 0) > 0 THEN
    IF variedade_normalizada LIKE '%sinzii%'
       OR variedade_normalizada LIKE '%tasmania%'
       OR variedade_normalizada LIKE '%limonium%'
       OR variedade_normalizada LIKE '%klara%'
       OR variedade_normalizada LIKE '%piuma%'
       OR variedade_normalizada LIKE '%shooting star%'
       OR variedade_normalizada LIKE '%oshi%'
       OR variedade_normalizada LIKE '%supreme%' THEN
      fator_hastes := 40; -- Statice e Limonium
    ELSIF variedade_normalizada LIKE '%girassol%' THEN
      fator_hastes := 50;
    ELSIF NEW.destino = 'Mercado' OR NEW.destino = 'Oferta 60' THEN
      fator_hastes := 60;
    ELSIF NEW.destino = 'Oferta 80' THEN
      fator_hastes := 80;
    ELSIF NEW.destino = 'Barracão' THEN
      fator_hastes := 50;
    END IF;

    hastes_calculadas := coalesce(NEW.cestos, 0) * fator_hastes;
  END IF;

  NEW.hastes := hastes_calculadas;
  NEW.pressas := hastes_calculadas;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preencher_hastes_colheita ON public.colheitas;

CREATE TRIGGER trg_preencher_hastes_colheita
BEFORE INSERT OR UPDATE OF hastes, pressas, cestos, variedade, destino
ON public.colheitas
FOR EACH ROW
EXECUTE FUNCTION public.preencher_hastes_colheita();

-- Dispara o trigger nos registros existentes.
-- Só complementa linhas que têm uma das duas colunas zerada ou vazia.
UPDATE public.colheitas
SET cestos = cestos
WHERE coalesce(hastes, 0) = 0 OR coalesce(pressas, 0) = 0;

COMMIT;

-- Conferência opcional após executar:
-- SELECT data_colheita, variedade, destino, cestos, hastes, pressas
-- FROM public.colheitas
-- WHERE semana = 33
-- ORDER BY data_colheita DESC, variedade;
