/**
 * Bloque de datos de empresa o cliente en la vista/PDF de cotización.
 * Mismo estilo que RNC: etiqueta + valor en líneas separadas.
 */
export default function QuotePartyInfo({ nombre, rnc, direccion, telefono, email }) {
  return (
    <div className="quote-party-info">
      {nombre && <p className="quote-party-name">{nombre}</p>}
      {rnc && (
        <p className="quote-party-line">
          <span className="quote-party-label">RNC:</span> {rnc}
        </p>
      )}
      {direccion && (
        <p className="quote-party-line">
          <span className="quote-party-label">Dirección:</span> {direccion}
        </p>
      )}
      {telefono && (
        <p className="quote-party-line">
          <span className="quote-party-label">Tel.:</span> {telefono}
        </p>
      )}
      {email && (
        <p className="quote-party-line">
          <span className="quote-party-label">Email:</span> {email}
        </p>
      )}
    </div>
  );
}
