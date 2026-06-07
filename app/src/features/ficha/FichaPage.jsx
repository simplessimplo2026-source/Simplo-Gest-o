import { useMemo, useState } from 'react';
import { Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { deleteRow, deleteRows, insertRow, updateRow } from '../../lib/supabase.js';
import { printHtml } from '../../lib/printHtml.js';
import { dateBR, machineForFicha, minutesToText, workMinutes } from '../../lib/reports.js';
import { hasServiceContent, servicePayload } from './fichaHelpers.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { FichaModal } from './FichaModal.jsx';
import binhottiLogoColor from '../../assets/binhotti-logo-color.png';

function sortFichas(fichas) {
  return [...(fichas || [])].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || Number(b.id || 0) - Number(a.id || 0));
}

function withoutOptionalFichaColumns(payload) {
  const { maquina_motivo: _maquinaMotivo, ...safePayload } = payload;
  return safePayload;
}

function isMissingOptionalColumn(error) {
  return /maquina_motivo|schema cache|column/i.test(error?.message || '');
}

function printFichaList(fichas, data) {
  if (!fichas.length) return;
  const totalMin = fichas.reduce((total, ficha) => total + workMinutes(ficha), 0);
  const operadores = new Set(fichas.map((ficha) => ficha.operador).filter(Boolean)).size;
  const rows = fichas.map((ficha, index) => `
    <tr>
      <td>${ficha.codigo || String(index + 1).padStart(2, '0')}</td>
      <td>${dateBR(ficha.data)}</td>
      <td>${ficha.operador || '-'}</td>
      <td>${machineForFicha(ficha, data)}</td>
      <td>${minutesToText(workMinutes(ficha))}</td>
      <td>Salva</td>
    </tr>
  `).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Fichas Diárias</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14mm;color:#1A1A1A}
    .top{border-top:7px solid #1B3A6B;padding:14px 0 12px;border-bottom:1px solid #D9DEE8;margin-bottom:12px}
    .report-logo{display:block;width:190px;max-width:42%;height:auto}
    .title{font-size:16px;font-weight:900;color:#1B3A6B;margin-top:14px;text-transform:uppercase}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.summary div{border:1px solid #D6DCE7;border-left:4px solid #C0272D;padding:8px;background:#F8FAFD}.summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:14px}
    table{width:100%;border-collapse:collapse}th{background:#1B3A6B;color:#fff;font-size:10px;text-transform:uppercase;padding:7px;border:1px solid #16315C}
    td{font-size:11px;padding:7px;border:1px solid #D6DCE7}tbody tr:nth-child(even){background:#F8FAFD}
    @media print{@page{size:A4 landscape;margin:10mm}body{padding:0}}
  </style></head><body><div class="top"><img class="report-logo" src="${binhottiLogoColor}" alt="BINHOTTI TERRAPLENAGEM"><div class="title">Fichas Diárias</div></div>
  <div class="summary"><div><span>Fichas</span><strong>${fichas.length}</strong></div><div><span>Operadores</span><strong>${operadores}</strong></div><div><span>Horas</span><strong>${minutesToText(totalMin)}</strong></div><div><span>Status</span><strong>Salvas</strong></div></div>
  <table><thead><tr><th>Código</th><th>Data</th><th>Operador</th><th>Máquina</th><th>Horas</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  printHtml(html);
}

export function FichaPage({ data, onReload }) {
  const [modalFicha, setModalFicha] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();
  const fichas = useMemo(() => sortFichas(data?.fichas), [data]);

  function openNew() {
    setModalFicha(null);
    setModalOpen(true);
  }

  function openEdit(ficha) {
    setModalFicha(ficha);
    setModalOpen(true);
  }

  async function saveServices(fichaId, services) {
    await deleteRows('ficha_servicos', `ficha_id=eq.${encodeURIComponent(fichaId)}`);
    const filledServices = services.filter(hasServiceContent);
    for (const service of filledServices) {
      await insertRow('ficha_servicos', servicePayload(service, fichaId, data));
    }
    return filledServices.length;
  }

  async function handleSave(payload, id, services) {
    let ficha = null;
    try {
      try {
        ficha = id ? await updateRow('fichas', id, payload) : await insertRow('fichas', payload);
      } catch (error) {
        if (!isMissingOptionalColumn(error)) throw error;
        const safePayload = withoutOptionalFichaColumns(payload);
        ficha = id ? await updateRow('fichas', id, safePayload) : await insertRow('fichas', safePayload);
      }
      await saveServices(ficha.id || id, services || []);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Ficha atualizada' : 'Ficha criada',
        message: `Código ${payload.codigo || ficha.codigo || '-'}.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar ficha',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(ficha) {
    const label = ficha.codigo || dateBR(ficha.data);
    const confirmed = await confirm({
      title: 'Excluir ficha?',
      message: `A ficha ${label} e os serviços vinculados serão removidos.`,
      details: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir ficha',
    });
    if (!confirmed) return;
    setBusyId(String(ficha.id));
    try {
      await deleteRows('ficha_servicos', `ficha_id=eq.${encodeURIComponent(ficha.id)}`);
      await deleteRow('fichas', ficha.id);
      await onReload();
      notifyToast({
        title: 'Ficha excluída',
        message: `A ficha ${label} foi removida com os serviços vinculados.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir ficha',
        message: error.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setBusyId('');
    }
  }

  return (
    <section>
      <div className="screen-actions">
        <div>
          <h2>Fichas Lançadas</h2>
          <p>{fichas.length} ficha(s) cadastrada(s)</p>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" disabled={!fichas.length} onClick={() => printFichaList(fichas, data)}><FileText size={16} /> Relatório PDF</button>
          <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Nova Ficha</button>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Data</th>
                <th>Operador</th>
                <th>Máquina</th>
                <th>Horas</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fichas.map((ficha, index) => (
                <tr key={ficha.id || `${ficha.data}-${index}`}>
                  <td className="mono muted">{ficha.codigo || String(index + 1).padStart(2, '0')}</td>
                  <td className="mono">{dateBR(ficha.data)}</td>
                  <td><strong>{ficha.operador || '-'}</strong></td>
                  <td className="muted">{machineForFicha(ficha, data)}</td>
                  <td className="mono">{minutesToText(workMinutes(ficha))}</td>
                  <td><span className="status-pill">Salva</span></td>
                  <td className="right">
                    <div className="row-actions">
                      <button className="ghost-button compact" type="button" onClick={() => openEdit(ficha)}><Eye size={14} /> Abrir</button>
                      <button className="danger-button compact" type="button" disabled={busyId === String(ficha.id)} onClick={() => handleDelete(ficha)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!fichas.length ? <tr><td colSpan="7" className="empty-cell">Nenhuma ficha lançada.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <FichaModal
          data={data}
          ficha={modalFicha}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
