import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { clusterSummary } = await request.json()

    // Get custom AI API configuration from environment
    const AI_API_URL = process.env.CUSTOM_AI_API_URL
    const AI_API_KEY = process.env.CUSTOM_AI_API_KEY
    const AI_MODEL = process.env.CUSTOM_AI_MODEL || "default"

    if (!AI_API_URL || !AI_API_KEY) {
      throw new Error("Custom AI API configuration not found")
    }

    const prompt = `Anda adalah seorang analis data SDM strategis untuk institusi kepolisian dengan keahlian khusus dalam interpretasi pola perilaku dan psikologi organisasi. Berdasarkan analisis klastering K-Means data kehadiran personel berikut:

${JSON.stringify(clusterSummary, null, 2)}

Buatlah laporan analisis mendalam dan rekomendasi strategis dalam format HTML yang terstruktur dan profesional. Laporan harus mencakup:

1. **<h3>🎯 Ringkasan Eksekutif</h3>**: 
   - Paragraf yang menyoroti temuan paling krusial dari analisis klaster
   - Identifikasi risiko utama dan peluang perbaikan
   - Proyeksi dampak jika tidak ada intervensi

2. **<h3>📊 Detail Analisis per Klaster</h3>**: 
   Untuk setiap klaster, berikan analisis mendalam:
   - Gunakan nama klaster sebagai <h4> dengan emoji yang sesuai
   - **Profil Perilaku**: Jelaskan karakteristik unik klaster
   - **Analisis Psikologis**: Interpretasi motivasi dan faktor pendorong perilaku
   - **Implikasi Operasional**: Dampak terhadap produktivitas dan budaya kerja

3. **<h3>⚠️ Wawasan Lintas-Fungsional & Analisis Risiko</h3>**: 
   - Korelasi antara Unit kerja dengan pola kedisiplinan
   - Identifikasi unit yang berisiko tinggi
   - Analisis tren dan prediksi perkembangan

4. **<h3>🚀 Rekomendasi Strategis Berbasis Data</h3>**: 
   Berikan 3-4 rekomendasi konkret dengan prioritas:
   - **PRIORITAS TINGGI** (🔴): Tindakan segera yang diperlukan
   - **PRIORITAS SEDANG** (🟡): Perbaikan jangka menengah  
   - **PRIORITAS RENDAH** (🟢): Optimisasi jangka panjang

5. **<h3>📈 Metrik Keberhasilan & KPI</h3>**:
   - Indikator yang harus dipantau
   - Target pencapaian yang realistis
   - Timeline evaluasi yang disarankan

Gunakan bahasa yang profesional namun mudah dipahami, dengan insight yang actionable dan berbasis data.`

    // Make request to custom AI API
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
        // Add other headers as needed
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`)
    }

    const result = await response.json()

    // Extract text from response (adjust based on your API response format)
    let analysisText = ""
    if (result.choices && result.choices[0] && result.choices[0].message) {
      analysisText = result.choices[0].message.content
    } else if (result.response) {
      analysisText = result.response
    } else if (result.text) {
      analysisText = result.text
    } else {
      analysisText = JSON.stringify(result)
    }

    return NextResponse.json({ analysis: analysisText })
  } catch (error) {
    console.error("Error generating AI analysis:", error)
    return NextResponse.json(
      {
        error: "Failed to generate analysis. Please check your AI API configuration.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
