import {
  computeRiskLevel,
  createServer,
  healthResponse,
  matchId,
  sendJson,
  type AnalyticsSummary,
  type RiskLevel,
  getMongoDb
} from '@icu/shared';

const serviceName = 'analytics-service';
const port = Number(process.env.PORT ?? 4007);

let vitalsColl: any = null;
let predictionsColl: any = null;
let alertsColl: any = null;

async function analyticsSummary(): Promise<AnalyticsSummary> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60).toISOString();

  const alertAgg = await alertsColl.aggregate([
    { $match: { createdAt: { $gte: oneHourAgo } } },
    { $group: { _id: '$severity', count: { $sum: 1 } } }
  ]).toArray().catch(() => []);
  const distribution = { low: 0, medium: 0, critical: 0 } as Record<RiskLevel, number>;
  for (const a of alertAgg) {
    if (a._id === 'critical') distribution.critical = a.count;
    else if (a._id === 'warning') distribution.medium = a.count;
    else distribution.low += a.count;
  }

  const avgAgg = await vitalsColl.aggregate([
    { $match: { timestamp: { $gte: oneHourAgo } } },
    { $group: { _id: null, heartRate: { $avg: '$heartRate' }, spo2: { $avg: '$spo2' }, systolic: { $avg: '$systolic' }, diastolic: { $avg: '$diastolic' }, temperature: { $avg: '$temperature' } } }
  ]).toArray().catch(() => []);

  const avg = avgAgg[0] ?? { heartRate: 0, spo2: 0, systolic: 0, diastolic: 0, temperature: 0 };

  return {
    generatedAt: new Date().toISOString(),
    riskDistribution: distribution,
    averageVitals: {
      heartRate: Math.round(avg.heartRate ?? 0),
      spo2: Math.round(avg.spo2 ?? 0),
      systolic: Math.round(avg.systolic ?? 0),
      diastolic: Math.round(avg.diastolic ?? 0),
      temperature: Number((avg.temperature ?? 0).toFixed(1))
    },
    alertBurndown: Array.from({ length: 12 }, (_, index) => ({ hour: `${String(index).padStart(2, '0')}:00`, warning: 0, critical: 0 })),
    bedUtilization: []
  };
}

function escapePdfText(text: string) {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function minimalPdf(lines: string[]): Buffer {
  const body = lines.map((line, index) => `BT /F1 12 Tf 54 ${760 - index * 22} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(body)} >> stream\n${body}\nendstream endobj`
  ];
  const header = '%PDF-1.4\n';
  let offset = header.length;
  const xref = ['0000000000 65535 f '];
  const content = objects
    .map((object) => {
      xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
      offset += Buffer.byteLength(`${object}\n`);
      return object;
    })
    .join('\n');
  const startxref = Buffer.byteLength(`${header}${content}\n`);
  return Buffer.from(`${header}${content}\nxref\n0 ${xref.length}\n${xref.join('\n')}\ntrailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`);
}

const server = createServer([
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: ({ res }) => sendJson(res, 200, healthResponse(serviceName))
  },
  {
    method: 'GET',
    pattern: /^\/analytics\/summary$|^\/summary$/,
    handler: async ({ res }) => sendJson(res, 200, await analyticsSummary())
  },
  {
    method: 'GET',
    pattern: /^\/analytics\/patients\/[^/]+$/,
    handler: ({ res, pathname }) => {
      const patientId = matchId(pathname);
      if (!patientId) {
        sendJson(res, 404, { error: 'patient_report_not_found' });
        return;
      }

      sendJson(res, 200, {
        patientId,
        trend: [],
        modelObservations: { level: 'low', score: 0, reasons: [] }
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/analytics\/reports\/[^/]+\.pdf$/,
    handler: ({ res, pathname }) => {
      const patientId = pathname.split('/').at(-1)?.replace('.pdf', '');
      if (!patientId) {
        sendJson(res, 404, { error: 'patient_report_not_found' });
        return;
      }
      const pdf = minimalPdf([
        'AI ICU Monitoring Report',
        `Patient ID: ${patientId}`,
        'No patient data available',
        `Generated: ${new Date().toISOString()}`
      ]);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', `attachment; filename="${patient.mrn}-icu-report.pdf"`);
      res.end(pdf);
    }
  }
]);

server.listen(port, () => {
  console.log(`${serviceName} listening on :${port}`);
});

async function initAndListen() {
  try {
    const db = await getMongoDb();
    vitalsColl = db.collection('vitals');
    predictionsColl = db.collection('predictions');
    alertsColl = db.collection('alerts');
    await vitalsColl.createIndex({ patientId: 1, timestamp: -1 }).catch(() => {});
    await alertsColl.createIndex({ createdAt: -1 }).catch(() => {});

    server.listen(port, () => {
      console.log(`${serviceName} listening on :${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database connection', err);
    process.exit(1);
  }
}

void initAndListen();
