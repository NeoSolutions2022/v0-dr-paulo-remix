export type PatientDocument = {
  id: string
  patient_id: string
  file_name: string
  created_at: string
  clean_text: string | null
  html?: string | null
  html_generated_at?: string | null
  pdf_url?: string | null
}

export type Patient = {
  id: string
  full_name: string
  email: string | null
  birth_date: string | null
  created_at?: string
  updated_at?: string
  documents?: PatientDocument[]
}

export type UploadResult = {
  cleanText: string
  credentials?: {
    loginName?: string
    password?: string
    existing?: boolean
  }
  message?: string
  patient?: Patient
  document?: PatientDocument
}
