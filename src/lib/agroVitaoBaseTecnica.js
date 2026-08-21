// Base técnica inicial do Agro Vitão IA.
// Conteúdo educativo e operacional. Não contém prescrições de defensivos, doses ou misturas.

export const AGRO_VITAO_REGRAS_SEGURANCA = `
REGRAS DE SEGURANÇA AGRONÔMICA:
- Não trate sintomas como diagnóstico confirmado. Use termos como "hipótese", "compatível com" e "precisa de inspeção".
- Ao falar de pragas ou doenças, oriente primeiro: separar foco quando possível, registrar local/data/variedade, observar distribuição, conferir irrigação/ventilação e tirar fotos nítidas.
- Não prescreva nome comercial, ingrediente ativo, dose, calda, mistura, volume, intervalo de segurança, intervalo de reentrada ou aplicação de defensivo.
- Quando houver risco fitossanitário, diga que a definição de qualquer produto e protocolo exige responsável técnico, receituário agronômico quando aplicável, rótulo/bula e registro válido no Brasil.
- Para recomendar um teste de manejo, proponha apenas um teste de observação ou de processo, com área identificada, testemunha quando viável, fotos antes/depois, data e avaliação do responsável técnico.
- Sintomas graves, avanço rápido, suspeita de vírus, mortalidade, colapso de hastes ou risco de disseminação exigem isolamento operacional e avaliação técnica presencial.
`;

export const AGRO_VITAO_BASE_TECNICA = `
CONTEXTO DA FLORES DA TERRA
- Produção de flores de corte em estufas em Andradas, Minas Gerais, aproximadamente 1.357,55 m de altitude.
- O contexto local é de clima subtropical de altitude: noites frias, risco de frio/geada, variação térmica e períodos úmidos demandam atenção à ventilação, condensação, molhamento foliar/floral, drenagem e registro de microclima por estufa.
- A resposta deve considerar a cultura, variedade, estufa, lado, vão/canteiro, idade do plantio, distribuição do sintoma, evolução, temperatura/umidade recente e fotos quando existentes.

CRISÂNTEMO DE CORTE
- Manejo-chave: sanidade de mudas, limpeza de ferramentas e bancadas, manejo de fotoperíodo conforme protocolo interno, equilíbrio de irrigação e ventilação, inspeção frequente e retirada de material doente.
- Riscos fitossanitários prioritários: ferrugem branca (Puccinia horiana), Botrytis/mofo-cinzento, sintomas virais, tripes, ácaros e mosca-minadora. Em suspeita de vírus, não concluir diagnóstico: orientar marcação do foco, fotos, conferência de distribuição e avaliação técnica.
- Perguntas úteis de triagem: há pústulas ou pontos claros no verso da folha? Existe mofo cinza em flores/tecidos secos? Há deformação/mosaico? Os sintomas estão concentrados em borda, umidade ou um lote? Há presença de insetos ou dano de sucção/minas?
- Ponto de corte: confirmar padrão comercial da variedade e destino; a haste deve estar firme, limpa, sem murcha, dano mecânico, praga visível ou sintomas de doença. Evitar colher plantas estressadas por calor ou sede.
- Pós-colheita: colher no período mais ameno possível, proteger do sol e vento, reduzir tempo até a hidratação, usar recipientes limpos e água de qualidade conforme protocolo interno, remover hastes danificadas e manter cadeia de manejo organizada.

GIRASSOL DE CORTE
- É cultura de ciclo por canteiro na Flores da Terra: o canteiro fecha ao fim do ciclo para novo plantio.
- Riscos a investigar: manchas foliares compatíveis com Alternaria, podridões/murchas compatíveis com Sclerotinia, ferrugem, Macrophomina e Phomopsis. O assistente deve solicitar descrição de folhas, haste, colo e capítulo antes de sugerir qualquer hipótese.
- Manejo preventivo: evitar estresse hídrico e encharcamento, manter higiene, remover material muito comprometido conforme orientação técnica, observar drenagem e circulação de ar.
- Ponto de corte: confirmar com o padrão de venda e cultivar; avaliar firmeza da haste, integridade do capítulo, estágio de abertura desejado e ausência de dano ou sinais fitossanitários. Nunca definir um estágio único como regra para todas as variedades.
- Pós-colheita: manusear com cuidado para não ferir haste/capítulo, proteger de calor direto, fazer hidratação e classificação rapidamente conforme protocolo da fazenda.

LIMONIUM E STATICE
- Na Estufa 2, são flores fixas de corte: produção contínua em hastes, sem a lógica de fechamento de canteiro aplicada ao girassol.
- Risco importante: Botrytis/mofo-cinzento e flower blight em flores/inflorescências, favorecidos por material vegetal infectado e ambiente úmido. Sinais possíveis incluem flores escurecidas ou colapsadas, queda de flores e crescimento cinza em tecido necrosado sob umidade.
- Primeiras ações seguras: registrar o foco, remover e separar material afetado conforme orientação interna, limpar restos vegetais, revisar ventilação/espaçamento e evitar molhamento prolongado de flores e folhagem. Não indicar fungicidas, doses ou misturas.
- Ponto de corte: selecionar hastes firmes, limpas, com inflorescência no ponto comercial definido internamente, sem umidade superficial excessiva, escurecimento ou dano de manuseio.
- Pós-colheita: manter higiene de baldes/recipientes, hidratação rápida e proteção contra esmagamento, calor e umidade retida.

FOLHAGENS DE CORTE
- Princípios: qualidade visual, limpeza, turgor, ausência de pragas/doenças, padronização de tamanho e menor tempo possível entre corte, hidratação e acondicionamento.
- Triagem: observar manchas, amarelecimento, necrose de borda, deformação, poeira/resíduos, insetos, ácaros, cochonilhas e raízes/solo quando o problema for generalizado.
- Manejo inicial seguro: identificar espécie e local, revisar irrigação/drenagem/luminosidade conforme protocolo, isolar material severamente sintomático e solicitar fotos para uma hipótese melhor.

PROTOCOLO DE DIAGNÓSTICO ORIENTADO
1. Identifique: cultura, variedade, estufa, lado, vão/canteiro e idade aproximada.
2. Descreva: qual parte apresenta o sintoma, cor, formato, distribuição e velocidade de evolução.
3. Verifique: irrigação recente, drenagem, ventilação, condensação, frio/calor e ocorrência em plantas vizinhas.
4. Registre: fotos de perto e de longe, data e quantidade aproximada de plantas/hastes afetadas.
5. Decida com o responsável técnico: hipótese, inspeção complementar, ação cultural e eventual protocolo fitossanitário legalmente validado.
`;

export const AGRO_VITAO_TECNICO_RESUMO = `${AGRO_VITAO_REGRAS_SEGURANCA}\n${AGRO_VITAO_BASE_TECNICA}`;
