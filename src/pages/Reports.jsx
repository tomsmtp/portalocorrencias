import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, X, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAlert } from '../context/AlertContext';

const COLORS = ['#004927', '#003220', '#1e40af', '#7c3aed', '#dc2626', '#ea580c'];

export function Reports({ user }) {
  const alert = useAlert();
  
  // Proteção: Admin não tem acesso a relatórios
  if (user?.cargo === 'admin') {
    return (
      <div className="bg-white p-8 border border-slate-200 text-center">
        <p className="text-slate-600 font-medium">Acesso negado. Administradores acessam apenas as configurações de usuários.</p>
      </div>
    );
  }

  const [apontamentos, setApontamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [safrasSelecionadas, setSafrasSelecionadas] = useState([]);
  const [viewMode, setViewMode] = useState('ano'); // 'ano' ou 'mes'

  // Carregar apontamentos da API
  const carregarApontamentos = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefrescando(true);
    } else {
      setLoading(true);
    }
    try {
      const token = localStorage.getItem('agromanager_token');
      const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        localStorage.removeItem('agromanager_token');
        localStorage.removeItem('agromanager_user');
        window.location.href = '/';
        return;
      }
      const data = await response.json();

      if (data.status === 'sucesso' && data.dados_apontamentos) {
        // Filtrar APENAS apontamentos com NOVO_APONTAMENTO = 'N' (já processados)
        const processados = data.dados_apontamentos.filter(apt => {
          const isProcessado = String(apt.NOVO_APONTAMENTO || '').toUpperCase() === 'N' || apt.NOVO_APONTAMENTO === false || apt.NOVO_APONTAMENTO === 0;
          return isProcessado;
        });

        console.log('Apontamentos carregados do backend:', data.dados_apontamentos.length);
        console.log('Apontamentos processados (NOVO_APONTAMENTO=N):', processados.length);
        setApontamentos(processados);
      }
    } catch (error) {
      console.error('Erro ao carregar apontamentos:', error);
      if (!isRefresh) {
        alert.error('Erro ao carregar dados de relatório');
      }
      setApontamentos([]);
    } finally {
      if (isRefresh) {
        setRefrescando(false);
      } else {
        setLoading(false);
      }
    }
  }, [alert]);

  // Carregar apontamentos na montagem e configurar polling (atualizar a cada 15 segundos)
  useEffect(() => {
    carregarApontamentos();

    // Polling automático: refazer fetch a cada 15 segundos
    const interval = setInterval(() => {
      carregarApontamentos(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [carregarApontamentos]);

  // Filtrar apontamentos cancelados
  const dataFiltrada = apontamentos.filter(item => item.STATUS !== 'cancelado' && item.STATUS !== 'revisao') || [];

  const processData = () => {
    if (!dataFiltrada || dataFiltrada.length === 0) return [];
    
    // Agrupa por ano (usando DATA_OCORRIDO)
    const agrupado = dataFiltrada.reduce((acc, curr) => {
      const ano = new Date(curr.DATA_OCORRIDO || curr.data_ocorrido || 0).getFullYear().toString();
      if (!acc[ano]) acc[ano] = 0;
      // Usar GASTO_TOTAL ou VALOR_OS conforme disponível
      acc[ano] += (curr.GASTO_TOTAL || curr.gasto_total || 0);
      return acc;
    }, {});
    
    return Object.keys(agrupado)
      .map(key => ({
        name: `Ano ${key}`,
        ano: key,
        gasto: agrupado[key]
      }))
      .sort((a, b) => b.ano.localeCompare(a.ano)); // Ordena do ano mais recente
  };

  const processDataByMonth = () => {
    if (!dataFiltrada || dataFiltrada.length === 0) return [];
    
    // Agrupa por mês/ano (usando DATA_OCORRIDO)
    const agrupado = dataFiltrada.reduce((acc, curr) => {
      const data = new Date(curr.DATA_OCORRIDO || curr.data_ocorrido || 0);
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const chave = `${ano}-${mes}`;
      
      if (!acc[chave]) acc[chave] = { gasto: 0, mes, ano };
      acc[chave].gasto += (curr.GASTO_TOTAL || curr.gasto_total || 0);
      return acc;
    }, {});
    
    return Object.keys(agrupado)
      .map(key => {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const { mes, ano, gasto } = agrupado[key];
        return {
          name: `${meses[parseInt(mes) - 1]}/${ano}`,
          chave: key,
          gasto
        };
      })
      .sort((a, b) => b.chave.localeCompare(a.chave)); // Ordena do mês mais recente
  };



  const chartData = processData();
  const chartDataMes = processDataByMonth();

  
  // Filtrar gráfico por safras selecionadas (só afeta visualização por ano)
  const chartDataFiltrado = safrasSelecionadas.length > 0 
    ? chartData.filter(item => safrasSelecionadas.includes(item.ano))
    : chartData;
  
  const chartDataMesFiltrado = chartDataMes;
  
  const totalGeral = chartDataFiltrado.reduce((acc, d) => acc + d.gasto, 0);
  const mediaGasto = chartDataFiltrado.length > 0 ? totalGeral / chartDataFiltrado.length : 0;
  const maiorGasto = Math.max(...chartDataFiltrado.map(d => d.gasto), 0);
  
  const handleToggleSafra = (ano) => {
    setSafrasSelecionadas(prev => 
      prev.includes(ano) 
        ? prev.filter(s => s !== ano)
        : [...prev, ano]
    );
  };

  const limparFiltros = () => {
    setSafrasSelecionadas([]);
  };

  const handleExport = async () => {
    if (chartDataFiltrado.length === 0) {
      alert.warning('Nenhum dado para exportar');
      return;
    }

    const alertId = alert.info('Gerando relatório... Aguarde.', 0);
    const safetyTimeout = setTimeout(() => alert.removeAlert(alertId), 60000);

    try {
      const nomeArquivo = `Relatorio_Gastos_${new Date().toISOString().split('T')[0]}`;
      handleExportXLSX(nomeArquivo);

      clearTimeout(safetyTimeout);
      alert.removeAlert(alertId);
      alert.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      clearTimeout(safetyTimeout);
      alert.removeAlert(alertId);
      alert.error('Erro ao gerar relatório');
    }
  };

  const handleExportXLSX = (nomeArquivo) => {
    // Preparar dados por ano
    const dataAno = chartDataFiltrado.map(item => ({
      'Período': item.name,
      'Valor Total': item.gasto,
      '% do Total': parseFloat(((item.gasto / totalGeral) * 100).toFixed(1))
    }));

    // Preparar dados por mês
    const dataMes = chartDataMesFiltrado.map(item => ({
      'Período': item.name,
      'Valor Total': item.gasto,
      '% do Total': parseFloat(((item.gasto / totalGeral) * 100).toFixed(1))
    }));

    // Criar workbook com duas abas
    const wb = XLSX.utils.book_new();
    
    const wsAno = XLSX.utils.json_to_sheet(dataAno);
    const wsMes = XLSX.utils.json_to_sheet(dataMes);
    
    // Formatação das colunas
    wsAno['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
    wsMes['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
    
    XLSX.utils.book_append_sheet(wb, wsAno, 'Por Ano');
    XLSX.utils.book_append_sheet(wb, wsMes, 'Por Mês');
    
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Relatórios</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => carregarApontamentos(true)}
            disabled={refrescando}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all font-medium border border-slate-300 text-sm"
            title="Atualizar dados"
          >
            <RefreshCw size={20} className={refrescando ? 'animate-spin' : ''} />
            {refrescando ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button 
            onClick={handleExport}
            disabled={loading || chartDataFiltrado.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] disabled:bg-slate-400 disabled:cursor-not-allowed transition-all font-medium text-sm"
          >
            <Download size={20} />
            Exportar XLSX
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="bg-white p-12 border border-slate-200 flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#004927]" size={24} />
          <span className="text-slate-600 font-medium">Carregando dados de apontamentos...</span>
        </div>
      ) : dataFiltrada.length === 0 ? (
        <div className="bg-white p-12 border border-slate-200 text-center">
          <p className="text-slate-600 font-medium">Nenhum apontamento processado disponível</p>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Gastos</p>
              <p className="text-lg font-bold text-slate-800 mt-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
              </p>
            </div>
            
            <div className="bg-white p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Média por Ano</p>
              <p className="text-lg font-bold text-blue-600 mt-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mediaGasto)}
              </p>
            </div>
            
            <div className="bg-white p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Maior Gasto</p>
              <p className="text-lg font-bold text-amber-600 mt-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maiorGasto)}
              </p>
            </div>
            
            <div className="bg-white p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apontamentos</p>
              <p className="text-lg font-bold text-green-600 mt-2">{dataFiltrada.length}</p>
            </div>
          </div>

          {/* ABAS DE VISUALIZAÇÃO */}
          <div className="bg-white border-b border-slate-200 flex gap-1">
            <button
              onClick={() => setViewMode('ano')}
              className={`px-4 py-3 font-bold text-sm transition-all ${
                viewMode === 'ano'
                  ? 'border-b-2 border-[#004927] text-[#004927] bg-slate-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por Ano
            </button>
            <button
              onClick={() => setViewMode('mes')}
              className={`px-4 py-3 font-bold text-sm transition-all ${
                viewMode === 'mes'
                  ? 'border-b-2 border-[#004927] text-[#004927] bg-slate-50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Por Mês
            </button>
          </div>

          {/* CONTEÚDO POR VISUALIZAÇÃO */}
          {viewMode === 'ano' ? (
            <>

          {/* FILTROS POR SAFRA */}
          <div className="bg-white p-4 border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-3">Filtrar por ano</h3>
            <div className="flex flex-wrap gap-2">
              {chartData.map(item => (
                <button
                  key={item.ano}
                  onClick={() => handleToggleSafra(item.ano)}
                  className={`px-4 py-2 font-bold transition-all ${
                    safrasSelecionadas.includes(item.ano)
                      ? 'bg-[#004927] text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.name}
                </button>
              ))}
              {safrasSelecionadas.length > 0 && (
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1"
                >
                  <X size={16} /> Limpar
                </button>
              )}
            </div>
            {safrasSelecionadas.length > 0 && (
              <p className="text-sm text-slate-500 mt-3">
                Mostrando {safrasSelecionadas.length} de {chartData.length} ano(s)
              </p>
            )}
          </div>

          {/* GRÁFICO DE GASTOS POR ANO */}
          <div className="bg-white p-8 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-8 text-center uppercase tracking-widest">Gasto Total por Ano</h3>
            
            {chartDataFiltrado.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataFiltrado} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      formatter={(v) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Gasto Total']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="gasto" fill="#004927" radius={[8, 8, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 font-medium">
                Nenhum ano selecionado
              </div>
            )}
          </div>

            </>
          ) : (
            <>
              {/* GRÁFICO DE GASTOS POR MÊS */}
              <div className="bg-white p-8 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-8 text-center uppercase tracking-widest">Gasto Total por Mês</h3>
                
                {chartDataMesFiltrado.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataMesFiltrado} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          formatter={(v) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Gasto Total']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="gasto" fill="#004927" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 font-medium">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </>
          )}

        </>
      )}
    </div>
  );
}


