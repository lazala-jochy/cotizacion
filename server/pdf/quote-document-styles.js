/** Estilos del documento de cotización (misma apariencia que la vista / impresión). */
module.exports = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #1a1a1a;
    background: #fff;
  }
  .quote-document {
    padding: 2rem 2.25rem;
    max-width: 900px;
    margin: 0 auto;
  }
  .quote-doc-header {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    border-bottom: 2px solid #1e40af;
    padding-bottom: 1.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .quote-emisor-info {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    min-width: 0;
    flex: 1 1 280px;
  }
  .quote-emisor-info--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
  }
  .quote-emisor-info--stacked .quote-emisor-logo {
    display: block;
    margin-bottom: 0.15rem;
  }
  .quote-emisor-logo {
    max-height: 72px;
    max-width: 160px;
    object-fit: contain;
  }
  .quote-party-name {
    font-weight: 700;
    font-size: 1.35rem;
    color: #1e40af;
    margin: 0 0 0.35rem;
    line-height: 1.35;
  }
  .quote-party-line {
    margin: 0.2rem 0;
    font-size: 0.9rem;
    line-height: 1.45;
  }
  .quote-party-label {
    font-weight: 600;
    color: #334155;
  }
  .quote-doc-meta {
    min-width: 0;
    flex: 1 1 200px;
  }
  .quote-doc-meta h2 {
    font-size: 1.25rem;
    text-align: right;
    color: #334155;
    margin: 0 0 0.5rem;
  }
  .quote-doc-meta p {
    text-align: right;
    font-size: 0.9rem;
    color: #334155;
    margin: 0.2rem 0;
  }
  .quote-client-block {
    margin-bottom: 1.5rem;
  }
  .quote-client-block h3 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin: 0 0 0.35rem;
  }
  .quote-items-doc {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;
  }
  .quote-items-doc th,
  .quote-items-doc td {
    border: 1px solid #e2e8f0;
    padding: 0.6rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }
  .quote-items-doc th {
    background: #f1f5f9;
    font-size: 0.8rem;
  }
  .quote-items-doc td.num,
  .quote-items-doc th.num {
    text-align: right;
    white-space: nowrap;
  }
  .quote-doc-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .quote-doc-terms {
    flex: 1 1 280px;
    font-size: 0.9rem;
    color: #1a1a1a;
  }
  .quote-doc-terms p {
    margin: 0.35rem 0;
    line-height: 1.45;
  }
  .quote-doc-terms-label {
    font-weight: 600;
    color: #334155;
  }
  .quote-doc-bottom .quote-doc-totals {
    flex: 0 0 280px;
    margin-left: 0;
    width: 280px;
  }
  .quote-doc-totals {
    margin-left: auto;
    width: 280px;
  }
  .quote-doc-totals .row {
    display: flex;
    justify-content: space-between;
    padding: 0.35rem 0;
    gap: 1rem;
  }
  .quote-doc-totals .grand-total {
    border-top: 2px solid #1e40af;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    font-size: 1.15rem;
    font-weight: 700;
  }
  .quote-doc-totals .balance strong {
    font-weight: 700;
  }
  .quote-payments-doc {
    margin-top: 1.5rem;
  }
  .quote-payments-doc h3 {
    font-size: 0.85rem;
    margin: 0 0 0.5rem;
  }
  .quote-notes {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }
  .quote-notes h3 {
    font-size: 0.85rem;
    margin: 0 0 0.35rem;
  }
  .quote-doc-footer {
    margin-top: 2rem;
    text-align: center;
    font-size: 0.85rem;
    color: #64748b;
  }
`;
