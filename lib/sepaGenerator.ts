/**
 * SEPA Direct Debit XML generator — PAIN.008.003.02
 * Genera fichero XML listo para subir al banco (domiciliación SEPA)
 */

export interface SepaEmpresa {
  nombre: string;
  iban: string;
  bic: string;
  creditorId: string; // CI: Identificador acreedor SEPA (AT-02)
}

export interface SepaTxn {
  endToEndId: string;       // referencia única (e.g., referencia factura)
  importe: number;
  mandatoId: string;
  mandatoFecha: string;     // YYYY-MM-DD
  secuencia: 'FRST' | 'RCUR' | 'FNAL' | 'OOFF';
  deudorNombre: string;
  deudorIban: string;
  deudorBic: string;
  concepto: string;         // RmtInf
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function msgId(): string {
  return 'MSG' + Date.now().toString(36).toUpperCase();
}

/**
 * Genera XML PAIN.008.003.02 para un conjunto de transacciones SEPA
 * @param empresa      Datos del acreedor (empresa emisora)
 * @param txns         Lista de cargos a domiciliar
 * @param fechaCobro   Fecha de cobro deseada (YYYY-MM-DD)
 */
export function generarSepaPain008(
  empresa: SepaEmpresa,
  txns: SepaTxn[],
  fechaCobro: string,
): string {
  if (txns.length === 0) throw new Error('No hay transacciones para generar SEPA');

  const id       = msgId();
  const ahora    = new Date().toISOString().slice(0, 19);
  const total    = txns.reduce((s, t) => s + t.importe, 0).toFixed(2);
  const nbOfTxs  = txns.length;

  // Agrupar por secuencia para bloques PmtInf separados
  const grupos: Record<string, SepaTxn[]> = {};
  for (const t of txns) {
    if (!grupos[t.secuencia]) grupos[t.secuencia] = [];
    grupos[t.secuencia].push(t);
  }

  let pmtInfBlocks = '';
  let pmtIdx = 1;

  for (const [seqTp, block] of Object.entries(grupos)) {
    const pmtId      = `${id}-${pmtIdx++}`;
    const pmtTotal   = block.reduce((s, t) => s + t.importe, 0).toFixed(2);
    const pmtNbOfTxs = block.length;

    const txnLines = block.map(t => `
      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${esc(t.endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${t.importe.toFixed(2)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${esc(t.mandatoId)}</MndtId>
            <DtOfSgntr>${t.mandatoFecha}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <BIC>${esc(t.deudorBic)}</BIC>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${esc(t.deudorNombre)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${t.deudorIban.replace(/\s/g, '')}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${esc(t.concepto)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`).join('');

    pmtInfBlocks += `
    <PmtInf>
      <PmtInfId>${pmtId}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${pmtNbOfTxs}</NbOfTxs>
      <CtrlSum>${pmtTotal}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>${seqTp}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${fechaCobro}</ReqdColltnDt>
      <Cdtr>
        <Nm>${esc(empresa.nombre)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${empresa.iban.replace(/\s/g, '')}</IBAN></Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId><BIC>${esc(empresa.bic)}</BIC></FinInstnId>
      </CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${esc(empresa.creditorId)}</Id>
              <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>${txnLines}
    </PmtInf>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.003.02"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.008.003.02 pain.008.003.02.xsd">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${id}</MsgId>
      <CreDtTm>${ahora}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${total}</CtrlSum>
      <InitgPty>
        <Nm>${esc(empresa.nombre)}</Nm>
      </InitgPty>
    </GrpHdr>${pmtInfBlocks}
  </CstmrDrctDbtInitn>
</Document>`;
}

/** Descarga el XML como fichero .xml en el navegador */
export function descargarXml(xmlContent: string, filename: string): void {
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
