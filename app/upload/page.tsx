import { AppHeader } from '@/components/layout/app-header'
import { JsonPasteForm } from '@/components/upload/json-paste-form'

export default function UploadPage() {
  return (
    <div className="flex flex-col">
      <AppHeader
        title="Import Pipeline Run"
        description="Paste JSON output from a pipeline run to import insights and measures."
      />
      <div className="p-6">
        <div className="max-w-5xl">
          <JsonPasteForm />
        </div>
      </div>
    </div>
  )
}
