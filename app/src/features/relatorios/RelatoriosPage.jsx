import { firstValue, hasValue, matchContractEquipment, resolveServiceClient, resolveServiceContract } from '../../lib/serviceLinks.js';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, Brain, CheckSquare, Download, Eye, FileSpreadsheet, Filter, MapPin, Package, Printer, RotateCcw, Save, Trash2, UserRound, Wrench, FileText } from 'lucide-react';
import { escapeHtml, printHtml } from '../../lib/printHtml.js';
import { brDateToISO, dateBR, equipmentForFicha as resolveEquipmentForFicha, getMonthBounds, machineForFicha } from '../../lib/reports.js';
import { downloadXlsx } from '../../lib/xlsx.js';
import { DateInput } from '../../components/DateInput.jsx';
import { buildReportTotalRow, machineFilterMatches, machineOptionLabel, reportMachineGroupKey, reportMachineOptions } from './relatorioHelpers.js';
import { MATERIAL_UNIT_OPTIONS } from '../../lib/units.js';
// Importações dos novos módulos (serão usados gradualmente)
import { tabs as tabsImport, reportFields as reportFieldsImport, reportTemplates as reportTemplatesImport, SAVED_REPORTS_KEY as SAVED_REPORTS_KEYImport, reportTemplateHints as reportTemplateHintsImport, REPORT_BRAND_CSS as REPORT_BRAND_CSSImport, reportBrandHtml as reportBrandHtmlImport } from './reportConstants.js';
import { readSavedReportModels as readSavedReportModelsImport, writeSavedReportModels as writeSavedReportModelsImport } from './reportFilters.js';
import { buildRows as buildRowsImport } from './reportRowBuilder.js';
import { exportDatasetXlsx as exportDatasetXlsxImport, printDataset as printDatasetImport, exportDesignerXlsx as exportDesignerXlsxImport, printDesignerDataset as printDesignerDatasetImport, quantityByUnit as quantityByUnitImport } from './reportExport.js';
import { groupRows as groupRowsImport, groupRowsByUnit as groupRowsByUnitImport, groupMachineRows as groupMachineRowsImport } from './reportGrouping.js';
import { datasetForTab as datasetForTabImport, reportContext as reportContextImport, datasetForOutput as datasetForOutputImport, datasetFromFields as datasetFromFieldsImport, reportReadiness as reportReadinessImport, moveField as moveFieldImport } from './reportDataset.js';

const tabs = tabsImport;

const presets = [
  { id: 'clientes', label: 'Cliente / obra', desc: 'Movimento por cliente e endereço', icon: UserRound },
  { id: 'maquinas', label: 'Máquina por obra', desc: 'Uso da frota por obra', icon: Wrench },
  { id: 'materiais', label: 'Material usado', desc: 'Materiais lançados nas fichas', icon: Package },
  { id: 'barreiros', label: 'Barreiro / origem', desc: 'Origem dos materiais', icon: MapPin },
  { id: 'pedidos', label: 'Pedido / contrato', desc: 'Notas, pedidos e contratos', icon: FileText },
  { id: 'geral', label: 'Resumo geral', desc: 'Últimos serviços filtrados', icon: BarChart3 },
];

const reportFields = reportFieldsImport;
const reportTemplates = reportTemplatesImport;
const SAVED_REPORTS_KEY = SAVED_REPORTS_KEYImport;
const reportTemplateHints = reportTemplateHintsImport;
const REPORT_BRAND_CSS = REPORT_BRAND_CSSImport;
const reportBrandHtml = reportBrandHtmlImport;

const readSavedReportModels = readSavedReportModelsImport;
const writeSavedReportModels = writeSavedReportModelsImport;

// REPORT_BRAND_CSS e reportBrandHtml movidos para reportConstants.js

function num(value) {
  const raw = String(value || 0).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return num(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function qtd(value) {
  return num(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// Funções de utilitário movidas para reportConstants.js
// Funções de serviço movidas para reportRowBuilder.js

const groupRows = groupRowsImport;
const groupRowsByUnit = groupRowsByUnitImport;
const groupMachineRows = groupMachineRowsImport;
const buildRows = buildRowsImport;

function Table({ headers, rows, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.join('|')}-${index}`}>
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
          {!rows.length ? <tr><td className="empty-cell" colSpan={headers.length}>{empty || 'Sem dados para estes filtros.'}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

// groupMachineRows movido para reportGrouping.js

const datasetForTab = datasetForTabImport;
const uniqueValues = (rows, field) => Array.from(new Set(rows.map((row) => row[field]).filter(Boolean)));
const reportContext = reportContextImport;
const datasetForOutput = datasetForOutputImport;
const datasetFromFields = datasetFromFieldsImport;
const reportReadiness = reportReadinessImport;
const moveField = moveFieldImport;

// Funções de exportação movidas para reportExport.js

const exportDatasetXlsx = exportDatasetXlsxImport;
const printDataset = printDatasetImport;
const exportDesignerXlsx = exportDesignerXlsxImport;
const printDesignerDataset = printDesignerDatasetImport;
const quantityByUnit = quantityByUnitImport;

// Componente principal

export function RelatoriosPage({ data }) {
  const bounds = getMonthBounds();
  const [activeTab, setActiveTab] = useState('geral');
  const [filters, setFilters] = useState({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  const [showAI, setShowAI] = useState(false);
  const [designerMode, setDesignerMode] = useState(true);
  const [customTitle, setCustomTitle] = useState('Relatorio personalizado');
  const [selectedFields, setSelectedFields] = useState(reportTemplates[0].fields);
  const [selectedTemplate, setSelectedTemplate] = useState(reportTemplates[0].id);
  const [savedModels, setSavedModels] = useState(readSavedReportModels);
  const activeReport = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const machines = useMemo(() => reportMachineOptions(data), [data]);

  const rows = useMemo(() => buildRows(data, filters), [data, filters]);
  const dataset = useMemo(() => datasetForTab(activeTab, rows), [activeTab, rows]);
  const context = useMemo(() => reportContext(rows, filters, data), [rows, filters, data]);
  const designerTitle = selectedTemplate === 'padrao-cliente'
    ? String(context.obra || 'Todas as obras').toUpperCase()
    : customTitle || 'Relatorio personalizado';
  const customDataset = useMemo(() => datasetFromFields(rows, selectedFields, designerTitle), [rows, selectedFields, designerTitle]);
  const outputDataset = designerMode ? customDataset : dataset;
  const previewGroups = useMemo(() => groupRows(rows, (row) => `${row.cliente || 'Sem cliente'}|${row.obra || 'Sem obra'}`).slice(0, 4), [rows]);
  const selectedCliente = useMemo(() => {
    if (!filters.cliente) return '';
    const cliente = (data?.clientes || []).find((item) => String(item.id) === String(filters.cliente));
    return cliente?.fantasia || cliente?.nome || '';
  }, [data, filters.cliente]);

  const totals = useMemo(() => {
    const fichas = new Set(rows.map((row) => row.ficha_id).filter(Boolean));
    const obras = new Set(rows.map((row) => row.obra).filter(Boolean));
    return {
      servicos: rows.length,
      fichas: fichas.size,
      obras: obras.size,
      qtd: rows.reduce((sum, row) => sum + num(row.quantidade), 0),
      valor: rows.reduce((sum, row) => sum + num(row.valor), 0),
    };
  }, [rows]);
  const totalsByUnit = useMemo(() => quantityByUnit(rows), [rows]);
  const readiness = useMemo(() => reportReadiness(rows, selectedFields, context), [rows, selectedFields, context]);
  const selectedFieldLabels = useMemo(() => (
    selectedFields
      .map((fieldId) => reportFields.find((field) => field.id === fieldId)?.label || fieldId)
  ), [selectedFields]);

  const insights = useMemo(() => {
    const maquinas = groupMachineRows(rows);
    const clientes = groupRows(rows, (row) => row.cliente || 'Sem cliente');
    const materiais = groupRows(rows.filter((row) => row.material), (row) => row.material);
    const lines = [];
    if (!rows.length) lines.push('Nenhum serviço encontrado nos filtros atuais.');
    if (maquinas.length) lines.push(`Máquina mais usada: ${maquinas[0].nome} com ${maquinas[0].servicos} serviço(s) em ${maquinas[0].obrasCount} obra(s).`);
    if (clientes.length) lines.push(`Cliente/obra com mais movimento: ${clientes[0].nome} com ${clientes[0].servicos} lançamento(s).`);
    if (materiais.length) lines.push(`Material mais movimentado: ${materiais[0].nome} com ${qtd(materiais[0].qtd)} registrado(s).`);
    lines.push(`Total filtrado: ${rows.length} serviço(s), ${money(totals.valor)}.`);
    return lines;
  }, [rows, totals.valor]);

  function updateFilter(field, value) {
    const normalizedValue = field === 'ini' || field === 'fim'
      ? (brDateToISO(value) || value)
      : value;
    setFilters((current) => ({ ...current, [field]: normalizedValue }));
  }

  function choosePreset(tab) {
    setActiveTab(tab);
    setDesignerMode(false);
    setShowAI(false);
  }

  function applyTemplate(templateId) {
    const template = reportTemplates.find((item) => item.id === templateId) || reportTemplates[0];
    setSelectedTemplate(template.id);
    setSelectedFields(template.fields);
    setCustomTitle(template.label);
    setDesignerMode(true);
  }

  function saveCurrentModel() {
    const title = (customTitle || designerTitle || 'Relatorio personalizado').trim();
    const model = {
      id: `${Date.now()}`,
      title,
      templateId: selectedTemplate,
      fields: selectedFields,
    };
    setSavedModels((current) => {
      const next = [model, ...current].slice(0, 8);
      writeSavedReportModels(next);
      return next;
    });
  }

  function applySavedModel(model) {
    setSelectedTemplate(model.templateId || 'personalizado');
    setSelectedFields(Array.isArray(model.fields) && model.fields.length ? model.fields : reportTemplates[0].fields);
    setCustomTitle(model.title || 'Relatorio personalizado');
    setDesignerMode(true);
  }

  function deleteSavedModel(modelId) {
    setSavedModels((current) => {
      const next = current.filter((model) => model.id !== modelId);
      writeSavedReportModels(next);
      return next;
    });
  }

  function toggleField(fieldId) {
    setSelectedFields((current) => {
      if (current.includes(fieldId)) {
        const next = current.filter((item) => item !== fieldId);
        return next.length ? next : current;
      }
      return [...current, fieldId];
    });
  }

  function resetFilters() {
    setFilters({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  }

  const selectedMachineLabel = filters.maquina
    ? (machines.find((machine) => machine.value === filters.maquina)?.label || filters.maquina)
    : '';

  const filterChips = [
    `Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`,
    selectedCliente ? `Cliente: ${selectedCliente}` : 'Clientes: todos',
    selectedMachineLabel ? `Máquina: ${selectedMachineLabel}` : 'Máquinas: todas',
    filters.busca ? `Busca: ${filters.busca}` : null,
  ].filter(Boolean);

  return (
    <section>
      <div className="report-header">
        <div>
          <h2>Central de Relatórios</h2>
          <p>Cruze fichas, clientes, obras, máquinas, materiais, barreiros e pedidos.</p>
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => setShowAI((value) => !value)}><Brain size={15} /> Análise IA</button>
        </div>
      </div>

      <section className="report-lab-strip" aria-label="Resumo do laboratorio de relatorios">
        <article>
          <span>Modelo ativo</span>
          <strong>{designerMode ? customDataset.title : activeReport.label}</strong>
          <small>{designerMode ? `${selectedFields.length} coluna(s) editaveis` : 'relatorio pronto'}</small>
        </article>
        <article>
          <span>Dados filtrados</span>
          <strong>{rows.length}</strong>
          <small>{dateBR(filters.ini)} a {dateBR(filters.fim)}</small>
        </article>
        <article>
          <span>Quantidade</span>
          <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
          <small>separado por unidade do lancamento</small>
        </article>
        <article>
          <span>Saida</span>
          <strong>PDF + Excel</strong>
          <small>com identidade Binhotti</small>
        </article>
        <article>
          <span>Modelos salvos</span>
          <strong>{savedModels.length}</strong>
          <small>layouts personalizados neste navegador</small>
        </article>
      </section>

      <section className="panel report-builder">
        <div className="report-step">
          <span>1. Escolha um relatório pronto</span>
          <div className="report-presets">
            {presets.map((preset) => (
              <button key={preset.id} className={activeTab === preset.id ? 'active' : ''} type="button" onClick={() => choosePreset(preset.id)}>
                <preset.icon size={15} />
                <span>
                  <strong>{preset.label}</strong>
                  <small>{preset.desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="report-step">
          <span>2. Refine o período e os filtros</span>
          <div className="filters-grid report-filters">
            <label>
              Data inicial
              <DateInput value={filters.ini} onChange={(value) => updateFilter('ini', value)} />
            </label>
            <label>
              Data final
              <DateInput value={filters.fim} onChange={(value) => updateFilter('fim', value)} />
            </label>
            <label>
              Cliente
              <select value={filters.cliente} onChange={(event) => updateFilter('cliente', event.target.value)}>
                <option value="">Todos os clientes</option>
                {(data?.clientes || []).map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.fantasia || cliente.nome}</option>)}
              </select>
            </label>
            <label>
              Máquina
              <select value={filters.maquina} onChange={(event) => updateFilter('maquina', event.target.value)}>
                <option value="">Todas as máquinas</option>
                {machines.map((machine) => <option key={machine.value} value={machine.value}>{machine.label}</option>)}
              </select>
            </label>
            <label>
              Busca livre
              <input value={filters.busca} onChange={(event) => updateFilter('busca', event.target.value)} placeholder="obra, pedido, material..." />
            </label>
          </div>
        </div>
      </section>


      <section className="panel report-designer">
        <div className="designer-topline">
          <div>
            <span>Designer de relatorio</span>
            <h3>Relatorio editavel</h3>
            <p>Monte o layout, escolha as colunas e confira a folha antes de exportar.</p>
          </div>
          <label className="designer-switch">
            <input type="checkbox" checked={designerMode} onChange={(event) => setDesignerMode(event.target.checked)} />
            <span>Usar relatorio editavel</span>
          </label>
          <button className="ghost-button" type="button" onClick={saveCurrentModel}><Save size={15} /> Salvar modelo</button>
        </div>

        <div className="designer-live-summary">
          <article>
            <span>Modelo</span>
            <strong>{selectedTemplate === 'padrao-cliente' ? 'Por obra' : customTitle || 'Personalizado'}</strong>
          </article>
          <article>
            <span>Colunas</span>
            <strong>{selectedFields.length}</strong>
          </article>
          <article>
            <span>Linhas filtradas</span>
            <strong>{rows.length}</strong>
          </article>
          <article>
            <span>Quantidades</span>
            <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
          </article>
        </div>

        <div className="designer-guidance">
          <article>
            <span>Uso recomendado</span>
            <strong>{reportTemplates.find((template) => template.id === selectedTemplate)?.label || 'Relatorio personalizado'}</strong>
            <p>{reportTemplateHints[selectedTemplate] || 'Ajuste as colunas para montar um modelo proprio da Binhotti.'}</p>
          </article>
          <article className={`readiness-card ${readiness.level}`}>
            <span>Status do relatorio</span>
            <strong>{readiness.title}</strong>
            <p>{readiness.text}</p>
          </article>
        </div>

        <div className="designer-pipeline" aria-label="Fluxo de geracao do relatorio">
          <span className="active"><b>01</b> Modelo</span>
          <span className="active"><b>02</b> Campos</span>
          <span className="active"><b>03</b> Preview</span>
          <span><b>04</b> Exportar</span>
        </div>

        <div className="designer-layout">
          <aside className="designer-sidebar">
            <label className="fg">
              <span className="fl">Titulo do relatorio</span>
              <input
                value={selectedTemplate === 'padrao-cliente' ? designerTitle : customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                disabled={selectedTemplate === 'padrao-cliente'}
                placeholder="Ex: Obra Barra View"
              />
            </label>
            <div className="designer-block">
              <strong>Modelos prontos</strong>
              {reportTemplates.map((template) => (
                <button key={template.id} type="button" className={selectedTemplate === template.id ? 'active' : ''} onClick={() => applyTemplate(template.id)}>
                  <CheckSquare size={15} />
                  <span><b>{template.label}</b><small>{template.desc}</small></span>
                </button>
              ))}
            </div>
            <div className="designer-block saved-models">
              <strong>Modelos salvos</strong>
              {savedModels.map((model) => (
                <div className="saved-model-row" key={model.id}>
                  <button type="button" onClick={() => applySavedModel(model)}>
                    <CheckSquare size={15} />
                    <span><b>{model.title}</b><small>{model.fields?.length || 0} coluna(s)</small></span>
                  </button>
                  <button className="delete-saved-model" type="button" aria-label="Excluir modelo salvo" onClick={() => deleteSavedModel(model.id)}><Trash2 size={14} /></button>
                </div>
              ))}
              {!savedModels.length ? <small className="saved-empty">Nenhum modelo salvo ainda.</small> : null}
            </div>
          </aside>

          <div className="designer-fields">
            <div className="designer-block-title designer-fields-head">
              <div>
                <strong>Campos do relatorio</strong>
                <small>Escolha o que entra no PDF e no Excel. Os campos azuis ja estao no modelo.</small>
              </div>
              <span>{selectedFields.length}<small>colunas</small></span>
            </div>
            <div className="designer-mini-steps" aria-label="Configuracao do modelo">
              <span className={selectedTemplate ? 'done' : ''}>Modelo</span>
              <span className={selectedFields.length ? 'done' : ''}>Campos</span>
              <span className={rows.length ? 'done' : ''}>Dados</span>
              <span className={selectedFields.length && rows.length ? 'done' : ''}>Exportacao</span>
            </div>
            <div className="field-check-grid">
              {reportFields.map((field) => (
                <button
                  className={`field-toggle ${selectedFields.includes(field.id) ? 'active' : ''}`}
                  key={field.id}
                  type="button"
                  aria-pressed={selectedFields.includes(field.id)}
                  onClick={() => toggleField(field.id)}
                >
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.group}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="selected-fields-strip">
              <div className="selected-fields-head">
                <div>
                  <strong>Ordem final no PDF e Excel</strong>
                  <small>Use as setas para montar a sequencia exata das colunas.</small>
                </div>
                <em>{selectedFields.length} selecionada(s)</em>
              </div>
              <div>
                {selectedFields.map((fieldId, index) => {
                  const field = reportFields.find((item) => item.id === fieldId);
                  return (
                    <span key={fieldId}>
                      <b>{String(index + 1).padStart(2, '0')}</b>
                      {field?.label || fieldId}
                      <button type="button" aria-label="Mover para esquerda" onClick={() => setSelectedFields((current) => moveField(current, fieldId, -1))}><ArrowUp size={12} /></button>
                      <button type="button" aria-label="Mover para direita" onClick={() => setSelectedFields((current) => moveField(current, fieldId, 1))}><ArrowDown size={12} /></button>
                    </span>
                  );
                })}
                {!selectedFields.length ? <small className="saved-empty">Selecione pelo menos uma coluna para montar o relatorio.</small> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="report-preview">
          <div className="preview-sheet">
            <div className="preview-doc-head">
              <div>
                <span>Preview do modelo</span>
                <strong>Binhotti Terraplenagem</strong>
              </div>
              <small>{dateBR(filters.ini)} a {dateBR(filters.fim)}</small>
            </div>
            <div className="preview-title">
              <span>{designerTitle}</span>
              <small>{selectedFields.length} coluna(s) no PDF e Excel</small>
            </div>
            <div className="preview-unit-banner">
              <span>Quantidades por unidade</span>
              <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
            </div>
            <div className="preview-context-grid">
              <article><span>Cliente</span><strong>{context.cliente}</strong></article>
              <article><span>Obra</span><strong>{context.obra}</strong></article>
              <article><span>Linhas</span><strong>{rows.length}</strong></article>
              <article><span>Valor</span><strong>{money(totals.valor)}</strong></article>
            </div>
            <div className="preview-groups">
              {previewGroups.map((group) => {
                const [cliente, ...obra] = group.nome.split('|');
                return <span key={group.nome}><b>{cliente}</b>{obra.join('|') || '-'}<em>{group.servicos} item(ns)</em></span>;
              })}
            </div>
            <div className="preview-column-list">
              <strong>Colunas selecionadas</strong>
              <div>
                {selectedFieldLabels.map((label, index) => <span key={`${label}-${index}`}>{index + 1}. {label}</span>)}
              </div>
            </div>
            <Table headers={customDataset.headers} rows={customDataset.body.slice(0, 8)} empty="Sem dados para visualizar." />
            <small className="preview-foot"><Eye size={13} /> Preview das primeiras linhas. PDF e Excel saem com todos os dados filtrados.</small>
          </div>
        </div>
      </section>
      <section className="selected-report-card">
        <div>
          <span>Relatório selecionado</span>
          <strong>{designerMode ? customDataset.title : activeReport.label}</strong>
          <small>{rows.length} lançamento(s), {qtd(totals.qtd)} em quantidade, {money(totals.valor)} em valor.</small>
          <div className="report-filter-chips">
            {filterChips.map((chip) => <em key={chip}><Filter size={12} /> {chip}</em>)}
          </div>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={resetFilters}><RotateCcw size={15} /> Limpar filtros</button>
          <button className="ghost-button" type="button" disabled={!outputDataset.body.length} onClick={() => exportDesignerXlsx(outputDataset, rows, filters, totals, data)}><FileSpreadsheet size={15} /> Gerar Excel</button>
          <button className="primary-button" type="button" disabled={!outputDataset.body.length} onClick={() => printDesignerDataset(outputDataset, filters, totals, rows, data)}><Printer size={15} /> Gerar PDF</button>
        </div>
      </section>

      {showAI ? (
        <section className="ai-panel">
          <strong>Análise inteligente - Simplo IA</strong>
          {insights.map((line) => <p key={line}>{line}</p>)}
        </section>
      ) : null}

      <div className="stats-grid">
        <article className="stat-card"><div><span>Serviços</span><strong>{totals.servicos}</strong><small>{totals.fichas} ficha(s)</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Obras</span><strong>{totals.obras}</strong><small>endereços/clientes</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Quantidade</span><strong>{qtd(totals.qtd)}</strong><small>m³, unidades, horas e diárias</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Valor</span><strong>{money(totals.valor)}</strong><small>serviços lançados</small></div><Download size={22} /></article>
      </div>

      <div className="tabs-row">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>{dataset.title}</h2>
          <span>Relatório selecionado: {activeReport.label}</span>
        </div>
        <Table headers={dataset.headers} rows={dataset.body} />
      </section>
    </section>
  );
}
