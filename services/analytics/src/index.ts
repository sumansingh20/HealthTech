import {
  computeRiskLevel,
  createServer,
  demoAlerts,
  demoPatients,
  demoVitals,
  healthResponse,
  makeTrend,
  matchId,
  sendJson,
  type AnalyticsSummary,
  type RiskLevel
} from '@icu/shared';

const serviceName = 'analytics-service';
const port = Number(process.env.PORT ?? 4007);

function analyticsSummary(): AnalyticsSummary {
  const distribution: Record<RiskLevel, number> = { low: 0, medium: 0, critical: 0 };
  const totals = { heartRate: 0, spo2: 0, systolic: 0, diastolic: 0, temperature: 0 };

  for (const reading of demoVitals) {
    distribution[computeRiskLevel(reading).level] += 1;
    totals.heartRate += reading.heartRate;
    totals.spo2 += reading.spo2;
    totals.systolic += reading.systolic;
    totals.diastolic += reading.diastolic;
    totals.temperature += reading.temperature;
  }

  const divisor = Math.max(demoVitals.length, 1);
  return {
    generatedAt: new Date().toISOString(),
    riskDistribution: distribution,
    averageVitals: {
      heartRate: Math.round(totals.heartRate / divisor),
      spo2: Number((totals.spo2 / divisor).toFixed(1)),
      systolic: Math.round(totals.systolic / divisor),
      diastolic: Math.round(totals.diastolic / divisor),
      temperature: Number((totals.temperature / divisor).toFixed(1))
    },
    alertBurndown: Array.from({ length: 12 }, (_, index) => ({
      hour: `${String(index).padStart(2, '0')}:00`,
      warning: demoAlerts.filter((alert) => alert.severity === 'warning').length + (index % 3),
      critical: demoAlerts.filter((alert) => alert.severity === 'critical').length + (index % 2)
    })),
    bedUtilization: demoPatients.map((patient) => {
      const reading = demoVitals.find((item) => item.patientId === patient.id);
      return {
        bedId: patient.bedId,
        riskScore: reading ? computeRiskLevel(reading).score : 0,
        status: patient.status
      };
    })
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
    handler: ({ res }) => sendJson(res, 200, analyticsSummary())
  },
  {
    method: 'GET',
    pattern: /^\/analytics\/patients\/[^/]+$/,
    handler: ({ res, pathname }) => {
      const patientId = matchId(pathname);
      const patient = demoPatients.find((item) => item.id === patientId);
      const reading = demoVitals.find((item) => item.patientId === patientId);

      if (!patient || !reading) {
        sendJson(res, 404, { error: 'patient_report_not_found' });
        return;
      }

      sendJson(res, 200, {
        patient,
        trend: makeTrend(reading, 48),
        modelObservations: computeRiskLevel(reading)
      });
    }
  },
  {
    method: 'GET',
    pattern: /^\/analytics\/reports\/[^/]+\.pdf$/,
    handler: ({ res, pathname }) => {
      const patientId = pathname.split('/').at(-1)?.replace('.pdf', '');
      const patient = demoPatients.find((item) => item.id === patientId);
      const reading = demoVitals.find((item) => item.patientId === patientId);
      if (!patient || !reading) {
        sendJson(res, 404, { error: 'patient_report_not_found' });
        return;
      }
      const risk = computeRiskLevel(reading);
      const pdf = minimalPdf([
        'AI ICU Monitoring Report',
        `Patient: ${patient.name} (${patient.mrn})`,
        `Bed: ${patient.bedId}`,
        `Risk Level: ${risk.level.toUpperCase()} (${risk.score}/100)`,
        `Heart Rate: ${reading.heartRate} bpm`,
        `SpO2: ${reading.spo2}%`,
        `Blood Pressure: ${reading.systolic}/${reading.diastolic} mmHg`,
        `Temperature: ${reading.temperature} C`,
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
