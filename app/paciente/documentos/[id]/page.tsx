import { DocumentoClient } from "./documento-client"

export function generateStaticParams() {
  return []
}

export default function DocumentoPage({ params }: { params: { id: string } }) {
  return <DocumentoClient id={params.id} />
}
