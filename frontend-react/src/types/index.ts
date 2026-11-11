export interface LandClassification {
  id: string
  name: string
  category: 'Hutan' | 'Pertanian' | 'Pemukiman' | 'Perairan' | 'Lahan Terbuka'
  areaHectares: number
  percentage: number
  color: string
}

export interface PredictionMetric {
  year: number
  predictedArea: number
  trend: 'up' | 'down' | 'stable'
}

