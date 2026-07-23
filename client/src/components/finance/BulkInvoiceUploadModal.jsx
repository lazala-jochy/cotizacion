import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import AppModal from '../AppModal';
import { IconUpload } from '../report_generator/icons';
import { IconTrash } from '../Icons';

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 2 * 1024 * 1024;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(defaultCategoryId) {
  return {
    rnc: '',
    ncf: '',
    description: '',
    category_id: defaultCategoryId ? String(defaultCategoryId) : '',
    expense_date: todayIso(),
    amount: '',
    itbis: '',
    payment_method: 'Efectivo',
  };
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function validateRow(form) {
  if (!form.description?.trim()) return 'Falta la descripción.';
  if (!form.category_id) return 'Falta la categoría.';
  if (!form.expense_date) return 'Falta la fecha.';
  const amount = Number(form.amount);
  if (!amount || amount <= 0) return 'El monto debe ser mayor que cero.';
  return '';
}

/**
 * Modal para adjuntar una o varias facturas de crédito fiscal, extraer sus
 * datos con OCR, revisarlos/editarlos y guardarlos como gastos (Compras)
 * listos para el 606.
 */
export default function BulkInvoiceUploadModal({ open, onClose, onSaved, defaultCategoryId }) {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const inputRef = useRef(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!open) return;
    api.expenses.categories().then(setCategories).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setSaving(false);
      setSavedCount(0);
    }
  }, [open]);

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    for (const file of files) {
      const id = nextId.current++;

      if (!ALLOWED_MIMES.includes(file.type)) {
        setRows((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            previewUrl: '',
            status: 'invalid',
            error: 'Solo se aceptan imágenes JPG o PNG.',
            form: emptyForm(defaultCategoryId),
          },
        ]);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setRows((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            previewUrl: '',
            status: 'invalid',
            error: 'Archivo demasiado grande (máx. 2 MB).',
            form: emptyForm(defaultCategoryId),
          },
        ]);
        continue;
      }

      let dataUrl;
      try {
        dataUrl = await readAsDataUrl(file);
      } catch (err) {
        setRows((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            previewUrl: '',
            status: 'invalid',
            error: err.message,
            form: emptyForm(defaultCategoryId),
          },
        ]);
        continue;
      }

      setRows((prev) => [
        ...prev,
        {
          id,
          fileName: file.name,
          previewUrl: dataUrl,
          mime: file.type,
          status: 'ocr',
          error: '',
          form: emptyForm(defaultCategoryId),
        },
      ]);

      // Procesar el OCR de una imagen a la vez (evita saturar el servidor).
      try {
        const result = await api.ocr.extractInvoice(dataUrl);
        if (result.success && result.data) {
          const d = result.data;
          const base = d.monto_base != null ? Number(d.monto_base) : null;
          const itbis = d.itbis != null ? Number(d.itbis) : base != null ? Math.round(base * 0.18 * 100) / 100 : null;
          const total = base != null && itbis != null ? Math.round((base + itbis) * 100) / 100 : '';
          updateRow(id, {
            status: 'ready',
            form: {
              ...emptyForm(defaultCategoryId),
              rnc: d.rnc || '',
              ncf: d.ncf || '',
              description: d.descripcion || file.name.replace(/\.[^.]+$/, ''),
              expense_date: d.fecha_comprobante || todayIso(),
              amount: total !== '' ? String(total) : '',
              itbis: itbis != null ? String(itbis) : '',
            },
          });
        } else {
          updateRow(id, {
            status: 'ready',
            error: result.error || 'No se pudieron leer los datos de la factura. Complete los campos a mano.',
            form: { ...emptyForm(defaultCategoryId), description: file.name.replace(/\.[^.]+$/, '') },
          });
        }
      } catch (err) {
        updateRow(id, {
          status: 'ready',
          error: err.message || 'Error procesando OCR. Complete los campos a mano.',
          form: { ...emptyForm(defaultCategoryId), description: file.name.replace(/\.[^.]+$/, '') },
        });
      }
    }
  };

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const setRowForm = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, form: { ...r.form, [field]: value } } : r))
    );
  };

  const savableRows = rows.filter((r) => r.status === 'ready' || r.status === 'failed');
  const stillProcessing = rows.some((r) => r.status === 'ocr');

  const handleSaveAll = async () => {
    setSaving(true);
    for (const row of savableRows) {
      const validationError = validateRow(row.form);
      if (validationError) {
        updateRow(row.id, { status: 'failed', error: validationError });
        continue;
      }
      updateRow(row.id, { status: 'saving', error: '' });
      try {
        const body = {
          ...row.form,
          category_id: Number(row.form.category_id),
          amount: Number(row.form.amount),
          itbis: row.form.itbis !== '' ? Number(row.form.itbis) : null,
          rnc: row.form.rnc.trim() || null,
          ncf: row.form.ncf.trim() || null,
          attachment_name: row.fileName,
          attachment_mime: row.mime,
          attachment_data: row.previewUrl,
        };
        await api.expenses.create(body);
        updateRow(row.id, { status: 'saved', error: '' });
        setSavedCount((c) => c + 1);
        onSaved?.();
      } catch (err) {
        updateRow(row.id, { status: 'failed', error: err.message });
      }
    }
    setSaving(false);
  };

  const pendingToSave = rows.filter((r) => r.status === 'ready' || r.status === 'failed').length;
  const allDone = rows.length > 0 && rows.every((r) => r.status === 'saved' || r.status === 'invalid');

  return (
    <AppModal
      open={open}
      onClose={() => !saving && onClose()}
      title="Adjuntar facturas de crédito fiscal"
      subtitle="Suba una o varias imágenes de factura. El sistema extrae RNC, NCF, fecha y montos con OCR; revise y guarde como gastos de Compras para el 606."
      size="lg"
      busy={saving}
      busyMessage="Guardando facturas…"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            {allDone ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveAll}
            disabled={saving || pendingToSave === 0 || stillProcessing}
          >
            Guardar {pendingToSave > 0 ? `todo (${pendingToSave})` : ''}
          </button>
        </div>
      }
    >
      {savedCount > 0 && (
        <div className="alert alert-success">
          ✓ {savedCount} factura(s) guardada(s) como gasto de Compras.
        </div>
      )}

      <section
        className={`report-studio-upload${dragOver ? ' is-dragover' : ''}`}
        style={{ marginBottom: '1rem' }}
      >
        <div
          className="report-studio-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Seleccionar imágenes de facturas"
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg"
            onChange={handleInputChange}
          />
          <div className="report-studio-dropzone-icon">
            <IconUpload />
          </div>
          <p className="report-studio-dropzone-title">Arrastre una o varias facturas aquí</p>
          <p className="report-studio-dropzone-sub">o haga clic para seleccionar · JPG, PNG · máx. 2 MB c/u</p>
        </div>
      </section>

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>RNC</th>
                <th>NCF</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th className="num">Monto total</th>
                <th className="num">ITBIS</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const disabled = row.status === 'saving' || row.status === 'saved' || row.status === 'invalid';
                return (
                  <tr key={row.id}>
                    <td title={row.fileName}>{row.fileName}</td>
                    <td>
                      <input
                        value={row.form.rnc}
                        onChange={(e) => setRowForm(row.id, 'rnc', e.target.value)}
                        disabled={disabled}
                        style={{ width: '8rem' }}
                      />
                    </td>
                    <td>
                      <input
                        value={row.form.ncf}
                        onChange={(e) => setRowForm(row.id, 'ncf', e.target.value.toUpperCase())}
                        disabled={disabled}
                        style={{ width: '8rem' }}
                      />
                    </td>
                    <td>
                      <input
                        value={row.form.description}
                        onChange={(e) => setRowForm(row.id, 'description', e.target.value)}
                        disabled={disabled}
                        style={{ width: '10rem' }}
                      />
                    </td>
                    <td>
                      <select
                        value={row.form.category_id}
                        onChange={(e) => setRowForm(row.id, 'category_id', e.target.value)}
                        disabled={disabled}
                      >
                        <option value="">Seleccionar…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={row.form.expense_date}
                        onChange={(e) => setRowForm(row.id, 'expense_date', e.target.value)}
                        disabled={disabled}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.form.amount}
                        onChange={(e) => setRowForm(row.id, 'amount', e.target.value)}
                        disabled={disabled}
                        style={{ width: '6rem' }}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.form.itbis}
                        onChange={(e) => setRowForm(row.id, 'itbis', e.target.value)}
                        disabled={disabled}
                        style={{ width: '5.5rem' }}
                      />
                    </td>
                    <td>
                      {row.status === 'ocr' && <span className="muted">⏳ Leyendo…</span>}
                      {row.status === 'ready' && !row.error && <span>Lista para revisar</span>}
                      {row.status === 'ready' && row.error && (
                        <span style={{ color: 'var(--color-danger)' }} title={row.error}>
                          ⚠ Revisar
                        </span>
                      )}
                      {row.status === 'saving' && <span className="muted">Guardando…</span>}
                      {row.status === 'saved' && <span style={{ color: 'var(--color-success)' }}>✓ Guardada</span>}
                      {row.status === 'failed' && (
                        <span style={{ color: 'var(--color-danger)' }} title={row.error}>
                          ✗ {row.error}
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span style={{ color: 'var(--color-danger)' }}>{row.error}</span>
                      )}
                    </td>
                    <td>
                      {!disabled && (
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => removeRow(row.id)}
                          title="Quitar"
                          aria-label="Quitar"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <p className="muted">Seleccione una o varias imágenes de factura para comenzar.</p>
      )}
    </AppModal>
  );
}
