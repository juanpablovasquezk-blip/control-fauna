'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Building2, Calendar, FileCheck2, Loader2, CheckCircle2, History, Filter } from 'lucide-react'
import { getDgacReportDataAction, saveGeneratedReportAction, getPastReportsAction } from './actions'
import { generateDgacAnimalReport } from '@/lib/utils/reportPdfDgac'

export default function ReportsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  
  // Modos de fecha: 'month' | 'range'
  const [dateMode, setDateMode] = useState<'month' | 'range'>('month')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  
  const todayStr = new Date().toISOString().split('T')[0]
  const firstDayOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  
  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr)
  const [endDate, setEndDate] = useState<string>(todayStr)

  const [generating, setGenerating] = useState(false)
  const [progressMsg, setProgressMsg] = useState<string>('')
  const [pastReports, setPastReports] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchPastReports(selectedClient)
    }
  }, [selectedClient])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').eq('active', true).order('name')
    if (data && data.length > 0) {
      setClients(data)
      // Seleccionar cliente DGAC por defecto si existe
      const dgac = data.find(c => c.is_contract_client || c.name.toUpperCase().includes('DGAC'))
      setSelectedClient(dgac ? dgac.id : data[0].id)
    }
  }

  async function fetchPastReports(clientId: string) {
    setLoadingHistory(true)
    const res = await getPastReportsAction(clientId)
    if (res.success) {
      setPastReports(res.reports || [])
    }
    setLoadingHistory(false)
  }

  const currentClientObj = clients.find(c => c.id === selectedClient)
  const isDgac = currentClientObj?.is_contract_client

  const handleGenerateAnimalReport = async () => {
    if (!selectedClient) return
    setGenerating(true)
    setProgressMsg('Obteniendo datos consolidados...')

    try {
      // 1. Obtener datos
      const dataRes = await getDgacReportDataAction({
        clientId: selectedClient,
        dateMode,
        month: selectedMonth,
        year: selectedYear,
        startDate,
        endDate
      })

      if (!dataRes.success || !dataRes.data) {
        alert(`Error al obtener datos: ${dataRes.error || 'Sin información disponible.'}`)
        setGenerating(false)
        return
      }

      const reportData = dataRes.data

      // 2. Generar PDF
      const { pdfDataUrl, blob } = await generateDgacAnimalReport(reportData, (msg) => {
        setProgressMsg(msg)
      })

      // 3. Descargar automáticamente en cliente
      const fileName = `Informe_DGAC_Captura_Animales_${reportData.startDateStr}_${reportData.endDateStr}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // 4. Guardar en Storage e Historial de DB
      setProgressMsg('Guardando copia en expedientes...')
      await saveGeneratedReportAction({
        clientId: selectedClient,
        year: selectedYear,
        month: selectedMonth,
        pdfDataUrl,
        summaryData: {
          period: reportData.periodLabel,
          totalRounds: reportData.totalRounds,
          totalFenceDamages: reportData.totalFenceDamages,
          totalActivations: reportData.totalActivations,
          totalCapturedAnimals: reportData.totalCapturedAnimals
        }
      })

      // Refrescar historial
      fetchPastReports(selectedClient)

      setProgressMsg('¡Reporte generado con éxito!')
      setTimeout(() => setGenerating(false), 1200)

    } catch (err: any) {
      console.error('Error generando reporte:', err)
      alert(`Error al generar el reporte: ${err.message || 'Error inesperado.'}`)
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <FileText className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Emisión de Reportes Mensuales Ejecutivos</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Generación consolidada en PDF conforme a la Sección 19 del Manual v2.0 (Grupo Minerquim).
            </p>
          </div>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange-600" />
            <span>Parámetros del Informe</span>
          </h3>

          {/* Toggle Modo Fecha */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateMode('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateMode === 'month' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por Mes / Año
            </button>
            <button
              onClick={() => setDateMode('range')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateMode === 'range' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rango Personalizado
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Selector Cliente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cliente Solicitante</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_contract_client ? '(DGAC - Contrato)' : ''}
                </option>
              ))}
            </select>
          </div>

          {dateMode === 'month' ? (
            <>
              {/* Mes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mes</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
              </div>

              {/* Año */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Fecha Desde */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Fecha Hasta */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Dynamic Badge Notice */}
        <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
          isDgac ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-orange-50 border-orange-200 text-orange-900'
        }`}>
          {isDgac ? (
            <p>
              <strong>Formato Especial DGAC:</strong> Este informe genera un PDF de múltiples páginas estructurado en 
              <strong> Parte I (Captura de Canes, Gatos y Murciélagos)</strong> con resumen ejecutivo, fichas individuales con foto, actas de entrega, chips y análisis de KPIs por zonas.
            </p>
          ) : (
            <p>
              <strong>Formato Cliente Regular:</strong> Este informe incluye el resumen de capturas, actas emitidas y la <strong>tabla de facturación por animal capturado</strong> según la tarifa contratada.
            </p>
          )}
        </div>

        {/* Botones de Generación */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleGenerateAnimalReport}
            disabled={generating}
            className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressMsg || 'Generando Informe...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Generar Informe Parte I (Captura de Animales) PDF</span>
              </>
            )}
          </button>

          <button
            disabled
            className="px-5 py-3 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl border border-gray-200 cursor-not-allowed flex items-center gap-2"
            title="Módulo de Caza en desarrollo"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Generar Informe Parte II (Caza - Conejos/Palomas) [Próximamente]</span>
          </button>
        </div>
      </div>

      {/* Historial de Expedientes Generados */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-orange-600" />
            <span>Historial de Reportes Generados en Expedientes</span>
          </h3>
          <span className="text-xs text-gray-500 font-semibold">{pastReports.length} reportes archivados</span>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            <span>Cargando historial de expedientes...</span>
          </div>
        ) : pastReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No hay reportes archivados previamente para este cliente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                  <th className="p-3">Tipo de Reporte</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Fecha de Emisión</th>
                  <th className="p-3">Datos Resumen</th>
                  <th className="p-3 text-right">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-3 font-bold text-gray-900">{rep.report_type}</td>
                    <td className="p-3 font-semibold text-orange-600">
                      {rep.summary_data?.period || `${rep.month}/${rep.year}`}
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(rep.generated_at).toLocaleString('es-CL')}
                    </td>
                    <td className="p-3 text-gray-500">
                      {rep.summary_data ? (
                        <span>
                          Rondas: <strong>{rep.summary_data.totalRounds || 0}</strong> | 
                          Activaciones: <strong>{rep.summary_data.totalActivations || 0}</strong> | 
                          Capturas: <strong>{rep.summary_data.totalCapturedAnimals || 0}</strong>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <a
                        href={rep.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-700 font-bold rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
