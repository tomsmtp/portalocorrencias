import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import iconAGT from '../assets/icon.png';

export function generateBoletimPDF(apontamento) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 8;
  const margin = 10;

  // ===== LOGOS NOS CANTOS =====
  try {
    // Logo esquerdo
    doc.addImage(iconAGT, 'PNG', margin, 2, 14, 14);
  } catch (e) {
    // Logo não pôde ser carregado - continuar sem ela
  }

  // ===== CABEÇALHO COM TITULO =====
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('BOLETIM DE OCORRÊNCIA', pageWidth / 2, 10, { align: 'center' });
  
  // B.O. número (lado direito, em vermelho)
  doc.setTextColor(220, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(`B.O. Nº: ${apontamento.nboletim || 'N/A'}`, pageWidth - margin - 5, 10, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  
  // Linha separadora suave
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, 18, pageWidth - margin, 18);

  yPosition = 22;

  // ===== DADOS GERAIS =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Dados Gerais', margin, yPosition);
  yPosition += 7;

  const dadosGeraisTable = [
    [
      'Ocorrência:',
      apontamento.ocorrencia || '',
      'Data ocorrido:',
      apontamento.data_apontamento ? new Date(apontamento.data_apontamento).toLocaleDateString('pt-BR') : ''
    ],
    [
      'Local:',
      apontamento.local || '',
      'Data/portaria:',
      apontamento.data_portaria ? new Date(apontamento.data_portaria).toLocaleDateString('pt-BR') : ''
    ],
    [
      'Município:',
      apontamento.municipio || '',
      'Elaborado por:',
      apontamento.elaborado_por || ''
    ],
    [
      'Equipamento:',
      { content: apontamento.equipamento || '', colSpan: 3 }
    ]
  ];

  autoTable(doc, {
    head: [],
    body: dadosGeraisTable,
    startY: yPosition,
    margin: margin,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 30, fontStyle: 'bold' },
      3: { cellWidth: 40 }
    }
  });

  yPosition = doc.lastAutoTable.finalY + 5;

  // Linha separadora suave
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
  yPosition += 1.5;

  // ===== DADOS COLABORADOR =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Dados Colaborador', margin, yPosition);
  yPosition += 4;

  const dadosColaboradorTable = [
    [
      'Colaborador:',
      apontamento.colaborador || '',
      'RG:',
      apontamento.rg || ''
    ],
    [
      'Matrícula:',
      apontamento.matricula || '',
      'CPF:',
      apontamento.cpf || ''
    ],
    [
      'Data de Admissão:',
      apontamento.data_admissao ? new Date(apontamento.data_admissao).toLocaleDateString('pt-BR') : '',
      'Nº (CNH):',
      apontamento.ncnh || ''
    ],
    [
      'Área:',
      apontamento.area || '',
      'Validade (CNH):',
      apontamento.validade_cnh || ''
    ],
    [
      'Função:',
      apontamento.funcao || '',
      'Categoria (CNH):',
      apontamento.categoria_cnh || ''
    ],
    [
      'Supervisor:',
      apontamento.supervisor || '',
      'Telefone:',
      apontamento.telefone || ''
    ]
  ];

  autoTable(doc, {
    head: [],
    body: dadosColaboradorTable,
    startY: yPosition,
    margin: margin,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 30, fontStyle: 'bold' },
      3: { cellWidth: 40 }
    }
  });

  yPosition = doc.lastAutoTable.finalY + 3;

  // Linha separadora suave
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
  yPosition += 1.5;

  // ===== RELATO DO COLABORADOR =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Relato do Colaborador', margin, yPosition);
  yPosition += 3;

  // Desenhar caixa para o relato do colaborador
  const relatoColaboradorText = apontamento.relato_colaborador || '';
  const relatoColaboradorWrapped = doc.splitTextToSize(relatoColaboradorText, pageWidth - 2 * margin - 4);
  const relatoColaboradorHeight = 25; // Altura reduzida
  
  // Desenhar retângulo da caixa
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, relatoColaboradorHeight);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  const relatoColaboradorDisplay = relatoColaboradorWrapped.slice(0, 8);
  doc.text(relatoColaboradorDisplay, margin + 1.5, yPosition + 2.5);
  
  yPosition += relatoColaboradorHeight + 3;

  // Linha separadora suave
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
  yPosition += 1.5;

  // ===== RELATO DO SUPERIOR =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Relato do Superior', margin, yPosition);
  yPosition += 3;

  // Desenhar caixa para o relato do superior
  const relatoSuperiorText = apontamento.relato_superior || '';
  const relatoSuperiorWrapped = doc.splitTextToSize(relatoSuperiorText, pageWidth - 2 * margin - 4);
  const relatoSuperiorHeight = 25; // Altura reduzida
  
  // Desenhar retângulo da caixa
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, relatoSuperiorHeight);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  const relatoSuperiorDisplay = relatoSuperiorWrapped.slice(0, 8);
  if (relatoSuperiorDisplay.length > 0) {
    doc.text(relatoSuperiorDisplay, margin + 1.5, yPosition + 2.5);
  }
  
  yPosition += relatoSuperiorHeight + 3;

  // ===== CONCLUSÃO =====
  if (yPosition > pageHeight - 55) {
    doc.addPage();
    yPosition = 10;
  }

  // Linha separadora suave
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
  yPosition += 1.5;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Conclusão:', margin, yPosition);
  yPosition += 4;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  const conclusoes = [
    { label: 'Falha operacional', value: apontamento.conclusao_falha_operacional },
    { label: 'Condição insegura', value: apontamento.conclusao_condicao_insegura },
    { label: 'Falha mecânica', value: apontamento.conclusao_falha_mecanica },
    { label: 'Condição adversa/tempo', value: apontamento.conclusao_condicao_adversa },
    { label: 'Causa desconhecida/furto/outros', value: apontamento.conclusao_causa_desconhecida }
  ];

  conclusoes.forEach(item => {
    // Desenhar caixa de checkbox
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin + 1.5, yPosition - 2, 2.5, 2.5); // Pequeno quadrado
    
    // Marcar se selecionado
    if (item.value) {
      doc.text('X', margin + 2.3, yPosition);
    }
    
    doc.text(item.label, margin + 5.5, yPosition);
    yPosition += 4.5;
  });

  yPosition += 3;

  // ===== ASSINATURAS =====
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  
  const signatureY = Math.max(yPosition, pageHeight - 30);
  
  // Supervisor - Assinatura
  doc.text('Supervisor', margin + 5, signatureY);
  
  // Adicionar imagem da assinatura do supervisor, se existir
  if (apontamento.assinatura_supervisor) {
    try {
      doc.addImage(apontamento.assinatura_supervisor, 'PNG', margin, signatureY + 3, 30, 12);
    } catch (e) {
      // Assinatura do supervisor não pôde ser carregada - continuar sem ela
    }
  }
  
  // Linha embaixo da assinatura do supervisor
  doc.line(margin, signatureY + 16, margin + 30, signatureY + 16);

  // Gerente - Assinatura
  doc.text('Gerente', pageWidth - margin - 30, signatureY);
  
  // Adicionar imagem da assinatura do gerente, se existir
  if (apontamento.assinatura_gerente) {
    try {
      doc.addImage(apontamento.assinatura_gerente, 'PNG', pageWidth - margin - 30, signatureY + 3, 30, 12);
    } catch (e) {
      // Assinatura do gerente não pôde ser carregada - continuar sem ela
    }
  }
  
  // Linha embaixo da assinatura do gerente
  doc.line(pageWidth - margin - 30, signatureY + 16, pageWidth - margin, signatureY + 16);

  // Salvar PDF
  const nomeArquivo = `Boletim_${apontamento.nboletim}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nomeArquivo);
}
