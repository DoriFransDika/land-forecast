import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  stageNumber?: string
  description?: string
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = 'Modul ini siap dikembangkan pada Bagian 2.',
}) => {
  return (
    <MainLayout title={title}>
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-[#009688]" />
        </div>
        <h3 className="text-lg font-bold text-[#152238]">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          {description} Bagian pertama telah menyelesaikan modul Overview, Input Data, Preprocessing, Feature Embedding, dan Klasifikasi RF.
        </p>
        <span className="inline-block bg-[#dcf4e8] text-[#18794e] text-xs font-semibold px-3 py-1 rounded-full">
          Siap Masuk Pengembangan Bagian 2
        </span>
      </div>
    </MainLayout>
  )
}

